export function cleanNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

export function toPieces(caseQty, pieceQty, piecesPerCase) {
  return cleanNumber(caseQty) * cleanNumber(piecesPerCase || 1) + cleanNumber(pieceQty);
}

export function formatCasePiece(totalPieces, piecesPerCase) {
  const safeTotal = cleanNumber(totalPieces);
  const safeCaseSize = Math.max(1, cleanNumber(piecesPerCase || 1));
  const cases = Math.floor(safeTotal / safeCaseSize);
  const pieces = safeTotal % safeCaseSize;
  return `${cases} case ${pieces} pcs`;
}

export function calculateSold(issuedPieces, returnedPieces) {
  return Math.max(cleanNumber(issuedPieces) - cleanNumber(returnedPieces), 0);
}

export function calculatePayable(soldPieces, sellingPrice) {
  return cleanNumber(soldPieces) * Number(sellingPrice || 0);
}

export function formatCurrency(amount) {
  const value = Number(amount || 0);
  return `৳${value.toLocaleString('en-BD', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatNumber(amount) {
  return Math.round(Number(amount || 0)).toLocaleString('en-BD');
}

export function todayISO() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function formatDate(date) {
  if (!date) return '';

  const value = date instanceof Date
    ? date
    : new Date(typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T00:00:00` : date);

  if (Number.isNaN(value.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(value);
}

export function formatDateTime(date) {
  if (!date) return '';

  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
}

export function formatMonth(month) {
  if (!month) return '';

  const value = month instanceof Date
    ? month
    : new Date(typeof month === 'string' && /^\d{4}-\d{2}$/.test(month) ? `${month}-01T00:00:00` : month);

  if (Number.isNaN(value.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('en-GB', {
    month: 'short',
    year: 'numeric',
  }).format(value);
}

export function createId(prefix) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function reverseEntries(entries) {
  return [...(entries || [])].reverse();
}
