export function normalizeLoyaltySettings(tenant) {
  return {
    enabled: tenant?.loyaltyEnabled === true,
    pointsPer100: Math.max(0, Number(tenant?.loyaltyPointsPer100 ?? 1)),
    pointValue: Math.max(0, Number(tenant?.loyaltyPointValue ?? 1)),
  };
}

export function calculateEarnedLoyaltyPoints(paidAmount, pointsPer100) {
  const paid = Math.max(0, Number(paidAmount || 0));
  const rate = Math.max(0, Number(pointsPer100 || 0));
  return Math.floor((paid * rate) / 100);
}

export function calculateRedeemAmount(points, pointValue) {
  const normalizedPoints = Math.max(0, Math.floor(Number(points || 0)));
  const value = Math.max(0, Number(pointValue || 0));
  return Math.max(0, normalizedPoints * value);
}
