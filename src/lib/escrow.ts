/**
 * How Trego Escrow behaves. Enforced by src/lib/orders.ts and described
 * across the site from these same constants.
 */
export const INSPECTION_WINDOW_HOURS = 48;
export const SELLER_HANDOVER_DAYS = 3;
/** Unpaid checkouts are cancelled after this, freeing the listing again. */
export const PAYMENT_WINDOW_MINUTES = 30;
/** Pending offers lapse after this; accepted offers must be paid within it. */
export const OFFER_VALID_HOURS = 48;

export const ESCROW_STEPS = [
  {
    title: "You pay into escrow",
    body: "Pay with M-Pesa or card. The money goes to our licensed payment partner, not to the seller.",
    money: "Held by our payment partner",
  },
  {
    title: "The seller hands it over",
    body: `The seller sees your payment is secured, then meets you or ships the item within ${SELLER_HANDOVER_DAYS} days.`,
    money: "Still held",
  },
  {
    title: "You inspect it",
    body: `You get ${INSPECTION_WINDOW_HOURS} hours to check it against the listing: condition, defects, IMEI, and that it isn’t locked.`,
    money: "Still held",
  },
  {
    title: "Money is released",
    body: "Happy? Confirm and the seller gets paid. Not as described? Open a dispute and the money stays held while we review it.",
    money: "Paid to the seller, or refunded to you",
  },
];

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Awaiting payment",
  PAID: "Paid · waiting for handover",
  HANDED_OVER: "Handed over · buyer inspecting",
  COMPLETED: "Completed",
  DISPUTED: "In dispute",
  REFUNDED: "Refunded",
  CANCELLED: "Cancelled",
};

/** Plain answer to "where is my money right now?" for each order status. */
export const MONEY_LOCATION: Record<string, string> = {
  PENDING_PAYMENT: "Not paid yet",
  PAID: "Held in escrow",
  HANDED_OVER: "Held in escrow",
  DISPUTED: "Held in escrow while the dispute is reviewed",
  COMPLETED: "Released to the seller",
  REFUNDED: "Refunded to the buyer",
  CANCELLED: "No payment was taken",
};

export const HANDOVER_LABELS: Record<string, string> = {
  MEET_UP: "Meet up in person",
  DELIVERY: "Delivery",
};
