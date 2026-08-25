"use client";

import { useState } from "react";
import { Download, Loader2, Mail, Printer } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export interface ReceiptData {
  businessName: string;
  reference: string;
  plan: string;
  amount: string;
  status: string;
  voucherCode: string;
  date: string;
  expiry: string;
}

export function ReceiptActions({
  reference,
  customerEmail,
  receipt,
}: {
  reference: string;
  customerEmail: string;
  receipt: ReceiptData;
}) {
  const [emailing, setEmailing] = useState(false);
  const [emailed, setEmailed] = useState(false);

  function download() {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${receipt.reference}</title>
<style>body{font-family:ui-sans-serif,system-ui,sans-serif;max-width:560px;margin:40px auto;padding:0 20px;color:#111}
h1{font-size:20px}table{width:100%;border-collapse:collapse;margin-top:16px}td{padding:8px 0;border-bottom:1px solid #eee;vertical-align:top}
td:last-child{text-align:right;font-weight:500}.muted{color:#666;font-size:12px}.mono{font-family:ui-monospace,monospace}</style></head>
<body><h1>${escapeHtml(receipt.businessName)} — Receipt</h1>
<table>
<tr><td>Order number</td><td class="mono">${escapeHtml(receipt.reference)}</td></tr>
<tr><td>Date</td><td>${escapeHtml(receipt.date)}</td></tr>
<tr><td>Plan</td><td>${escapeHtml(receipt.plan)}</td></tr>
<tr><td>Amount</td><td>${escapeHtml(receipt.amount)}</td></tr>
<tr><td>Status</td><td>${escapeHtml(receipt.status.toUpperCase())}</td></tr>
<tr><td>Voucher code</td><td class="mono">${escapeHtml(receipt.voucherCode)}</td></tr>
<tr><td>Expiry</td><td>${escapeHtml(receipt.expiry)}</td></tr>
</table>
<p class="muted">Thank you for your purchase. Keep this voucher code safe — it is required to connect to the Wi-Fi network.</p>
</body></html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt-${reference}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Receipt downloaded");
  }

  async function emailReceipt() {
    setEmailing(true);
    try {
      const res = await fetch("/api/receipt/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference }),
      });
      if (!res.ok) throw new Error();
      setEmailed(true);
      toast.success(`Receipt will be sent to ${customerEmail}`);
    } catch {
      toast.error("Could not queue the email. Please try again.");
    } finally {
      setEmailing(false);
    }
  }

  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-3">
      <Button variant="outline" className="rounded-xl" onClick={download}>
        <Download data-icon="inline-start" aria-hidden /> Download receipt
      </Button>
      <Button variant="outline" className="rounded-xl" onClick={() => window.print()}>
        <Printer data-icon="inline-start" aria-hidden /> Print
      </Button>
      <Button variant="outline" className="rounded-xl" disabled={emailing || emailed} onClick={emailReceipt}>
        {emailing ? (
          <Loader2 className="animate-spin" data-icon="inline-start" aria-hidden />
        ) : (
          <Mail data-icon="inline-start" aria-hidden />
        )}
        {emailed ? "Queued" : "Email receipt"}
      </Button>
    </div>
  );
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c
  );
}
