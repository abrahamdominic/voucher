export type UserRole = "super_admin" | "admin" | "staff";

export type OrderStatus = "pending" | "paid" | "failed" | "cancelled" | "refunded";

export type PaymentStatus = "pending" | "successful" | "failed" | "refunded";

export type VoucherStatus =
  | "available"
  | "reserved"
  | "issued"
  | "active"
  | "expired"
  | "suspended"
  | "revoked"
  | "used";

export type VoucherSource = "generated" | "imported";

export type NotificationType =
  | "payment_success"
  | "voucher_issued"
  | "voucher_expiring"
  | "payment_failed"
  | "voucher_revoked";

export type NotificationChannel = "email" | "sms" | "whatsapp" | "telegram";

export type NotificationStatus = "pending" | "sent" | "failed";

export type WifiProviderType = "mock" | "mikrotik" | "unifi" | "radius" | "custom";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  price_kobo: number;
  duration_hours: number;
  data_allowance_mb: number | null;
  speed_mbps: string | null;
  device_limit: number;
  is_active: boolean;
  is_popular: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  phone: string;
  email: string | null;
  name: string | null;
  status: "active" | "blocked";
  total_orders: number;
  total_spent_kobo: number;
  first_seen_at: string;
  last_order_at: string | null;
  updated_at: string;
}

