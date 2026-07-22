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
  const name = escapeHtml(item?.productName || labelFor(t, 'retailer.shared.itemLabel', 'Item'));
  const brandModel = [item?.brandSnapshot, item?.modelSnapshot].filter(Boolean).join(' / ');
  const quantity = formatQuantity(item?.quantityPieces, language);
  const origPrice = Number(item?.originalSalePrice || 0);
  const actualPrice = Number(item?.actualSalePrice || 0);
  const hasPromo = origPrice > 0 && origPrice > actualPrice;
  const price = hasPromo
    ? `<span style="text-decoration:line-through;color:#9ca3af">${escapeHtml(formatLocalizedCurrency(origPrice, language))}</span> ${escapeHtml(formatLocalizedCurrency(actualPrice, language))}`
    : formatLocalizedCurrency(actualPrice, language);
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
  const qty = Number(item?.quantityPieces || 0);
  const promoSaving = hasPromo ? (origPrice - actualPrice) * qty : 0;

  return `
    <tr>
      <td class="item-name">
        <div class="name">${name}</div>
        ${brandModel ? `<div class="meta">${escapeHtml(brandModel)}</div>` : ''}
        <div class="meta">${quantity} x ${price}${discount > 0 ? ` &middot; ${escapeHtml(discountLabel)} ${formatLocalizedCurrency(discount, language)}` : ''}</div>
        ${hasPromo ? `<div class="meta" style="color:#059669;font-weight:700">&#10022; ${escapeHtml(labelFor(t, 'retailer.shared.promoLabel', 'Promo'))} &middot; ${escapeHtml(labelFor(t, 'retailer.shared.savedLabel', 'saved'))} ${escapeHtml(formatLocalizedCurrency(promoSaving, language))}</div>` : ''}
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
  title = '',
  language = 'en',
  widthMm = 80,
} = {}) {
  const t = createTranslator(language);
  const receiptTitle = title || labelFor(t, 'retailer.shared.receiptTitle', 'Receipt');
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
  const promotionsLabel = labelFor(t, 'retailer.shared.promotionsLabel', 'Promotions');
  const itemDiscountsLabel = labelFor(t, 'retailer.shared.itemDiscountsLabel', 'Item Discounts');
  const businessReceiptLabel = labelFor(t, 'retailer.shared.businessReceiptLabel', 'Business Receipt');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(receiptTitle)}</title>
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
      <div class="business-name">${escapeHtml(businessName || businessReceiptLabel)}</div>
      <div class="small" style="margin-top: 2px; font-weight: 700;">${escapeHtml(receiptTitle)}</div>
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
        ${(() => {
          const promoSavingsTotal = items.reduce((sum, item) => {
            const orig = Number(item?.originalSalePrice || 0);
            const actual = Number(item?.actualSalePrice || 0);
            const qty = Number(item?.quantityPieces || 0);
            return orig > actual ? sum + (orig - actual) * qty : sum;
          }, 0);
          const lineDiscountTotal = items.reduce((sum, item) => sum + Number(item?.lineDiscount || 0), 0);
          const originalSubtotal = Number(invoice?.subtotal || 0) + lineDiscountTotal + promoSavingsTotal;
          const deductRow = (label, value) => value > 0 ? `
            <tr>
              <td class="label">${label}</td>
              <td class="value">- ${escapeHtml(formatLocalizedCurrency(value, language))}</td>
            </tr>` : '';
          return `
            ${buildMoneyRow(subtotalLabel, originalSubtotal, language)}
            ${deductRow(`&#10022; ${escapeHtml(promotionsLabel)}`, promoSavingsTotal)}
            ${deductRow(`- ${escapeHtml(itemDiscountsLabel)}`, lineDiscountTotal)}
            ${deductRow(`- ${escapeHtml(discountLabel)}`, Number(invoice?.discount || 0))}
            ${buildOptionalMoneyRow(loyaltyRedeemLabel, invoice?.loyaltyRedeemAmount, language)}
            ${Number(invoice?.taxRate || 0) > 0 ? buildMoneyRow(`${taxLabel} (${formatPercent(invoice.taxRate || 0, language)}%)`, invoice?.taxAmount, language) : ''}
          `;
        })()}
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

function hasSerialItems(invoice) {
  return (invoice?.items || []).some((item) => (item?.serials || []).length > 0);
}

export function buildInvoiceHtml(invoice, {
  businessName = '',
  businessAddress = '',
  businessPhone = '',
  businessEmail = '',
  language = 'en',
} = {}) {
  const t = createTranslator(language);
  const items = Array.isArray(invoice?.items) ? invoice.items : [];
  const invoiceDate = invoice?.invoiceDate || invoice?.createdAt;

  const serialLabel = labelFor(t, 'retailer.salesInvoices.serialPrintLabel', 'Serial / IMEI');
  const subtotalLabel = labelFor(t, 'retailer.shared.subtotal', 'Subtotal');
  const discountLabel = labelFor(t, 'retailer.shared.discountLabel', 'Discount');
  const taxLabel = labelFor(t, 'retailer.shared.taxAmountLabel', 'Tax');
  const totalLabel = labelFor(t, 'retailer.shared.totalAmount', 'Grand Total');
  const paidLabel = labelFor(t, 'retailer.shared.paidAmountLabel', 'Amount Paid');
  const dueLabel = labelFor(t, 'retailer.shared.dueAmount', 'Balance Due');
  const cashierLabel = labelFor(t, 'retailer.shared.cashierLabel', 'Cashier');
  const noteLabel = labelFor(t, 'purchaseReceive.noteLabel', 'Note');
  const receiptThankYou = labelFor(t, 'retailer.shared.receiptThankYou', 'Thank you for your business.');
  const invoiceTitle = labelFor(t, 'retailer.shared.invoiceTitle', 'Invoice');
  const billToLabel = labelFor(t, 'retailer.shared.billToLabel', 'Bill To');
  const walkInLabel = labelFor(t, 'retailer.shared.customerTypes.WALK_IN', 'Walk-in Customer');
  const productDescriptionLabel = labelFor(t, 'retailer.shared.descriptionLabel', 'Product Description');
  const unitPriceLabel = labelFor(t, 'retailer.shared.unitPriceLabel', 'Unit Price');
  const quantityLabel = labelFor(t, 'retailer.shared.quantityShortLabel', 'Qty');
  const amountLabel = labelFor(t, 'retailer.shared.amountLabel', 'Amount');
  const promotionsLabel = labelFor(t, 'retailer.shared.promotionsLabel', 'Promotions');
  const itemsLabel = labelFor(t, 'retailer.shared.itemsLabel', 'items');
  const authorizedSignatureLabel = labelFor(t, 'retailer.shared.authorizedSignatureLabel', 'Authorised Signature');
  const businessLabel = labelFor(t, 'retailer.shared.businessLabel', 'Business');

  const bizContact = [businessAddress, businessPhone, businessEmail].filter(Boolean).join('&nbsp;&nbsp;|&nbsp;&nbsp;');

  const itemRows = items.map((item, index) => {
    const name = escapeHtml(item?.productName || labelFor(t, 'retailer.shared.itemLabel', 'Item'));
    const brandModel = [item?.brandSnapshot, item?.modelSnapshot].filter(Boolean).join(' / ');
    const serials = (item?.serials || []).map((s) => s?.serialNumber || s?.imei1 || s?.imei2).filter(Boolean);
    const warrantyMonths = Number(item?.warrantyMonthsSnapshot || 0);
    const warrantyEndDate = warrantyMonths > 0 ? addMonthsToDate(invoiceDate, warrantyMonths) : null;
    const warrantyText = warrantyMonths > 0
      ? t('retailer.salesInvoices.warrantyPrintLabel', { months: warrantyMonths, endDate: formatDate(warrantyEndDate, language) })
      : '';
    const origPrice = Number(item?.originalSalePrice || 0);
    const actualPrice = Number(item?.actualSalePrice || 0);
    const hasPromo = origPrice > 0 && origPrice > actualPrice;
    const qty = escapeHtml(formatQuantity(item?.quantityPieces, language));
    const lineTotal = escapeHtml(lineTotalText(item, language));
    const lineDiscount = Number(item?.lineDiscount || 0);
    const promoSavingAmt = hasPromo ? (origPrice - actualPrice) * Number(item?.quantityPieces || 0) : 0;
    const bg = index % 2 === 1 ? ' style="background:#f8fafc"' : '';

    const priceCell = hasPromo
      ? `<div style="font-size:10px;text-decoration:line-through;color:#94a3b8">${escapeHtml(formatLocalizedCurrency(origPrice, language))}</div><div style="font-weight:700;color:#059669">${escapeHtml(formatLocalizedCurrency(actualPrice, language))}</div>`
      : escapeHtml(formatLocalizedCurrency(actualPrice, language));

    return `<tr${bg}>
      <td class="sl">${index + 1}</td>
      <td class="desc">
        <div class="iname">${name}</div>
        ${brandModel ? `<div class="imeta">${escapeHtml(brandModel)}</div>` : ''}
        ${serials.length ? `<div class="iserial">${escapeHtml(serialLabel)}: <strong>${escapeHtml(serials.join(', '))}</strong></div>` : ''}
        ${lineDiscount > 0 ? `<div class="imeta">${escapeHtml(discountLabel)}: ${escapeHtml(formatLocalizedCurrency(lineDiscount, language))}</div>` : ''}
        ${hasPromo ? `<div class="imeta" style="color:#059669;font-weight:700">&#10022; ${escapeHtml(labelFor(t, 'retailer.shared.promoLabel', 'Promo'))} &middot; ${escapeHtml(labelFor(t, 'retailer.shared.savedLabel', 'saved'))} ${escapeHtml(formatLocalizedCurrency(promoSavingAmt, language))}</div>` : ''}
        ${warrantyText ? `<div class="imeta">${escapeHtml(warrantyText)}</div>` : ''}
      </td>
      <td class="al-r muted">${priceCell}</td>
      <td class="al-r muted">${qty}</td>
      <td class="al-r bold">${lineTotal}</td>
    </tr>`;
  }).join('');

  const promoSavingsTotal = items.reduce((sum, item) => {
    const orig = Number(item?.originalSalePrice || 0);
    const actual = Number(item?.actualSalePrice || 0);
    const qty2 = Number(item?.quantityPieces || 0);
    return orig > actual ? sum + (orig - actual) * qty2 : sum;
  }, 0);
  const lineDiscountTotal = items.reduce((sum, item) => sum + Number(item?.lineDiscount || 0), 0);
  const originalSubtotal = Number(invoice?.subtotal || 0) + lineDiscountTotal + promoSavingsTotal;

  const promoSavingsRow = promoSavingsTotal > 0
    ? `<tr><td class="tl" style="color:#059669">&#10022; ${escapeHtml(promotionsLabel)}</td><td class="tr" style="color:#059669">&minus; ${escapeHtml(formatLocalizedCurrency(promoSavingsTotal, language))}</td></tr>` : '';
  const lineDiscountRow = lineDiscountTotal > 0
    ? `<tr><td class="tl">- ${escapeHtml(discountLabel)} (${escapeHtml(itemsLabel)})</td><td class="tr">&minus; ${escapeHtml(formatLocalizedCurrency(lineDiscountTotal, language))}</td></tr>` : '';
  const discountRow = Number(invoice?.discount || 0) > 0
    ? `<tr><td class="tl">- ${escapeHtml(discountLabel)}</td><td class="tr">&minus; ${escapeHtml(formatLocalizedCurrency(invoice.discount, language))}</td></tr>` : '';
  const taxRow = Number(invoice?.taxRate || 0) > 0
    ? `<tr><td class="tl">${escapeHtml(taxLabel)} (${escapeHtml(formatPercent(invoice.taxRate, language))}%)</td><td class="tr">${escapeHtml(formatLocalizedCurrency(invoice.taxAmount, language))}</td></tr>` : '';
  const dueRow = Number(invoice?.dueAmount || 0) > 0
    ? `<tr class="due-row"><td class="tl">${escapeHtml(dueLabel)}</td><td class="tr">${escapeHtml(formatLocalizedCurrency(invoice.dueAmount, language))}</td></tr>` : '';

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(invoiceTitle)} #${escapeHtml(String(invoice?.invoiceNumber || ''))}</title>
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
@page { size: A4; margin: 0; }
body {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 13px;
  color: #1e293b;
  background: #fff;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.page { width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff; }

/* ── Header band ── */
.hdr { background: #0f172a; padding: 28px 32px; }
.hdr-tbl { width: 100%; border-collapse: collapse; }
.hdr-tbl td { vertical-align: middle; }
.biz-name { font-size: 22px; font-weight: 900; color: #fff; line-height: 1.2; }
.biz-contact { font-size: 10px; color: #94a3b8; margin-top: 6px; line-height: 1.7; }
.inv-heading { font-size: 38px; font-weight: 900; color: #fff; text-align: right; letter-spacing: 0.06em; line-height: 1; }
.inv-num { font-size: 12px; color: #94a3b8; text-align: right; margin-top: 5px; font-weight: 600; }

/* ── Info band ── */
.info { background: #f1f5f9; padding: 18px 32px; border-bottom: 2px solid #e2e8f0; }
.info-tbl { width: 100%; border-collapse: collapse; }
.info-tbl td { vertical-align: top; }
.lbl { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.14em; color: #64748b; margin-bottom: 5px; }
.cust-name { font-size: 17px; font-weight: 900; color: #0f172a; }
.cust-sub { font-size: 11px; color: #64748b; margin-top: 3px; }
.due-lbl { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.14em; color: #64748b; margin-bottom: 5px; text-align: right; }
.due-amt { font-size: 26px; font-weight: 900; color: #0f172a; text-align: right; }
.due-sub { font-size: 11px; color: #64748b; text-align: right; margin-top: 3px; }

/* ── Items ── */
.items-wrap { padding: 0 32px; }
.itbl { width: 100%; border-collapse: collapse; margin-top: 22px; }
.itbl thead tr { background: #0f172a; }
.itbl thead th {
  padding: 9px 10px;
  font-size: 10px; font-weight: 700; color: #fff;
  text-align: left; text-transform: uppercase; letter-spacing: 0.07em;
}
.itbl thead th.al-r { text-align: right; }
.itbl tbody td { padding: 10px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
.sl { color: #94a3b8; font-weight: 700; width: 28px; font-size: 12px; }
.desc { }
.iname { font-weight: 700; color: #0f172a; font-size: 13px; }
.imeta { font-size: 10px; color: #64748b; margin-top: 3px; }
.iserial { font-size: 10px; color: #334155; margin-top: 3px; font-weight: 700; }
.al-r { text-align: right; white-space: nowrap; }
.muted { color: #475569; }
.bold { font-weight: 700; color: #0f172a; }

/* ── Totals ── */
.totals-wrap { padding: 0 32px; }
.totals-outer { width: 100%; border-collapse: collapse; margin-top: 6px; }
.totals-outer td { vertical-align: top; }
.sp { width: 56%; }
.ttbl { width: 100%; border-collapse: collapse; }
.ttbl tr td { padding: 4px 0; font-size: 13px; }
.tl { color: #64748b; }
.tr { text-align: right; font-weight: 700; color: #0f172a; }
.sep-row td { border-top: 1px solid #e2e8f0; padding-top: 8px; }
.grand-row td { font-size: 15px; font-weight: 900; color: #0f172a; border-top: 2px solid #0f172a; padding-top: 8px; }
.due-row td { font-size: 15px; font-weight: 900; color: #dc2626; padding-top: 6px; }

/* ── Note ── */
.note { padding: 10px 32px 0; font-size: 11px; color: #64748b; }

/* ── Footer ── */
.ftr { padding: 28px 32px 32px; margin-top: 44px; }
.ftr-tbl { width: 100%; border-collapse: collapse; }
.ftr-tbl td { vertical-align: bottom; }
.ty { font-size: 13px; font-weight: 700; color: #0f172a; }
.ty-sub { font-size: 10px; color: #64748b; margin-top: 4px; }
.sig-cell { text-align: right; }
.sig-line { display: inline-block; min-width: 170px; border-top: 1px solid #0f172a; padding-top: 7px; font-size: 11px; font-weight: 600; color: #475569; text-align: center; margin-top: 48px; }
</style>
</head>
<body>
<div class="page">

  <div class="hdr">
    <table class="hdr-tbl"><tr>
      <td>
        <div class="biz-name">${escapeHtml(businessName || businessLabel)}</div>
        ${bizContact ? `<div class="biz-contact">${bizContact}</div>` : ''}
      </td>
      <td>
        <div class="inv-heading">${escapeHtml(invoiceTitle)}</div>
        ${invoice?.invoiceNumber ? `<div class="inv-num"># ${escapeHtml(String(invoice.invoiceNumber))}</div>` : ''}
      </td>
    </tr></table>
  </div>

  <div class="info">
    <table class="info-tbl"><tr>
      <td style="width:58%">
        <div class="lbl">${escapeHtml(billToLabel)}</div>
        <div class="cust-name">${escapeHtml(invoice?.customerName || walkInLabel)}</div>
        ${invoice?.createdByName ? `<div class="cust-sub">${escapeHtml(cashierLabel)}: ${escapeHtml(invoice.createdByName)}</div>` : ''}
      </td>
      <td>
        <div class="due-lbl">${escapeHtml(dueLabel)}</div>
        <div class="due-amt">${escapeHtml(formatLocalizedCurrency(invoice?.dueAmount, language))}</div>
        <div class="due-sub">${escapeHtml(formatDate(invoiceDate, language))}</div>
      </td>
    </tr></table>
  </div>

  <div class="items-wrap">
    <table class="itbl">
      <thead><tr>
        <th>#</th>
        <th>${escapeHtml(productDescriptionLabel)}</th>
        <th class="al-r">${escapeHtml(unitPriceLabel)}</th>
        <th class="al-r">${escapeHtml(quantityLabel)}</th>
        <th class="al-r">${escapeHtml(amountLabel)}</th>
      </tr></thead>
      <tbody>${itemRows}</tbody>
    </table>
  </div>

  <div class="totals-wrap">
    <table class="totals-outer"><tr>
      <td class="sp"></td>
      <td>
        <table class="ttbl">
          <tr><td class="tl">${escapeHtml(subtotalLabel)}</td><td class="tr">${escapeHtml(formatLocalizedCurrency(originalSubtotal, language))}</td></tr>
          ${promoSavingsRow}
          ${lineDiscountRow}
          ${discountRow}
          ${taxRow}
          <tr class="grand-row"><td class="tl">${escapeHtml(totalLabel)}</td><td class="tr">${escapeHtml(formatLocalizedCurrency(invoice?.totalAmount, language))}</td></tr>
          <tr><td class="tl">${escapeHtml(paidLabel)}</td><td class="tr">${escapeHtml(formatLocalizedCurrency(invoice?.paidAmount, language))}</td></tr>
          ${dueRow}
        </table>
      </td>
    </tr></table>
  </div>

  ${invoice?.note ? `<div class="note"><strong>${escapeHtml(noteLabel)}:</strong> ${compactText(invoice.note)}</div>` : ''}

  <div class="ftr">
    <table class="ftr-tbl"><tr>
      <td>
        <div class="ty">${escapeHtml(receiptThankYou)}</div>
        <div class="ty-sub">${escapeHtml(labelFor(t, 'retailer.shared.receiptKeepForRecords', 'Please keep this invoice for your records.'))}</div>
      </td>
      <td class="sig-cell">
        <div class="sig-line">${escapeHtml(authorizedSignatureLabel)}</div>
      </td>
    </tr></table>
  </div>

</div>
</body>
</html>`;
}

export async function printRetailReceipt(invoice, options = {}) {
  const {
    receiptWindow: providedWindow = null,
    ...receiptOptions
  } = options;
  const useInvoiceFormat = hasSerialItems(invoice);
  const receiptHtml = useInvoiceFormat
    ? buildInvoiceHtml(invoice, receiptOptions)
    : buildReceiptHtml(invoice, receiptOptions);
  const windowSpec = useInvoiceFormat ? 'width=900,height=1100' : 'width=420,height=760';
  const receiptWindow = providedWindow || window.open('', '_blank', windowSpec);
  if (receiptWindow && useInvoiceFormat) {
    try { receiptWindow.resizeTo(900, 1100); } catch { /* ignore */ }
  }

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
