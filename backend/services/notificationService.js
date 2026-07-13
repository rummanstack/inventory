// Reusable notification interface (Section N of the build spec): callers
// depend only on send({...}) so a real SMS/WhatsApp/Email/Push provider can be
// dropped in later without touching any call site. This implementation is
// intentionally a no-op beyond logging — no provider is wired yet.
//
// A real provider implementation must swallow its own errors (never throw)
// since call sites invoke this synchronously inside business transactions —
// a notification failure must never roll back a payment or plan creation.
export const NOTIFICATION_CHANNELS = ["SMS", "WHATSAPP", "EMAIL", "PUSH"];

export class NotificationService {
  constructor({ logger = console } = {}) {
    this.logger = logger;
  }

  // channel: one of NOTIFICATION_CHANNELS. to: a phone number or email,
  // depending on channel. template: a short identifier (e.g.
  // "installment_payment_received"), data: template variables.
  async send({ tenantId, channel, to, template, data = {} } = {}) {
    try {
      this.logger.log?.(
        `[notification:noop] tenant=${tenantId} channel=${channel} to=${to} template=${template} data=${JSON.stringify(data)}`,
      );
      return { queued: false, reason: "no provider configured" };
    } catch {
      // Never let a notification failure surface to the caller.
      return { queued: false, reason: "logging failed" };
    }
  }
}
