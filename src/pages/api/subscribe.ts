import type { APIRoute } from "astro";

export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TURNSTILE_ACTION = "newsletter_signup";

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;

  let body: { email?: unknown; company?: unknown; turnstileToken?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  // Honeypot: real users never fill this hidden field.
  if (typeof body.company === "string" && body.company.trim() !== "") {
    return json({ ok: true });
  }

  if (!EMAIL_RE.test(email)) {
    return json({ error: "Enter a valid email address." }, 400);
  }

  const token =
    typeof body.turnstileToken === "string" ? body.turnstileToken : "";
  const clientIp = request.headers.get("CF-Connecting-IP");
  if (!(await verifyTurnstile(token, clientIp, env))) {
    return json({ error: "Verification failed. Please try again." }, 403);
  }

  // Authenticated API (not the public endpoint), so subscribing requires our
  // credentials and the public endpoint can be switched off in listmonk.
  let subscribeRes: Response;
  try {
    subscribeRes = await fetch(`${env.LISTMONK_URL}/api/subscribers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Basic " +
          btoa(`${env.LISTMONK_TX_API_USER}:${env.LISTMONK_TX_API_TOKEN}`),
      },
      body: JSON.stringify({
        email,
        name: email.split("@")[0],
        status: "enabled",
        lists: [Number(env.LISTMONK_LIST_ID)],
        preconfirm_subscriptions: true,
      }),
    });
  } catch {
    return json({ error: "Could not reach the subscription service." }, 502);
  }

  // The address already exists in listmonk (e.g. on another list), so add it
  // to ours. The welcome email only goes to addresses that were never on it.
  if (subscribeRes.status === 409) {
    const result = await addExistingToList(email, env);
    if (result === "failed") {
      return json({ error: "Could not subscribe right now." }, 502);
    }
    if (result === "added") {
      locals.runtime.ctx.waitUntil(sendWelcomeEmail(email, env));
    }
    return json({ ok: true });
  }

  if (!subscribeRes.ok) {
    console.error(
      "subscribe failed",
      subscribeRes.status,
      await subscribeRes.text(),
    );
    return json(
      { error: "Could not subscribe right now." },
      subscribeRes.status === 400 ? 400 : 502,
    );
  }

  locals.runtime.ctx.waitUntil(sendWelcomeEmail(email, env));

  return json({ ok: true });
};

function listmonkAuth(env: App.Locals["runtime"]["env"]) {
  return (
    "Basic " + btoa(`${env.LISTMONK_TX_API_USER}:${env.LISTMONK_TX_API_TOKEN}`)
  );
}

// "added": newly on our list. "already": subscribed (or blocklisted), nothing
// to do. "resubscribed": had unsubscribed earlier, put back without a welcome.
// Search only returns subscribers on lists this API user can see, so an
// address that exists only on unrelated lists comes back as "failed".
async function addExistingToList(
  email: string,
  env: App.Locals["runtime"]["env"],
): Promise<"added" | "already" | "resubscribed" | "failed"> {
  const listId = Number(env.LISTMONK_LIST_ID);
  try {
    const searchRes = await fetch(
      `${env.LISTMONK_URL}/api/subscribers?search=${encodeURIComponent(email)}`,
      { headers: { Authorization: listmonkAuth(env) } },
    );
    if (!searchRes.ok) {
      console.error("subscriber search failed", searchRes.status);
      return "failed";
    }
    const data = (await searchRes.json()) as {
      data?: {
        results?: {
          id: number;
          email: string;
          status: string;
          lists?: { id: number; subscription_status: string }[];
        }[];
      };
    };
    const match = data.data?.results?.find(
      (r) => r.email.toLowerCase() === email.toLowerCase(),
    );
    if (!match) {
      console.error("existing subscriber not visible to API user");
      return "failed";
    }
    if (match.status === "blocklisted") return "already";

    const onList = match.lists?.find((l) => l.id === listId);
    if (onList && onList.subscription_status !== "unsubscribed") {
      return "already";
    }

    const addRes = await fetch(`${env.LISTMONK_URL}/api/subscribers/lists`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: listmonkAuth(env),
      },
      body: JSON.stringify({
        ids: [match.id],
        action: "add",
        target_list_ids: [listId],
        status: "confirmed",
      }),
    });
    if (!addRes.ok) {
      console.error("add to list failed", addRes.status, await addRes.text());
      return "failed";
    }
    return onList ? "resubscribed" : "added";
  } catch (err) {
    console.error("add existing subscriber error", err);
    return "failed";
  }
}

// Fails closed: any error, missing config, wrong action or unexpected hostname
// rejects the request. Tokens are single-use, so a replay also fails here.
async function verifyTurnstile(
  token: string,
  clientIp: string | null,
  env: App.Locals["runtime"]["env"],
): Promise<boolean> {
  const expectedHostnames = new Set(
    (env.TURNSTILE_HOSTNAMES ?? "")
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean),
  );
  if (
    !env.TURNSTILE_SECRET ||
    expectedHostnames.size === 0 ||
    token.length === 0 ||
    token.length > 2048
  ) {
    return false;
  }

  try {
    const params = new URLSearchParams({
      secret: env.TURNSTILE_SECRET,
      response: token,
    });
    if (clientIp) params.set("remoteip", clientIp);

    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!res.ok) return false;
    const result = (await res.json()) as {
      success?: boolean;
      action?: string;
      hostname?: string;
    };
    return (
      result.success === true &&
      result.action === TURNSTILE_ACTION &&
      typeof result.hostname === "string" &&
      expectedHostnames.has(result.hostname)
    );
  } catch (err) {
    console.error("turnstile verify error", err);
    return false;
  }
}

// Best-effort: a failed welcome email shouldn't fail the subscription itself.
async function sendWelcomeEmail(
  email: string,
  env: App.Locals["runtime"]["env"],
) {
  try {
    const res = await fetch(`${env.LISTMONK_URL}/api/tx`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Basic " +
          btoa(`${env.LISTMONK_TX_API_USER}:${env.LISTMONK_TX_API_TOKEN}`),
      },
      body: JSON.stringify({
        subscriber_email: email,
        template_id: Number(env.LISTMONK_WELCOME_TEMPLATE_ID),
        from_email: env.LISTMONK_FROM_EMAIL,
      }),
    });
    if (!res.ok) {
      console.error("welcome email failed", res.status, await res.text());
    }
  } catch (err) {
    console.error("welcome email error", err);
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
