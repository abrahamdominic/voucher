import { NextResponse } from "next/server";

import { handleBotMessage } from "@/lib/bot/handler";

export const dynamic = "force-dynamic";

/**
 * Telegram Bot API webhook.
 *
 * Telegram sends POST requests for incoming messages. We extract the sender's
 * phone number (if available) and message text, pass them through the shared
 * bot handler, and reply via the Telegram sendMessage API.
 *
 * Setup:
 * 1. Create a bot via @BotFather on Telegram and get the token.
 * 2. Set TELEGRAM_BOT_TOKEN in .env
 * 3. Set the webhook:
 *    curl -X POST "https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook" \
 *      -d "url=https://<your-domain>/api/webhooks/telegram"
 * 4. Optional: set TELEGRAM_BOT_SECRET for webhook verification.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Telegram webhook secret verification (if configured).
    const secretToken = process.env.TELEGRAM_BOT_SECRET;
    if (secretToken) {
      const headerToken = request.headers.get("x-telegram-bot-api-secret-token");
      if (headerToken !== secretToken) {
        return new NextResponse("Forbidden", { status: 403 });
      }
    }

    const message = body.message ?? body.edited_message;
    if (!message) return NextResponse.json({ ok: true });

    const text = message.text ?? "";
    if (!text.trim()) return NextResponse.json({ ok: true });

    const phone = message.from?.phone_number ?? "";
    const name = [message.from?.first_name, message.from?.last_name].filter(Boolean).join(" ") ?? "";

    const reply = await handleBotMessage({ text, senderPhone: phone, senderName: name });

    // Send reply back via Telegram API.
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (token) {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: message.chat.id,
          text: reply.text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[webhook/telegram] error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: true }); // Always 200 to avoid Telegram retries
  }
}

/**
 * Telegram webhook verification (GET for health checks).
 */
export async function GET() {
  return NextResponse.json({ ok: true, service: "telegram-webhook" });
}
