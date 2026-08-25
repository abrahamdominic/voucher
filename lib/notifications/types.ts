export interface SendParams {
  recipient: string;
  subject?: string | null;
  body: string;
}

export interface SendResult {
  ok: boolean;
  error?: string;
}

/**
 * A per-channel message sender. Implementations must read credentials from
 * server-side env vars only. Unconfigured channels fall back to ConsoleSender
 * so nothing breaks in development.
 */
export interface NotificationChannelSender {
  readonly channel: string;
  send(params: SendParams): Promise<SendResult>;
}

/** Default no-op sender that logs to the server console. */
export class ConsoleSender implements NotificationChannelSender {
  constructor(readonly channel: string) {}

  async send({ recipient, subject, body }: SendParams): Promise<SendResult> {
    console.log(`[notify:${this.channel}] -> ${recipient} :: ${subject ?? ""} ${body.slice(0, 120)}`);
    return { ok: true };
  }
}
