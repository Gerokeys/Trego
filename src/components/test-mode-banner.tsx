export function TestModeBanner() {
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <strong>Test mode:</strong> payments are simulated and no real money moves.
      Real M-Pesa checkout switches on once a licensed payment partner is
      connected.
    </div>
  );
}
