import "server-only";

/**
 * - "simulated": test mode. A fake payment page stands in for M-Pesa and no
 *   money moves. Default in development.
 * - "disabled": checkout is off. Default in production until a licensed
 *   payment partner is connected.
 *
 * Connecting a real partner means: start an M-Pesa STK push in
 * paymentUrlFor's place, receive the partner's webhook, and call
 * markOrderPaid() from it; refunds and payouts go in refundOrder() and
 * completeOrder() (src/lib/orders.ts).
 */
export type PaymentMode = "simulated" | "disabled";

export function getPaymentMode(): PaymentMode {
  const mode = process.env.PAYMENTS_MODE;
  if (mode === "simulated" || mode === "disabled") return mode;
  return process.env.NODE_ENV === "production" ? "disabled" : "simulated";
}

/** Where to send the buyer to pay for a PENDING_PAYMENT order. */
export function paymentUrlFor(orderId: string) {
  return `/orders/${orderId}/pay`;
}
