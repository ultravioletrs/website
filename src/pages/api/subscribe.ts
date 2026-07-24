import type { APIRoute } from "astro";

export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;

  let body: { email?: unknown; company?: unknown };
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

  locals.runtime.ctx.waitUntil(sendWelcomeEmail(email, env));

  return json({ ok: true });
};

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
