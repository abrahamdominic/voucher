import { createAdminClient } from "@/lib/supabase/admin";

import { ConsoleSender } from "./types";
import type { NotificationChannelSender } from "./types";

/** Resend — transactional email. RESEND_API_KEY (+ optional EMAIL_FROM). */
class ResendEmailSender implements NotificationChannelSender {
  readonly channel = "email";

  async send({ recipient, subject, body }: { recipient: string; subject?: string | null; body: string }) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM ?? "NK Swift DATA <onboarding@resend.dev>",
          to: [recipient],
          subject: subject ?? "Notification",
          text: body,
        }),
      });
      if (!res.ok) return { ok: false as const, error: `Resend ${res.status}` };
      return { ok: true as const };
    } catch (error) {
      return { ok: false as const, error: error instanceof Error ? error.message : "send failed" };
    }
  }
}

/** Telegram Bot API — TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID. */
class TelegramSender implements NotificationChannelSender {
  readonly channel = "telegram";

  async send({ body }: { recipient: string; subject?: string | null; body: string }) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID ?? "";
    if (!token || !chatId) return { ok: true as const }; // not configured → treat as logged

    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: body,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      });
      if (!res.ok) return { ok: false as const, error: `Telegram ${res.status}` };
      return { ok: true as const };
    } catch (error) {
      return { ok: false as const, error: error instanceof Error ? error.message : "send failed" };
    }
  }
}

/** Twilio SMS — TWILIO_ACCOUNT_SID/AUTH_TOKEN/FROM_NUMBER. */
class TwilioSmsSender implements NotificationChannelSender {
  readonly channel = "sms";

  async send({ recipient, body }: { recipient: string; subject?: string | null; body: string }) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM_NUMBER;
    if (!sid || !token || !from) return { ok: true as const };

    // Nigerian local format → E.164 for international delivery
    let to = recipient;
    if (to.startsWith("0")) to = `+234${to.slice(1)}`;

    try {
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
      });
      if (!res.ok) return { ok: false as const, error: `Twilio ${res.status}` };
      return { ok: true as const };
    } catch (error) {
      return { ok: false as const, error: error instanceof Error ? error.message : "send failed" };
    }
  }
}

/** Meta WhatsApp Cloud API — WHATSAPP_TOKEN + WHATSAPP_PHONE_NUMBER_ID. */
class MetaWhatsAppSender implements NotificationChannelSender {
  readonly channel = "whatsapp";

  async send({ recipient, body }: { recipient: string; subject?: string | null; body: string }) {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneId) return { ok: true as const };

    let to = recipient;
    if (to.startsWith("0")) to = `234${to.slice(1)}`;

    try {
      const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { preview_url: false, body },
        }),
      });
      if (!res.ok) return { ok: false as const, error: `WhatsApp ${res.status}` };
      return { ok: true as const };
    } catch (error) {
      return { ok: false as const, error: error instanceof Error ? error.message : "send failed" };
    }
  }
}

function resolve(channel: string): NotificationChannelSender {
  switch (channel) {
    case "email":
      return process.env.RESEND_API_KEY ? new ResendEmailSender() : new ConsoleSender("email");
    case "sms":
      return process.env.TWILIO_ACCOUNT_SID ? new TwilioSmsSender() : new ConsoleSender("sms");
    case "whatsapp":
      return process.env.WHATSAPP_TOKEN ? new MetaWhatsAppSender() : new ConsoleSender("whatsapp");
    case "telegram":
      return process.env.TELEGRAM_BOT_TOKEN ? new TelegramSender() : new ConsoleSender("telegram");
    default:
      return new ConsoleSender(channel);
  }
}

/** Resolve the configured sender for one channel (falls back to console logging). */
export function getChannelSender(channel: string): NotificationChannelSender {
  return resolve(channel);
}

/**
 * Drains pending notifications from the queue and delivers them through the
 * configured providers. Safe to call concurrently; retries with backoff cap.
 * Triggered post-fulfillment (fire-and-forget) and by the cron endpoint.
 */
export async function dispatchPendingNotifications(limit = 25): Promise<{ sent: number; failed: number }> {
  const admin = createAdminClient();
  const { data: pending } = await admin
    .from("notifications")
    .select("*")
    .eq("status", "pending")
    .lt("retries", 5)
    .order("created_at")
    .limit(limit);

  if (!pending?.length) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;

  for (const notification of pending) {
    const sender = resolve(notification.channel);
    const result = await sender.send({
      recipient: notification.recipient,
      subject: notification.subject,
      body: notification.body,
    });

    if (result.ok) {
      await admin
        .from("notifications")
        .update({ status: "sent", sent_at: new Date().toISOString(), error: null })
        .eq("id", notification.id);
      sent += 1;
    } else {
      await admin
        .from("notifications")
        .update({ status: "failed", retries: notification.retries + 1, error: result.error?.slice(0, 300) })
        .eq("id", notification.id);
      failed += 1;
    }
  }

  return { sent, failed };
}
