/**
 * Keeps malformed delivery payouts from introducing NaN or Infinity into the wallet.
 * Valid payouts retain the existing whole-currency rounding and non-negative behavior.
 */
export function normalizeDeliveryPay(pay: number): number {
  if (!Number.isFinite(pay)) return 0;
  return Math.max(0, Math.round(pay));
}
