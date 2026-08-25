import { createAdminClient } from "@/lib/supabase/admin";

import type {
  VoucherActivationResult,
  WiFiProvider,
  WifiOperationResult,
} from "./types";

/**
 * Built-in mock implementation of the WiFiProvider interface.
 * Persists activation state in the platform database (authoritative for
 * expiry/status) so the full customer journey works before a real hotspot
 * API is connected. Replace by setting WIFI_PROVIDER=custom with
 * WIFI_API_URL/WIFI_API_KEY, or implement another provider class.
 */
export class MockWiFiProvider implements WiFiProvider {
  readonly name = "mock";

  async createVoucher(): Promise<WifiOperationResult> {
    return { ok: true };
  }

  async activateVoucher(code: string, deviceMac?: string): Promise<VoucherActivationResult> {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("activate_voucher", {
      p_code: code,
      p_device_mac: deviceMac ?? null,
    });
    if (error) return { ok: false, error: error.message };
    const result = data as unknown as {
      code: string;
      status: string;
      activated_at: string;
      expires_at: string;
    };
    return {
      ok: true,
      activatedAt: result?.activated_at,
      expiresAt: result?.expires_at,
    };
  }

  async revokeVoucher(code: string): Promise<WifiOperationResult> {
    const admin = createAdminClient();
    await admin.from("vouchers").update({ status: "revoked" }).eq("code", code);
    return { ok: true };
  }

  async suspendVoucher(code: string): Promise<WifiOperationResult> {
    const admin = createAdminClient();
    await admin.from("vouchers").update({ status: "suspended" }).eq("code", code);
    return { ok: true };
  }

  async getVoucherStatus(code: string) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("vouchers")
      .select("status, expires_at")
      .eq("code", code)
      .maybeSingle();
    if (!data) return { ok: false as const, error: "Voucher not found" };
    return { ok: true as const, status: data.status, expiresAt: data.expires_at };
  }

  async getVoucherUsage(code: string) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("vouchers")
      .select("usage")
      .eq("code", code)
      .maybeSingle();
    if (!data) return { ok: false as const, error: "Voucher not found" };
    const usage = data.usage as { bytes_in?: number; bytes_out?: number; devices?: number };
    return {
      ok: true as const,
      usage: {
        bytesIn: usage.bytes_in ?? 0,
        bytesOut: usage.bytes_out ?? 0,
        devices: usage.devices ?? 0,
      },
    };
  }
}
