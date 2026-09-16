import { sweepEscrowDeadlines } from "@/lib/orders";

/**
 * Applies escrow deadlines (refund when the seller misses handover, release
 * when the inspection window ends, cancel unpaid checkouts). Point a
 * scheduler at this every few minutes with:
 *   Authorization: Bearer $CRON_SECRET
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  await sweepEscrowDeadlines();
  return Response.json({ ok: true, ranAt: new Date().toISOString() });
}