export interface Order {
  id: string;
  reference: string;
  customer_id: string | null;
  plan_id: string;
  plan_name: string;
  plan_duration_hours: number;
  amount_kobo: number;
  phone: string;
  email: string;
  status: OrderStatus;
  payment_provider: string;
  provider_reference: string | null;
  voucher_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  refunded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  transaction_ref: string;
  provider: string;
  provider_reference: string | null;
  amount_kobo: number;
  currency: string;
  method: string | null;
  channel: string | null;
  status: PaymentStatus;
  verified_at: string | null;
  refunded_at: string | null;
  refund_reference: string | null;
  failure_reason: string | null;
  raw_response: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Voucher {
  id: string;
  code: string;
  batch_id: string | null;
  plan_id: string;
  order_id: string | null;
  source: VoucherSource;
  status: VoucherStatus;
  duration_hours: number;
  data_allowance_mb: number | null;
  device_limit: number;
  customer_phone: string | null;
  customer_email: string | null;
  activated_at: string | null;
  expires_at: string | null;
  usage: { bytes_in: number; bytes_out: number; devices: number } & Record<string, unknown>;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface VoucherBatch {
  id: string;
  label: string;
  mode: VoucherSource;
  plan_id: string | null;
  quantity: number;
  created_by: string | null;
  created_at: string;
}

export interface WifiProviderRow {
  id: string;
  name: string;
  type: WifiProviderType;
  config: Record<string, unknown>;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WifiSettings {
  id: number;
  network_name: string;
  captive_portal_url: string | null;
  access_point_name: string | null;
  router_identifier: string | null;
  auth_method: "voucher_code" | "username_password" | "mac_address";
  session_duration_minutes: number;
  default_speed_mbps: string | null;
  default_data_limit_mb: number | null;
  default_device_limit: number;
  instructions: string;
  updated_at: string;
}

export interface WifiSession {
  id: string;
  voucher_id: string;
  device_mac: string | null;
  ip_address: string | null;
  started_at: string;
  ended_at: string | null;
  bytes_in: number;
  bytes_out: number;
  status: "active" | "ended" | "terminated";
}

export interface WebhookEvent {
  id: string;
  provider: string;
  event_ref: string;
  payload: Record<string, unknown>;
  processed_at: string | null;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  recipient: string;
  subject: string | null;
  body: string;
  status: NotificationStatus;
  retries: number;
  error: string | null;
  related_type: string | null;
  related_id: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

export interface SettingRow {
  key: "business" | "branding" | "payment" | "wifi" | "notifications";
  value: Record<string, unknown>;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  plan_id: string;
  description: string;
  quantity: number;
  unit_price_kobo: number;
  created_at: string;
}

export interface BusinessSettings {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  supportInfo?: string;
}

export interface BrandingSettings {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  websiteTitle?: string;
  description?: string;
}

export interface PaymentSettings {
  provider?: string;
  currency?: string;
  note?: string;
}

export interface NotificationSettings {
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  whatsappEnabled?: boolean;
  telegramEnabled?: boolean;
}

/**
 * Table definition satisfying supabase-js GenericTable. Insert/Update accept
 * partial rows (defaults and generated columns are handled by the database).
 * Rows are run through a homomorphic mapped type because GenericTable requires
 * an index-signature-compatible record and plain interfaces don't provide one.
 * Relationships must be a tuple for the embed-type parser to traverse them.
 */
interface TableDef<Row extends object, Rels extends readonly Relationship[] = []> {
  Row: { [K in keyof Row]: Row[K] };
  Insert: Partial<{ [K in keyof Row]: Row[K] }>;
  Update: Partial<{ [K in keyof Row]: Row[K] }>;
  Relationships: [...Rels];
}

interface Relationship {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
}

/** Minimal Database shape for typed Supabase clients. */
export interface Database {
  public: {
    Tables: {
      profiles: TableDef<Profile>;
      plans: TableDef<Plan>;
      customers: TableDef<Customer>;
      orders: TableDef<
        Order,
        [
          {
            foreignKeyName: "orders_customer_id_fkey";
            columns: ["customer_id"];
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_plan_id_fkey";
            columns: ["plan_id"];
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_orders_voucher";
            columns: ["voucher_id"];
            isOneToOne: true;
            referencedRelation: "vouchers";
            referencedColumns: ["id"];
          },
        ]
      >;
      payments: TableDef<
        Payment,
        [
          {
            foreignKeyName: "payments_order_id_fkey";
            columns: ["order_id"];
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ]
      >;
      vouchers: TableDef<
        Voucher,
        [
          {
            foreignKeyName: "vouchers_plan_id_fkey";
            columns: ["plan_id"];
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vouchers_order_id_fkey";
            columns: ["order_id"];
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vouchers_batch_id_fkey";
            columns: ["batch_id"];
            referencedRelation: "voucher_batches";
            referencedColumns: ["id"];
          },
        ]
      >;
      voucher_batches: TableDef<VoucherBatch>;
      wifi_providers: TableDef<WifiProviderRow>;
      wifi_settings: TableDef<WifiSettings>;
      wifi_sessions: TableDef<WifiSession>;
      webhook_events: TableDef<WebhookEvent>;
      notifications: TableDef<NotificationRow>;
      audit_logs: TableDef<AuditLog>;
      settings: TableDef<SettingRow>;
      order_items: TableDef<
        OrderItem,
        [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_plan_id_fkey";
            columns: ["plan_id"];
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
        ]
      >;
    };
    Views: { [_ in never]: never };
    Functions: {
      allocate_voucher_for_order: {
        Args: { p_order_id: string };
        Returns: { allocated_voucher_id: string; allocated_voucher_code: string }[];
      };
      process_successful_payment: {
        Args: {
          p_payment_id: string;
          p_method?: string | null;
          p_channel?: string | null;
          p_provider_reference?: string | null;
          p_raw?: Record<string, unknown> | null;
        };
        Returns: string;
      };
      expire_due_vouchers: { Args: Record<string, never>; Returns: number };
      activate_voucher: {
        Args: { p_code: string; p_device_mac?: string | null };
        Returns: Record<string, unknown>;
      };
    };
    Enums: {
      user_role: UserRole;
      order_status: OrderStatus;
      payment_status: PaymentStatus;
      voucher_status: VoucherStatus;
      voucher_source: VoucherSource;
      notification_type: NotificationType;
      notification_channel: NotificationChannel;
      notification_status: NotificationStatus;
      wifi_provider_type: WifiProviderType;
    };
  };
}
