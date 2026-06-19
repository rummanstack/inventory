import { formatCurrency, formatDateTime } from '../utils/calculations.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function compactText(value) {
  return escapeHtml(String(value ?? '').trim()).replace(/\n/g, '<br>');
}

function humanizeCode(value) {
  return String(value ?? '')
    .replace(/_/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatQuantity(quantity) {
  const value = Number(quantity || 0);
  if (Number.isInteger(value)) {
    return String(value);
  }
  return value.toFixed(2).replace(/\.00$/, '');
}

function lineTotalText(item) {
  return formatCurrency(item?.lineTotal ?? Number(item?.actualSalePrice || 0) * Number(item?.quantityPieces || 0));
}

function buildLineItemHtml(item) {
  const name = escapeHtml(item?.productName || 'Item');
  const quantity = formatQuantity(item?.quantityPieces);
  const price = formatCurrency(item?.actualSalePrice);
  const discount = Number(item?.lineDiscount || 0);
  const lineTotal = lineTotalText(item);

  return `
    <tr>
      <td class="item-name">
        <div class="name">${name}</div>
        <div class="meta">${quantity} x ${price}${discount > 0 ? ` &middot; disc ${formatCurrency(discount)}` : ''}</div>
      </td>
      <td class="item-total">${lineTotal}</td>
    </tr>
  `;
}

function buildMetaRow(label, value) {
  if (!value) {
    return '';
  }

  return `
    <tr>
      <td class="label">${escapeHtml(label)}</td>
      <td class="value">${compactText(value)}</td>
    </tr>
  `;
}

function buildMoneyRow(label, value) {
  return `
    <tr>
      <td class="label">${escapeHtml(label)}</td>
      <td class="value">${escapeHtml(formatCurrency(value))}</td>
    </tr>
  `;
}

export function buildReceiptHtml(invoice, {
  businessName = '',
  businessAddress = '',
  businessPhone = '',
  businessEmail = '',
  title = 'Receipt',
  widthMm = 80,
} = {}) {
  const items = Array.isArray(invoice?.items) ? invoice.items : [];
  const safeWidth = Number(widthMm) === 58 ? 58 : 80;
  const businessLines = [businessAddress, businessPhone, businessEmail].filter(Boolean);

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      color-scheme: light;
    }

    @page {
      size: ${safeWidth}mm auto;
      margin: 2mm;
    }

    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #111827;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12px;
      line-height: 1.35;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      width: ${safeWidth - 4}mm;
      margin: 0 auto;
    }

    .receipt {
      padding: 2mm 0;
    }

    .center {
      text-align: center;
    }

    .business-name {
      font-size: 16px;
      font-weight: 800;
      letter-spacing: 0.02em;
      line-height: 1.2;
    }

    .muted {
      color: #4b5563;
    }

    .divider {
      border: 0;
      border-top: 1px dashed #d1d5db;
      margin: 8px 0;
    }

    .meta-table,
    .totals-table {
      width: 100%;
      border-collapse: collapse;
    }

    .meta-table td,
    .totals-table td {
      padding: 1px 0;
      vertical-align: top;
    }

    .meta-table .label,
    .totals-table .label {
      width: 42%;
      color: #4b5563;
      font-size: 11px;
    }

    .meta-table .value,
    .totals-table .value {
      text-align: right;
      font-weight: 700;
      word-break: break-word;
    }

    .items {
      width: 100%;
      border-collapse: collapse;
    }

    .items td {
      padding: 5px 0;
      border-bottom: 1px dotted #d1d5db;
      vertical-align: top;
    }

    .item-name {
      padding-right: 6px;
    }

    .item-name .name {
      font-weight: 700;
      font-size: 12px;
      word-break: break-word;
    }

    .item-name .meta {
      margin-top: 2px;
      font-size: 10px;
      color: #6b7280;
    }

    .item-total {
      white-space: nowrap;
      text-align: right;
      font-weight: 700;
      font-size: 12px;
    }

    .totals-table {
      margin-top: 4px;
    }

    .totals-table .grand td {
      font-size: 13px;
      font-weight: 800;
      border-top: 1px solid #111827;
      padding-top: 5px;
    }

    .totals-table .due td {
      font-size: 13px;
      font-weight: 800;
    }

    .footer {
      margin-top: 10px;
      text-align: center;
      font-size: 11px;
      color: #4b5563;
    }

    .small {
      font-size: 10px;
      color: #6b7280;
    }

    .nowrap {
      white-space: nowrap;
    }
  </style>
</head>
<body>
  <main class="receipt">
    <div class="center">
      <div class="business-name">${escapeHtml(businessName || 'Business Receipt')}</div>
      <div class="small" style="margin-top: 2px; font-weight: 700;">${escapeHtml(title)}</div>
      ${businessLines.length ? `<div class="small">${businessLines.map(compactText).join('<br>')}</div>` : ''}
    </div>

    <hr class="divider" />

    <table class="meta-table">
      <tbody>
        ${buildMetaRow('Invoice', invoice?.invoiceNumber)}
        ${buildMetaRow('Date', formatDateTime(invoice?.createdAt || invoice?.invoiceDate))}
        ${buildMetaRow('Customer', invoice?.customerName || humanizeCode(invoice?.customerType))}
        ${buildMetaRow('Sale type', humanizeCode(invoice?.saleType))}
        ${buildMetaRow('Cashier', invoice?.createdByName)}
        ${buildMetaRow('Payment', humanizeCode(invoice?.paymentMethod))}
      </tbody>
    </table>

    <hr class="divider" />

    <table class="items">
      <tbody>
        ${items.map((item) => buildLineItemHtml(item)).join('')}
      </tbody>
    </table>

    <table class="totals-table">
      <tbody>
        ${buildMoneyRow('Subtotal', invoice?.subtotal)}
        ${buildMoneyRow('Discount', invoice?.discount)}
        ${Number(invoice?.taxRate || 0) > 0 ? buildMoneyRow(`Tax (${Number(invoice.taxRate || 0).toFixed(2)}%)`, invoice?.taxAmount) : ''}
        <tr class="grand">
          <td class="label">Total</td>
          <td class="value">${escapeHtml(formatCurrency(invoice?.totalAmount))}</td>
        </tr>
        ${buildMoneyRow('Paid', invoice?.paidAmount)}
        <tr class="due">
          <td class="label">Due</td>
          <td class="value">${escapeHtml(formatCurrency(invoice?.dueAmount))}</td>
        </tr>
      </tbody>
    </table>

    ${invoice?.note ? `<hr class="divider" /><div class="small"><strong>Note:</strong> ${compactText(invoice.note)}</div>` : ''}

    <div class="footer">
      <div>Thank you for your purchase.</div>
      <div class="small">Please keep this receipt for records.</div>
    </div>
  </main>
</body>
</html>`;
}

export async function printRetailReceipt(invoice, options = {}) {
  const {
    receiptWindow: providedWindow = null,
    ...receiptOptions
  } = options;
  const receiptHtml = buildReceiptHtml(invoice, receiptOptions);
  const receiptWindow = providedWindow || window.open('', '_blank', 'width=420,height=760');

  if (!receiptWindow) {
    return { ok: false, message: 'Popup blocked' };
  }

  let printed = false;
  function printOnce() {
    if (printed || receiptWindow.closed) {
      return;
    }
    printed = true;

    try {
      receiptWindow.focus();
      receiptWindow.print();
    } catch {
      receiptWindow.close();
    }
  }

  receiptWindow.document.open();
  receiptWindow.document.write(receiptHtml);
  receiptWindow.document.close();
  receiptWindow.focus();

  receiptWindow.addEventListener('load', () => {
    setTimeout(printOnce, 150);
  }, { once: true });

  setTimeout(() => {
    printOnce();
  }, 400);

  return { ok: true };
}
