export function summarizeByAmount(records, getKey, buildGroupSeed) {
  const groups = new Map();
  let totalAmount = 0;

  for (const record of records) {
    const amount = Number(record.amount || 0);
    totalAmount += amount;
    const key = getKey(record);
    const group = groups.get(key) || { ...buildGroupSeed(record), count: 0, totalAmount: 0 };
    group.count += 1;
    group.totalAmount += amount;
    groups.set(key, group);
  }

  return {
    count: records.length,
    totalAmount,
    groups: [...groups.values()].sort((left, right) => right.totalAmount - left.totalAmount),
  };
}
