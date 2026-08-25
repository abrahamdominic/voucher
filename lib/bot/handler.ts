import { createAdminClient } from "@/lib/supabase/admin";

import type { Order, Voucher } from "@/types/database";

export interface BotMessage {
  text: string;
  senderPhone?: string;
  senderName?: string;
}

export interface BotReply {
  text: string;
}

const HELP_TEXT = [
  "Available commands:",
  "",
  "/status <REFERENCE> — check your order status",
  "/voucher <CODE> — check voucher validity",
  "/help — show this message",
  "",
  "You can also send an order reference or voucher code directly.",
].join("\n");

const WELCOME_TEXT = [
  "Welcome to NK Swift DATA! 🎉",
  "",
  "Buy Wi-Fi plans, get instant voucher codes.",
  "",
  "Type /help to see what I can do.",
].join("\n");

function normalisePhone(raw: string): string {
  let p = raw.replace(/\s+/g, "");
  if (p.startsWith("0")) p = `+234${p.slice(1)}`;
  if (!p.startsWith("+")) p = `+${p}`;
  return p;
}

async function lookupOrderByReference(reference: string): Promise<{ order: Order; voucherCode: string | null } | null> {
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("*")
    .eq("reference", reference.toUpperCase())
    .maybeSingle();

  if (!order) return null;

  let voucherCode: string | null = null;
  if (order.voucher_id) {
    const { data: voucher } = await admin
      .from("vouchers")
      .select("code")
      .eq("id", order.voucher_id)
      .maybeSingle();
    voucherCode = voucher?.code ?? null;
  }

  return { order: order as unknown as Order, voucherCode };
}

async function lookupVoucherByCode(code: string): Promise<{ voucher: Voucher; orderReference: string | null } | null> {
  const admin = createAdminClient();
  const { data: voucher } = await admin
    .from("vouchers")
    .select("*")
    .eq("code", code.toUpperCase())
    .maybeSingle();

  if (!voucher) return null;

  let orderReference: string | null = null;
  if (voucher.order_id) {
    const { data: order } = await admin
      .from("orders")
      .select("reference")
      .eq("id", voucher.order_id)
      .maybeSingle();
    orderReference = order?.reference ?? null;
  }

  return { voucher: voucher as unknown as Voucher, orderReference };
}

async function lookupVoucherByPhone(phone: string): Promise<{ voucher: Voucher; orderReference: string | null } | null> {
  const admin = createAdminClient();
  const normalised = normalisePhone(phone);

  const { data: voucher } = await admin
    .from("vouchers")
    .select("*")
    .or(`customer_phone.eq.${normalised},customer_phone.eq.${phone}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!voucher) return null;

  let orderReference: string | null = null;
  if (voucher.order_id) {
    const { data: order } = await admin
      .from("orders")
      .select("reference")
      .eq("id", voucher.order_id)
      .maybeSingle();
    orderReference = order?.reference ?? null;
  }

  return { voucher: voucher as unknown as Voucher, orderReference };
}

function formatOrderStatus(order: Order, voucherCode: string | null): string {
  const lines = [
    `Order: ${order.reference}`,
    `Plan: ${order.plan_name}`,
    `Status: ${order.status}`,
    `Amount: ₦${(order.amount_kobo / 100).toLocaleString()}`,
  ];
  if (order.status === "paid" && voucherCode) {
    lines.push(`Voucher: ${voucherCode}`);
  }
  if (order.status === "pending") {
    lines.push("Payment is being processed.");
  }
  return lines.join("\n");
}

function formatVoucherStatus(voucher: Voucher, orderReference: string | null): string {
  const lines = [
    `Voucher: ${voucher.code}`,
    `Status: ${voucher.status}`,
    `Duration: ${voucher.duration_hours}h`,
  ];
  if (voucher.data_allowance_mb) {
    lines.push(`Data: ${voucher.data_allowance_mb} MB`);
  }
  if (voucher.expires_at) {
    lines.push(`Expires: ${new Date(voucher.expires_at).toLocaleString()}`);
  }
  if (orderReference) {
    lines.push(`Order: ${orderReference}`);
  }
  return lines.join("\n");
}

export async function handleBotMessage(message: BotMessage): Promise<BotReply> {
  const text = message.text.trim();

  // /start
  if (/^\/start$/i.test(text)) {
    return { text: WELCOME_TEXT };
  }

  // /help
  if (/^\/help$/i.test(text)) {
    return { text: HELP_TEXT };
  }

  // /status [reference]
  const statusMatch = text.match(/^\/status\s+(.+)/i);
  if (statusMatch) {
    const reference = statusMatch[1].trim().toUpperCase();
    const result = await lookupOrderByReference(reference);
    if (!result) return { text: `No order found for "${reference}". Check the reference and try again.` };
    return { text: formatOrderStatus(result.order, result.voucherCode) };
  }
  if (/^\/status$/i.test(text)) {
    if (message.senderPhone) {
      const result = await lookupVoucherByPhone(message.senderPhone);
      if (result) return { text: formatVoucherStatus(result.voucher, result.orderReference) };
    }
    return { text: "Usage: /status <ORDER_REFERENCE>" };
  }

  // /voucher <code>
  const voucherMatch = text.match(/^\/voucher\s+(.+)/i);
  if (voucherMatch) {
    const code = voucherMatch[1].trim().toUpperCase();
    const result = await lookupVoucherByCode(code);
    if (!result) return { text: `No voucher found for "${code}". Check the code and try again.` };
    return { text: formatVoucherStatus(result.voucher, result.orderReference) };
  }

  // Plain text — try to look up as reference or voucher code
  const upper = text.toUpperCase();
  if (/^[A-Z0-9]{2,8}(-[A-Z0-9]{3,10}){1,3}$/.test(upper)) {
    // Looks like a voucher code
    const voucherResult = await lookupVoucherByCode(upper);
    if (voucherResult) return { text: formatVoucherStatus(voucherResult.voucher, voucherResult.orderReference) };
  }

  if (/^[A-Z0-9]{6,20}$/.test(upper)) {
    // Looks like an order reference
    const orderResult = await lookupOrderByReference(upper);
    if (orderResult) return { text: formatOrderStatus(orderResult.order, orderResult.voucherCode) };
  }

  return { text: HELP_TEXT };
}
