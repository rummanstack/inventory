import { createTranslator } from '../i18n/translations.js';
import { formatCurrency, formatDate, formatDateTime } from '../utils/calculations.js';

function addMonthsToDate(isoDate, months) {
  if (!isoDate || !Number(months || 0)) {
    return null;
  }
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + Number(months || 0));
  return date.toISOString().slice(0, 10);
}

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

function receiptLocale(language) {
  return language === 'bn' ? 'bn-BD' : 'en-GB';
}

function formatQuantity(quantity, language) {
  const value = Number(quantity || 0);
  if (Number.isInteger(value)) {
    return new Intl.NumberFormat(receiptLocale(language)).format(value);
  }
  return new Intl.NumberFormat(receiptLocale(language), {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value, language) {
  return new Intl.NumberFormat(receiptLocale(language), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatLocalizedCurrency(value, language) {
  return formatCurrency(value, language);
}

function labelFor(t, key, fallback) {
  const value = t(key);
  return value === key ? fallback : value;
}

function translatedValue(t, key, fallback) {
  const value = t(key);
  return value === key ? fallback : value;
}

function lineTotalText(item, language) {
  return formatLocalizedCurrency(item?.lineTotal ?? Number(item?.actualSalePrice || 0) * Number(item?.quantityPieces || 0), language);
}

function buildLineItemHtml(item, t, language, invoiceDate) {
  const name = escapeHtml(item?.productName || 'Item');
  const brandModel = [item?.brandSnapshot, item?.modelSnapshot].filter(Boolean).join(' / ');
  const quantity = formatQuantity(item?.quantityPieces, language);
  const price = formatLocalizedCurrency(item?.actualSalePrice, language);
  const discount = Number(item?.lineDiscount || 0);
  const lineTotal = lineTotalText(item, language);
  const discountLabel = labelFor(t, 'retailer.shared.discountLabel', 'Discount');
  const serialLabel = labelFor(t, 'retailer.salesInvoices.serialPrintLabel', 'Serial / IMEI');
  const serials = (item?.serials || []).map((serial) => serial?.serialNumber || serial?.imei1 || serial?.imei2).filter(Boolean);
  const warrantyMonths = Number(item?.warrantyMonthsSnapshot || 0);
  const warrantyEndDate = warrantyMonths > 0 ? addMonthsToDate(invoiceDate, warrantyMonths) : null;
  const warrantyText = warrantyMonths > 0
    ? t('retailer.salesInvoices.warrantyPrintLabel', { months: warrantyMonths, endDate: formatDate(warrantyEndDate, language) })
    : '';

  return `
    <tr>
      <td class="item-name">
        <div class="name">${name}</div>
        ${brandModel ? `<div class="meta">${escapeHtml(brandModel)}</div>` : ''}
        <div class="meta">${quantity} x ${price}${discount > 0 ? ` &middot; ${escapeHtml(discountLabel)} ${formatLocalizedCurrency(discount, language)}` : ''}</div>
        ${serials.length ? `<div class="meta">${escapeHtml(serialLabel)}: ${escapeHtml(serials.join(', '))}</div>` : ''}
        ${warrantyText ? `<div class="meta">${escapeHtml(warrantyText)}</div>` : ''}
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

function buildMoneyRow(label, value, language) {
  return `
    <tr>
      <td class="label">${escapeHtml(label)}</td>
      <td class="value">${escapeHtml(formatLocalizedCurrency(value, language))}</td>
    </tr>
  `;
}

function buildOptionalMoneyRow(label, value, language) {
  if (Number(value || 0) === 0) {
    return '';
  }

  return buildMoneyRow(label, value, language);
}

function buildTextRow(label, value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  return `
    <tr>
      <td class="label">${escapeHtml(label)}</td>
      <td class="value">${escapeHtml(String(value))}</td>
    </tr>
  `;
}

export function buildReceiptHtml(invoice, {
  businessName = '',
  businessAddress = '',
  businessPhone = '',
  businessEmail = '',
  title = 'Receipt',
  language = 'en',
  widthMm = 80,
} = {}) {
  const t = createTranslator(language);
  const items = Array.isArray(invoice?.items) ? invoice.items : [];
  const safeWidth = Number(widthMm) === 58 ? 58 : 80;
  const businessLines = [businessAddress, businessPhone, businessEmail].filter(Boolean);
  const invoiceLabel = labelFor(t, 'retailer.shared.invoiceNumberLabel', 'Invoice');
  const dateLabel = labelFor(t, 'retailer.shared.invoiceDateLabel', 'Date');
  const customerLabel = labelFor(t, 'retailer.shared.customerLabel', 'Customer');
  const saleTypeLabel = labelFor(t, 'retailer.shared.saleTypeLabel', 'Sale type');
  const cashierLabel = labelFor(t, 'retailer.shared.cashierLabel', 'Cashier');
  const paymentLabel = labelFor(t, 'purchaseReceive.paymentMethodLabel', 'Payment');
  const subtotalLabel = labelFor(t, 'retailer.shared.subtotal', 'Subtotal');
  const discountLabel = labelFor(t, 'retailer.shared.discountLabel', 'Discount');
  const loyaltyRedeemLabel = labelFor(t, 'retailer.shared.loyaltyRedeemAmount', 'Loyalty Redeem');
  const taxLabel = labelFor(t, 'retailer.shared.taxAmountLabel', 'Tax');
  const totalLabel = labelFor(t, 'retailer.shared.totalAmount', 'Total');
  const loyaltyEarnedLabel = labelFor(t, 'retailer.shared.loyaltyPointsEarned', 'Loyalty Earned');
  const paidLabel = labelFor(t, 'retailer.shared.paidAmountLabel', 'Paid');
  const dueLabel = labelFor(t, 'retailer.shared.dueAmount', 'Due');
  const noteLabel = labelFor(t, 'purchaseReceive.noteLabel', 'Note');
  const receiptThankYou = labelFor(t, 'retailer.shared.receiptThankYou', 'Thank you for your purchase.');
  const receiptKeepForRecords = labelFor(t, 'retailer.shared.receiptKeepForRecords', 'Please keep this receipt for records.');

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
        ${buildMetaRow(invoiceLabel, invoice?.invoiceNumber)}
        ${buildMetaRow(dateLabel, formatDateTime(invoice?.createdAt || invoice?.invoiceDate, language))}
        ${buildMetaRow(customerLabel, invoice?.customerName || translatedValue(t, `retailer.shared.customerTypes.${invoice?.customerType}`, humanizeCode(invoice?.customerType)))}
        ${buildMetaRow(saleTypeLabel, translatedValue(t, `retailer.shared.saleTypes.${invoice?.saleType}`, humanizeCode(invoice?.saleType)))}
        ${buildMetaRow(cashierLabel, invoice?.createdByName)}
        ${buildMetaRow(paymentLabel, translatedValue(t, `purchaseReceive.paymentMethods.${invoice?.paymentMethod}`, humanizeCode(invoice?.paymentMethod)))}
      </tbody>
    </table>

    <hr class="divider" />

    <table class="items">
      <tbody>
        ${items.map((item) => buildLineItemHtml(item, t, language, invoice?.invoiceDate)).join('')}
      </tbody>
    </table>

    <table class="totals-table">
      <tbody>
        ${buildMoneyRow(subtotalLabel, invoice?.subtotal, language)}
        ${buildMoneyRow(discountLabel, invoice?.discount, language)}
        ${buildOptionalMoneyRow(loyaltyRedeemLabel, invoice?.loyaltyRedeemAmount, language)}
        ${Number(invoice?.taxRate || 0) > 0 ? buildMoneyRow(`${taxLabel} (${formatPercent(invoice.taxRate || 0, language)}%)`, invoice?.taxAmount, language) : ''}
        <tr class="grand">
          <td class="label">${escapeHtml(totalLabel)}</td>
          <td class="value">${escapeHtml(formatLocalizedCurrency(invoice?.totalAmount, language))}</td>
        </tr>
        ${Number(invoice?.loyaltyPointsEarned || 0) > 0 ? buildTextRow(loyaltyEarnedLabel, formatQuantity(invoice?.loyaltyPointsEarned, language)) : ''}
        ${buildMoneyRow(paidLabel, invoice?.paidAmount, language)}
        <tr class="due">
          <td class="label">${escapeHtml(dueLabel)}</td>
          <td class="value">${escapeHtml(formatLocalizedCurrency(invoice?.dueAmount, language))}</td>
        </tr>
      </tbody>
    </table>

    ${invoice?.note ? `<hr class="divider" /><div class="small"><strong>${escapeHtml(noteLabel)}:</strong> ${compactText(invoice.note)}</div>` : ''}

    <div class="footer">
      <div>${escapeHtml(receiptThankYou)}</div>
      <div class="small">${escapeHtml(receiptKeepForRecords)}</div>
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
