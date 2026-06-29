import { Fragment } from 'react';
import { formatCurrency, formatDate } from '../../../../utils/calculations.js';
import { cx } from '../../../../components/ui.jsx';

function addMonthsToDate(isoDate, months) {
  if (!isoDate || !Number(months || 0)) return null;
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + Number(months || 0));
  return date.toISOString().slice(0, 10);
}

export default function SalesInvoicePrintSheet({
  invoice, businessName, businessAddress = '', businessPhone = '', businessEmail = '',
  printTarget = false, targetId, t, language = 'en',
}) {
  const items = invoice?.items || [];
  const lang = language;

  const customerName = invoice?.customerNameSnapshot || invoice?.customerName || t('retailer.shared.customerTypes.WALK_IN');
  const customerPhone = invoice?.customerPhoneSnapshot || '';
  const paymentMethodLabel = invoice?.paymentMethod ? t(`purchaseReceive.paymentMethods.${invoice.paymentMethod}`) : '';
  const saleTypeLabel = t(`retailer.shared.saleTypes.${invoice?.saleType}`) || invoice?.saleType;

  // Computed totals for smart display
  const hasAnyLineDiscount = items.some((item) => Number(item.lineDiscount || 0) > 0);
  const hasAnyPromo = items.some((item) => {
    const orig = Number(item.originalSalePrice || 0);
    return orig > 0 && orig > Number(item.actualSalePrice || 0);
  });
  const totalPromoSavings = items.reduce((sum, item) => {
    const orig = Number(item.originalSalePrice || 0);
    const actual = Number(item.actualSalePrice || 0);
    const qty = Number(item.quantityPieces || 0);
    return orig > actual ? sum + (orig - actual) * qty : sum;
  }, 0);
  const lineDiscountTotal = items.reduce((sum, item) => sum + Number(item.lineDiscount || 0), 0);
  const originalSubtotal = Number(invoice?.subtotal || 0) + lineDiscountTotal + totalPromoSavings;

  const showDiscount = Number(invoice?.discount || 0) > 0;
  const showTax = Number(invoice?.taxRate || 0) > 0;
  const showLoyaltyRedeem = Number(invoice?.loyaltyRedeemAmount || 0) > 0;
  const showLoyaltyEarned = Number(invoice?.loyaltyPointsEarned || 0) > 0;
  const dueAmount = Number(invoice?.dueAmount || 0);

  return (
    <div
      id={targetId}
      className={cx('mx-auto w-full max-w-[210mm] bg-white font-sans', printTarget && 'print-target')}
      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      {/* ── Header ── */}
      <div className="bg-slate-900 px-8 py-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-black tracking-tight text-white">{businessName}</h1>
            {businessAddress && <p className="mt-1 text-[10px] text-slate-400">{businessAddress}</p>}
            {(businessPhone || businessEmail) && (
              <p className="mt-0.5 text-[10px] text-slate-400">
                {[businessPhone, businessEmail].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              {t('retailer.salesInvoices.title')}
            </p>
            <p className="mt-1 text-2xl font-black text-white">{invoice?.invoiceNumber}</p>
            <p className="mt-1 text-[11px] text-slate-400">{formatDate(invoice?.invoiceDate, lang)}</p>
          </div>
        </div>
      </div>

      {/* ── Bill To + Info strip ── */}
      <div className="border-b border-slate-200 bg-slate-50 px-8 py-4">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">Bill To</p>
            <p className="mt-1 text-base font-black text-slate-900">{customerName}</p>
            {customerPhone && <p className="mt-0.5 text-[11px] text-slate-500">{customerPhone}</p>}
          </div>
          <div className="flex gap-8 text-right text-[11px]">
            {paymentMethodLabel && (
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">{t('purchaseReceive.paymentMethodLabel')}</p>
                <p className="mt-1 font-semibold text-slate-800">{paymentMethodLabel}</p>
              </div>
            )}
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">{t('retailer.shared.saleTypeLabel')}</p>
              <p className="mt-1 font-semibold text-slate-800">{saleTypeLabel}</p>
            </div>
            {invoice?.createdByName && (
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">{t('retailer.shared.cashierLabel')}</p>
                <p className="mt-1 font-semibold text-slate-800">{invoice.createdByName}</p>
              </div>
            )}
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">Balance Due</p>
              <p className={`mt-1 text-base font-black ${dueAmount > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                {formatCurrency(dueAmount, lang)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Items table ── */}
      <div className="px-8 py-4">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-slate-900 text-white">
              <th className="w-6 px-2 py-2 text-left font-black uppercase tracking-wide">#</th>
              <th className="px-2 py-2 text-left font-black uppercase tracking-wide">Description</th>
              <th className="w-12 px-2 py-2 text-right font-black uppercase tracking-wide">Qty</th>
              <th className="w-24 px-2 py-2 text-right font-black uppercase tracking-wide">Unit Price</th>
              {hasAnyLineDiscount && (
                <th className="w-20 px-2 py-2 text-right font-black uppercase tracking-wide">Discount</th>
              )}
              <th className="w-24 px-2 py-2 text-right font-black uppercase tracking-wide">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const brandModel = [item.brandSnapshot, item.modelSnapshot].filter(Boolean).join(' / ');
              const serials = (item.serials || []).map((s) => s.serialNumber || s.imei1 || s.imei2).filter(Boolean);
              const warrantyMonths = Number(item.warrantyMonthsSnapshot || 0);
              const warrantyEndDate = warrantyMonths > 0 ? addMonthsToDate(invoice?.invoiceDate, warrantyMonths) : null;
              const origPrice = Number(item.originalSalePrice || 0);
              const actualPrice = Number(item.actualSalePrice || 0);
              const hasPromo = origPrice > 0 && origPrice > actualPrice;
              const promoSavingAmt = hasPromo ? (origPrice - actualPrice) * Number(item.quantityPieces || 0) : 0;
              const bg = i % 2 === 1 ? 'bg-slate-50' : 'bg-white';

              return (
                <Fragment key={item.id || i}>
                  <tr className={`print-break-inside-avoid ${bg}`}>
                    <td className="border-b border-slate-100 px-2 py-2.5 text-slate-400">{i + 1}</td>
                    <td className="border-b border-slate-100 px-2 py-2.5">
                      <span className="block font-bold text-slate-900">{item.productName}</span>
                      {brandModel && <span className="block text-[9px] text-slate-500">{brandModel}</span>}
                      {serials.length > 0 && (
                        <span className="block text-[9px] text-slate-600">
                          {t('retailer.salesInvoices.serialPrintLabel')}: <strong>{serials.join(', ')}</strong>
                        </span>
                      )}
                      {warrantyMonths > 0 && (
                        <span className="block text-[9px] text-slate-500">
                          {t('retailer.salesInvoices.warrantyPrintLabel', {
                            months: warrantyMonths,
                            endDate: formatDate(warrantyEndDate, lang),
                          })}
                        </span>
                      )}
                      {hasPromo && (
                        <span className="mt-0.5 inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-black text-emerald-700">
                          ✦ Promo · saved {formatCurrency(promoSavingAmt, lang)}
                        </span>
                      )}
                    </td>
                    <td className="border-b border-slate-100 px-2 py-2.5 text-right text-slate-700">
                      {Number(item.quantityPieces || 0).toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-GB')}
                    </td>
                    <td className="border-b border-slate-100 px-2 py-2.5 text-right">
                      {hasPromo && (
                        <span className="block text-[9px] text-slate-400 line-through">
                          {formatCurrency(origPrice, lang)}
                        </span>
                      )}
                      <span className={`block font-semibold ${hasPromo ? 'text-emerald-700' : 'text-slate-800'}`}>
                        {formatCurrency(actualPrice, lang)}
                      </span>
                    </td>
                    {hasAnyLineDiscount && (
                      <td className="border-b border-slate-100 px-2 py-2.5 text-right text-slate-600">
                        {Number(item.lineDiscount || 0) > 0 ? formatCurrency(item.lineDiscount, lang) : '—'}
                      </td>
                    )}
                    <td className="border-b border-slate-100 px-2 py-2.5 text-right font-bold text-slate-900">
                      {formatCurrency(item.lineTotal, lang)}
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Totals ── */}
      <div className="px-8 pb-4">
        <div className="flex justify-end">
          <div className="w-64 space-y-1 text-[11px]">
            {/* Original subtotal */}
            <div className="flex justify-between">
              <span className="text-slate-500">{t('retailer.shared.subtotal')}</span>
              <span className="font-semibold text-slate-900">{formatCurrency(originalSubtotal, lang)}</span>
            </div>

            {/* Promo savings */}
            {hasAnyPromo && totalPromoSavings > 0 && (
              <div className="flex justify-between rounded bg-emerald-50 px-2 py-1 -mx-2">
                <span className="font-semibold text-emerald-700">✦ Promotions</span>
                <span className="font-bold text-emerald-700">− {formatCurrency(totalPromoSavings, lang)}</span>
              </div>
            )}

            {/* Line discounts */}
            {hasAnyLineDiscount && lineDiscountTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">{t('retailer.shared.lineDiscountTotal')}</span>
                <span className="font-semibold text-rose-700">− {formatCurrency(lineDiscountTotal, lang)}</span>
              </div>
            )}

            {/* Manual discount */}
            {showDiscount && (
              <div className="flex justify-between">
                <span className="text-slate-500">{t('retailer.shared.discountLabel')}</span>
                <span className="font-semibold text-rose-700">− {formatCurrency(invoice?.discount, lang)}</span>
              </div>
            )}

            {/* Loyalty redeem */}
            {showLoyaltyRedeem && (
              <div className="flex justify-between">
                <span className="text-slate-500">{t('retailer.shared.loyaltyRedeemAmount')}</span>
                <span className="font-semibold text-rose-700">− {formatCurrency(invoice?.loyaltyRedeemAmount, lang)}</span>
              </div>
            )}

            {/* Tax */}
            {showTax && (
              <div className="flex justify-between">
                <span className="text-slate-500">
                  {t('retailer.shared.taxAmountLabel')} ({Number(invoice?.taxRate || 0).toFixed(2)}%)
                </span>
                <span className="font-semibold text-slate-800">{formatCurrency(invoice?.taxAmount, lang)}</span>
              </div>
            )}

            {/* Grand total */}
            <div className="flex justify-between border-t-2 border-slate-900 pt-2">
              <span className="text-sm font-black uppercase tracking-wide text-slate-900">
                {t('retailer.shared.totalAmount')}
              </span>
              <span className="text-sm font-black text-slate-900">{formatCurrency(invoice?.totalAmount, lang)}</span>
            </div>

            {/* Loyalty earned */}
            {showLoyaltyEarned && (
              <div className="flex justify-between">
                <span className="text-slate-500">{t('retailer.shared.loyaltyPointsEarned')}</span>
                <span className="font-bold text-emerald-700">
                  {Number(invoice?.loyaltyPointsEarned || 0).toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-GB')} pts
                </span>
              </div>
            )}

            {/* Paid */}
            <div className="flex justify-between">
              <span className="text-slate-500">{t('retailer.shared.paidAmountLabel')}</span>
              <span className="font-semibold text-emerald-700">{formatCurrency(invoice?.paidAmount, lang)}</span>
            </div>

            {/* Due */}
            <div className={`flex justify-between rounded px-2 py-1.5 -mx-2 ${dueAmount > 0 ? 'bg-rose-50' : 'bg-emerald-50'}`}>
              <span className={`font-black uppercase tracking-wide text-[11px] ${dueAmount > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                {t('retailer.shared.dueAmount')}
              </span>
              <span className={`font-black text-[13px] ${dueAmount > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                {formatCurrency(dueAmount, lang)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Note ── */}
      {invoice?.note && (
        <div className="mx-8 mb-4 rounded border border-slate-200 bg-slate-50 px-4 py-3 text-[10px]">
          <p className="font-black uppercase tracking-wide text-slate-400">{t('purchaseReceive.noteLabel')}</p>
          <p className="mt-1 text-slate-700">{invoice.note}</p>
        </div>
      )}

      {/* ── Signatures ── */}
      <div className="mx-8 mb-6 flex justify-between pt-2">
        <div className="w-36">
          <div className="border-t border-slate-400 pt-2 text-[10px] font-semibold text-slate-600">
            {t('retailer.shared.receiptCustomerSignature')}
          </div>
        </div>
        <div className="w-36 text-right">
          <div className="border-t border-slate-400 pt-2 text-[10px] font-semibold text-slate-600">
            {t('retailer.shared.receiptAuthorizedBy')}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="border-t border-slate-200 py-4 text-center text-[10px] text-slate-400">
        <p className="font-semibold text-slate-600">
          {businessName}{businessPhone ? ` · ${businessPhone}` : ''}
        </p>
        <p className="mt-0.5">Thank you for your business!</p>
      </div>
    </div>
  );
}
