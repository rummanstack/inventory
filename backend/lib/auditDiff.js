export function diffFields(before, after, fields) {
  const beforeOut = {};
  const afterOut = {};
  let changed = false;

  for (const field of fields) {
    const a = before?.[field];
    const b = after?.[field];
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      beforeOut[field] = a ?? null;
      afterOut[field] = b ?? null;
      changed = true;
    }
  }

  return { changed, before: beforeOut, after: afterOut };
}
