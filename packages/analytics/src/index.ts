/** Integer minor units only; eligibility/aggregation arrive with PLAN-03/04. */
export function grossGamingRevenue(stakes: number, payouts: number): number {
  if (
    !Number.isSafeInteger(stakes) ||
    !Number.isSafeInteger(payouts) ||
    stakes < 0 ||
    payouts < 0
  ) {
    throw new RangeError(
      "Stakes and payouts must be non-negative safe integers",
    );
  }
  return stakes - payouts;
}
