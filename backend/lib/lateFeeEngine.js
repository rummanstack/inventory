// Pure calculation — no DB access, no side effects — so it can be reused
// identically by the Overdue Report (preview) and the apply-late-fee endpoint
// (charge). Mirrors the worked-example style of tradePromotionEngine.js.
export function calculateLateFee(rule, { remainingAmount, daysOverdue }) {
  if (!rule || !rule.active) return 0;

  const graceDays = Math.max(0, Number(rule.gracePeriodDays || 0));
  const chargeableDays = daysOverdue - graceDays;
  if (chargeableDays <= 0) return 0;

  const feeValue = Math.max(0, Number(rule.feeValue || 0));
  let fee = 0;

  switch (rule.feeType) {
    case "FIXED":
      fee = feeValue;
      break;
    case "PERCENT":
      fee = (Number(remainingAmount || 0) * feeValue) / 100;
      break;
    case "DAILY":
      fee = feeValue * chargeableDays;
      break;
    case "WEEKLY":
      fee = feeValue * Math.ceil(chargeableDays / 7);
      break;
    case "MONTHLY":
      fee = feeValue * Math.ceil(chargeableDays / 30);
      break;
    default:
      fee = 0;
  }

  const maxPenalty = Number(rule.maxPenaltyAmount || 0);
  if (maxPenalty > 0) {
    fee = Math.min(fee, maxPenalty);
  }

  return Math.round(Math.max(0, fee) * 100) / 100;
}
