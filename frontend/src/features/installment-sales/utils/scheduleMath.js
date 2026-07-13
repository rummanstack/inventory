// Pure, no React — mirrors backend/services/installmentPlanService.js's own
// addCalendarMonths/round2/schedule-generation math exactly, so the client-side
// preview shown before submit matches what the server actually creates.
// Never uses `new Date('YYYY-MM-DD')` on its own — that parses as UTC midnight,
// which renders as 6:00 AM in Bangladesh (UTC+6). All day-level math below stays
// in the Date.UTC(...) domain and only ever emits/consumes ISO date strings.

export function round2(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

export function addCalendarMonths(isoDate, months) {
  const [year, month, day] = isoDate.split('-').map(Number);
  const targetMonthIndex = month - 1 + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const clampedDay = Math.min(day, daysInTargetMonth);
  const result = new Date(Date.UTC(targetYear, targetMonth, clampedDay));
  return result.toISOString().slice(0, 10);
}

// items: [{ quantityPieces, actualSalePrice }]
export function computeSchedulePreview({
  items = [],
  discount = 0,
  downPayment = 0,
  markupType = 'PERCENT',
  markupValue = 0,
  numberOfMonths = 0,
  firstPaymentDate = '',
}) {
  const productTotal = round2(items.reduce((sum, item) => sum + Number(item.quantityPieces || 0) * Number(item.actualSalePrice || 0), 0));
  const netSaleAmount = round2(Math.max(0, productTotal - Number(discount || 0)));
  const financeAmount = round2(Math.max(0, netSaleAmount - Number(downPayment || 0)));
  const markupAmount = markupType === 'PERCENT'
    ? round2((financeAmount * Number(markupValue || 0)) / 100)
    : round2(Number(markupValue || 0));
  const finalPayableAmount = round2(financeAmount + markupAmount);

  const months = Math.max(0, Math.trunc(Number(numberOfMonths || 0)));
  const rows = [];
  if (months > 0 && firstPaymentDate) {
    const baseInstallment = Math.floor((finalPayableAmount / months) * 100) / 100;
    let allocatedSoFar = 0;
    for (let i = 1; i <= months; i += 1) {
      const isLast = i === months;
      const dueAmount = isLast ? round2(finalPayableAmount - allocatedSoFar) : baseInstallment;
      allocatedSoFar = round2(allocatedSoFar + dueAmount);
      const dueDate = i === 1 ? firstPaymentDate : addCalendarMonths(firstPaymentDate, i - 1);
      rows.push({ installmentNo: i, dueDate, dueAmount });
    }
  }

  return {
    productTotal,
    netSaleAmount,
    financeAmount,
    markupAmount,
    finalPayableAmount,
    monthlyInstallmentAmount: months > 0 ? round2(finalPayableAmount / months) : 0,
    rows,
  };
}
