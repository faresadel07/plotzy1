import { getStripeSync } from './stripe-client';
import { logger } from './lib/logger';

// Event types the app actually cares about. Anything outside this list
// is logged at info and dropped (still ack'd 200 to Stripe so it doesn't
// retry). The set is intentionally permissive — it covers everything
// stripe-replit-sync currently dispatches plus reasonable adjacent
// events. Tighten by removing entries when a type is confirmed unused.
const KNOWN_EVENT_TYPES = new Set([
  // Subscription lifecycle
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.trial_will_end",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  // Invoice / payment
  "invoice.created",
  "invoice.finalized",
  "invoice.paid",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
  "invoice.upcoming",
  // PaymentIntent (one-time book purchase flow)
  "payment_intent.created",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
  // Customer
  "customer.created",
  "customer.updated",
  "customer.deleted",
  // Checkout
  "checkout.session.completed",
  "checkout.session.expired",
  // Charge (refund handling)
  "charge.refunded",
  "charge.dispute.created",
]);

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'Stripe webhook error: Payload must be a Buffer. ' +
        'Ensure the webhook route is registered BEFORE express.json().'
      );
    }

    // Best-effort early filter: parse the payload (this is what Stripe
    // signs, so the JSON shape is trustworthy after the signature check
    // happens inside processWebhook). If the event type is unknown,
    // log + ack without forwarding to the heavyweight handler. If
    // parsing fails, we still hand off so verification + downstream
    // logic can decide what to do.
    let eventType: string | undefined;
    let eventId: string | undefined;
    try {
      const parsed = JSON.parse(payload.toString("utf8")) as { type?: string; id?: string };
      eventType = parsed.type;
      eventId = parsed.id;
    } catch {
      // Malformed JSON — let stripe-replit-sync's signature check fail
      // it cleanly with the proper error code.
    }

    if (eventType && !KNOWN_EVENT_TYPES.has(eventType)) {
      logger.info(
        { eventType, eventId },
        "Stripe webhook: unknown event type — acking without dispatch",
      );
      return;
    }

    if (eventType) {
      logger.info({ eventType, eventId }, "Stripe webhook dispatching");
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);
  }
}
