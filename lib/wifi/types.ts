export interface WifiOperationResult {
  ok: boolean;
  error?: string;
}

export interface VoucherActivationResult extends WifiOperationResult {
  activatedAt?: string;
  expiresAt?: string;
}

export interface VoucherUsageInfo {
  bytesIn: number;
  bytesOut: number;
  devices: number;
}

/**
 * Abstraction over the actual network infrastructure (MikroTik / UniFi /
 * RADIUS / custom captive portal). The platform never pretends a voucher
 * magically connects a device — implementations bridge to the real hotspot
 * system through its API. Credentials stay server-side.
 *
 * Implement `WiFiProvider` and register it in lib/wifi/index.ts to add support
 * for another hotspot system without touching any business logic.
 */
export interface WiFiProvider {
  readonly name: string;
  /** Register a freshly issued voucher on the network side (optional no-op). */
  createVoucher(spec: {
    code: string;
    durationHours: number;
    dataAllowanceMb: number | null;
    deviceLimit: number;
  }): Promise<WifiOperationResult>;
  /** Activate a voucher for a device; starts the expiry window. */
  activateVoucher(code: string, deviceMac?: string): Promise<VoucherActivationResult>;
  revokeVoucher(code: string): Promise<WifiOperationResult>;
  suspendVoucher(code: string): Promise<WifiOperationResult>;
  getVoucherStatus(
    code: string
  ): Promise<WifiOperationResult & { status?: string; expiresAt?: string | null }>;
  getVoucherUsage(code: string): Promise<WifiOperationResult & { usage?: VoucherUsageInfo }>;
}
