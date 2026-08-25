import { NextResponse } from "next/server";

import { handleBotMessage } from "@/lib/bot/handler";

export const dynamic = "force-dynamic";

/**
 * WhatsApp Cloud API webhook.
 *
 * Meta sends POST requests for incoming messages. We extract the sender's
 * phone number and message text, pass them through the shared bot handler,
 * and reply via the WhatsApp Send API.
 *
 * Setup:
 * 1. Set WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID in .env
 * 2. In Meta for Developers → WhatsApp → Configuration → Webhook:
 *    - Callback URL: https://<your-domain>/api/webhooks/whatsapp
 *    - Verify token: any string (not used here, but Meta requires one)
 * 3. Subscribe to the "messages" field.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Meta sends a verification GET; this is the POST handler for messages.
    const entries = body.entry ?? [];
    for (const entry of entries) {
      const changes = entry.changes ?? [];
      for (const change of changes) {
        const value = change.value;
        const messages = value?.messages ?? [];

        for (const msg of messages) {
          if (msg.type !== "text") continue;

          const phone = msg.from ?? "";
          const text = msg.text?.body ?? "";

          if (!text.trim()) continue;

          const reply = await handleBotMessage({ text, senderPhone: phone });

          // Send reply back via WhatsApp Send API.
          const token = process.env.WHATSAPP_TOKEN;
          const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
          if (token && phoneId) {
            await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                to: phone,
                type: "text",
                text: { preview_url: false, body: reply.text },
              }),
            });
          }
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[webhook/whatsapp] error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: true }); // Always 200 to avoid Meta retries
  }
}

/**
 * WhatsApp webhook verification (Meta sends GET to verify the endpoint).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && challenge) {
    // In production, verify token matches a configured value.
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
    if (verifyToken && token !== verifyToken) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Bad Request", { status: 400 });
}
