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

  let subscribeRes: Response;
  try {
    subscribeRes = await fetch(`${env.LISTMONK_URL}/api/public/subscription`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        name: "",
        list_uuids: [env.LISTMONK_LIST_UUID],
      }),
    });
  } catch {
    return json({ error: "Could not reach the subscription service." }, 502);
  }

  if (!subscribeRes.ok) {
    let message = "Could not subscribe right now.";
    try {
      const errBody = await subscribeRes.json();
      if (errBody && typeof errBody.message === "string")
        message = errBody.message;
    } catch {
      // Fall back to the generic message above.
    }
    return json({ error: message }, subscribeRes.status === 400 ? 400 : 502);
  }

  return json({ ok: true });
};

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

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
