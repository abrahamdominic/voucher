import { config } from "@/lib/config";

import { MockWiFiProvider } from "./mock";
import type { VoucherActivationResult, WiFiProvider, WifiOperationResult } from "./types";

/**
 * Generic REST bridge for a custom captive-portal / hotspot API.
 *
 * Expected contract (documented in README — adapt here to your system):
 *   POST   {WIFI_API_URL}/vouchers            create voucher
 *   POST   {WIFI_API_URL}/vouchers/:code/activate
 *   DELETE {WIFI_API_URL}/vouchers/:code      revoke
 *   PATCH  {WIFI_API_URL}/vouchers/:code      suspend {action:"suspend"}
 *   GET    {WIFI_API_URL}/vouchers/:code      status/usage
 *
 * Auth: `Authorization: Bearer ${WIFI_API_KEY}` and
 *       `X-Api-Secret: ${WIFI_API_SECRET}` headers, both server-side only.
 */
export class HttpApiWiFiProvider implements WiFiProvider {
  readonly name = "custom-api";

  private async call<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${config.wifiApiUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.wifiApiKey}`,
        "X-Api-Secret": config.wifiApiSecret,
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) throw new Error(`WiFi API ${res.status}: ${await res.text()}`);
    return (await res.json()) as T;
  }

  async createVoucher(spec: {
    code: string;
    durationHours: number;
    dataAllowanceMb: number | null;
    deviceLimit: number;
  }): Promise<WifiOperationResult> {
    try {
      await this.call("/vouchers", { method: "POST", body: JSON.stringify(spec) });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "WiFi API error" };
    }
  }

  async activateVoucher(code: string, deviceMac?: string): Promise<VoucherActivationResult> {
    try {
      const data = await this.call<{ activated_at?: string; expires_at?: string }>(
        `/vouchers/${encodeURIComponent(code)}/activate`,
        { method: "POST", body: JSON.stringify({ deviceMac }) }
      );
      return { ok: true, activatedAt: data.activated_at, expiresAt: data.expires_at };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "WiFi API error" };
    }
  }

  async revokeVoucher(code: string): Promise<WifiOperationResult> {
    try {
      await this.call(`/vouchers/${encodeURIComponent(code)}`, { method: "DELETE" });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "WiFi API error" };
    }
  }

  async suspendVoucher(code: string): Promise<WifiOperationResult> {
    try {
      await this.call(`/vouchers/${encodeURIComponent(code)}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "suspend" }),
      });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "WiFi API error" };
    }
  }

  async getVoucherStatus(code: string) {
    try {
      const data = await this.call<{ status?: string; expires_at?: string | null }>(
        `/vouchers/${encodeURIComponent(code)}`
      );
      return { ok: true as const, status: data.status, expiresAt: data.expires_at ?? null };
    } catch (error) {
      return { ok: false as const, error: error instanceof Error ? error.message : "WiFi API error" };
    }
  }

  async getVoucherUsage(code: string) {
    try {
      const data = await this.call<{ usage?: { bytes_in?: number; bytes_out?: number; devices?: number } }>(
        `/vouchers/${encodeURIComponent(code)}`
      );
      return {
        ok: true as const,
        usage: {
          bytesIn: data.usage?.bytes_in ?? 0,
          bytesOut: data.usage?.bytes_out ?? 0,
          devices: data.usage?.devices ?? 0,
        },
      };
    } catch (error) {
      return { ok: false as const, error: error instanceof Error ? error.message : "WiFi API error" };
    }
  }
}

export function getWifiProvider(): WiFiProvider {
  switch (config.wifiProvider) {
    case "custom":
      if (!config.wifiApiUrl || !config.wifiApiKey) {
        console.warn("[wifi] WIFI_PROVIDER=custom but WIFI_API_URL/WIFI_API_KEY missing — using mock.");
        return new MockWiFiProvider();
      }
      return new HttpApiWiFiProvider();
    case "mock":
    default:
      // MikroTik / UniFi / RADIUS adapters plug in here:
      // case "mikrotik": return new MikroTikProvider(...)
      return new MockWiFiProvider();
  }
}

export type { WiFiProvider, WifiOperationResult, VoucherActivationResult, VoucherUsageInfo } from "./types";

export interface WiFiProviderInfo {
  label: string;
  configurable: boolean;
}

export function describeWifiProvider(): WiFiProviderInfo {
  switch (config.wifiProvider) {
    case "custom":
      return config.wifiApiUrl && config.wifiApiKey
        ? { label: "Custom HTTP API", configurable: true }
        : { label: "Mock (custom API unconfigured)", configurable: false };
    case "mock":
    default:
      return { label: "Mock provider", configurable: false };
  }
}
