import { Fragment } from 'react';
import { formatCurrency, formatDate } from '../../../../utils/calculations.js';
import { cx } from '../../../../components/ui.jsx';

function addMonthsToDate(isoDate, months) {
  if (!isoDate || !Number(months || 0)) {
    return null;
  }
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + Number(months || 0));
  return date.toISOString().slice(0, 10);
}

export default function SalesInvoicePrintSheet({ invoice, businessName, printTarget = false, targetId, t, language = 'en' }) {
  const items = invoice?.items || [];
  const customerType = t(`retailer.shared.customerTypes.${invoice?.customerType}`) || invoice?.customerType;
  const saleType = t(`retailer.shared.saleTypes.${invoice?.saleType}`) || invoice?.saleType;
  const noteLabel = t('purchaseReceive.noteLabel');
  const customerName = invoice?.customerNameSnapshot || invoice?.customerName || t('retailer.shared.customerTypes.WALK_IN');
  const customerPhone = invoice?.customerPhoneSnapshot || '';
  const paymentMethodLabel = invoice?.paymentMethod ? t(`purchaseReceive.paymentMethods.${invoice.paymentMethod}`) : '';

  return (
    <div id={targetId} className={cx('mx-auto w-full max-w-[210mm] bg-white p-8', printTarget && 'print-target')}>
      <div className="border-b-2 border-slate-950 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">{businessName}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">{t('retailer.salesInvoices.title')}</p>
          </div>
          <div className="text-right text-sm">
            <p className="text-lg font-black text-slate-950">{invoice?.invoiceNumber}</p>
            <p className="mt-1 text-slate-500">{t('retailer.shared.invoiceDateLabel')}: {formatDate(invoice?.invoiceDate, language)}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4 border-b border-slate-200 pb-4 text-[11px]">
        <div>
          <p className="font-bold uppercase text-slate-400">{t('retailer.shared.customerLabel')}</p>
          <p className="mt-1 font-semibold text-slate-950">{customerName}</p>
          {customerPhone ? <p className="mt-0.5 text-slate-500">{customerPhone}</p> : null}
        </div>
        <div>
          <p className="font-bold uppercase text-slate-400">{t('retailer.shared.customerTypeLabel')}</p>
          <p className="mt-1 font-semibold text-slate-950">{customerType}</p>
        </div>
        <div>
          <p className="font-bold uppercase text-slate-400">{t('retailer.shared.saleTypeLabel')}</p>
          <p className="mt-1 font-semibold text-slate-950">{saleType}</p>
        </div>
        {paymentMethodLabel ? (
          <div>
            <p className="font-bold uppercase text-slate-400">{t('purchaseReceive.paymentMethodLabel')}</p>
            <p className="mt-1 font-semibold text-slate-950">{paymentMethodLabel}</p>
          </div>
        ) : null}
      </div>

      <table className="mt-4 w-full border-collapse text-[10px]">
        <thead>
            <tr className="bg-slate-950 text-white">
            <th className="border border-slate-800 px-2 py-1.5 text-left">{t('products.product')}</th>
            <th className="border border-slate-800 px-2 py-1.5 text-right">{t('retailer.shared.quantityLabel')}</th>
            <th className="border border-slate-800 px-2 py-1.5 text-right">{t('retailer.shared.priceLabel')}</th>
            <th className="border border-slate-800 px-2 py-1.5 text-right">{t('retailer.shared.lineDiscountLabel')}</th>
            <th className="border border-slate-800 px-2 py-1.5 text-right">{t('retailer.shared.totalAmount')}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => {
            const brandModel = [item.brandSnapshot, item.modelSnapshot].filter(Boolean).join(' / ');
            const serials = (item.serials || []).map((serial) => serial.serialNumber || serial.imei1 || serial.imei2).filter(Boolean);
            const warrantyMonths = Number(item.warrantyMonthsSnapshot || 0);
            const warrantyEndDate = warrantyMonths > 0 ? addMonthsToDate(invoice?.invoiceDate, warrantyMonths) : null;
            const hasElectronicsDetail = serials.length > 0 || warrantyMonths > 0;

            return (
              <Fragment key={item.id || i}>
                <tr className="print-break-inside-avoid">
                  <td className="border border-slate-200 px-2 py-1.5 font-semibold text-slate-950">
                    {item.productName}
                    {brandModel ? <span className="block text-[9px] font-medium text-slate-500">{brandModel}</span> : null}
                  </td>
                  <td className="border border-slate-200 px-2 py-1.5 text-right">{Number(item.quantityPieces || 0).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-GB')}</td>
                  <td className="border border-slate-200 px-2 py-1.5 text-right">{formatCurrency(item.actualSalePrice, language)}</td>
                  <td className="border border-slate-200 px-2 py-1.5 text-right">{formatCurrency(item.lineDiscount, language)}</td>
                  <td className="border border-slate-200 px-2 py-1.5 text-right font-bold">{formatCurrency(item.lineTotal, language)}</td>
                </tr>
                {hasElectronicsDetail ? (
                  <tr className="print-break-inside-avoid">
                    <td colSpan={5} className="border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] text-slate-600">
                      {serials.length ? (
                        <span className="mr-3">{t('retailer.salesInvoices.serialPrintLabel')}: {serials.join(', ')}</span>
                      ) : null}
                      {warrantyMonths > 0 ? (
                        <span>
                          {t('retailer.salesInvoices.warrantyPrintLabel', {
                            months: warrantyMonths,
                            endDate: formatDate(warrantyEndDate, language),
                          })}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>

      <div className="mt-4 flex justify-end">
        <div className="w-56 space-y-1.5 text-[11px]">
          <div className="flex justify-between">
            <span className="text-slate-500">{t('retailer.shared.subtotal')}</span>
            <span className="font-semibold">{formatCurrency(invoice?.subtotal, language)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">{t('retailer.shared.discountLabel')}</span>
            <span className="font-semibold text-rose-700">- {formatCurrency(invoice?.discount, language)}</span>
          </div>
          {Number(invoice?.loyaltyRedeemAmount || 0) > 0 ? (
            <div className="flex justify-between">
              <span className="text-slate-500">{t('retailer.shared.loyaltyRedeemAmount')}</span>
              <span className="font-semibold text-rose-700">- {formatCurrency(invoice?.loyaltyRedeemAmount, language)}</span>
            </div>
          ) : null}
          {Number(invoice?.taxRate || 0) > 0 ? (
            <div className="flex justify-between">
              <span className="text-slate-500">{t('retailer.shared.taxAmountLabel')} ({Number(invoice.taxRate || 0).toFixed(2)}%)</span>
              <span className="font-semibold">{formatCurrency(invoice?.taxAmount, language)}</span>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-slate-300 pt-1 font-bold text-slate-950">
            <span>{t('retailer.shared.totalAmount')}</span>
            <span>{formatCurrency(invoice?.totalAmount, language)}</span>
          </div>
          {Number(invoice?.loyaltyPointsEarned || 0) > 0 ? (
            <div className="flex justify-between">
              <span className="text-slate-500">{t('retailer.shared.loyaltyPointsEarned')}</span>
              <span className="font-semibold text-emerald-700">{Number(invoice?.loyaltyPointsEarned || 0).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-GB')}</span>
            </div>
          ) : null}
          <div className="flex justify-between">
            <span className="text-slate-500">{t('retailer.shared.paidAmountLabel')}</span>
            <span className="font-semibold text-emerald-700">{formatCurrency(invoice?.paidAmount, language)}</span>
          </div>
          <div className="flex justify-between border-t-2 border-slate-800 pt-1.5 text-[12px] font-black text-slate-950">
            <span>{t('retailer.shared.dueAmount')}</span>
            <span>{formatCurrency(invoice?.dueAmount, language)}</span>
          </div>
        </div>
      </div>

      {invoice?.note ? (
        <div className="mt-4 border-t border-slate-200 pt-3 text-[11px]">
          <p className="font-bold uppercase text-slate-400">{noteLabel}</p>
          <p className="mt-1 text-slate-700">{invoice.note}</p>
        </div>
      ) : null}

      <div className="mt-12 flex justify-between text-[11px] font-semibold text-slate-950">
        <div className="w-36"><div className="border-t border-slate-900 pt-2">{t('retailer.shared.receiptCustomerSignature')}</div></div>
        <div className="w-36"><div className="border-t border-slate-900 pt-2 text-right">{t('retailer.shared.receiptAuthorizedBy')}</div></div>
      </div>
    </div>
  );
}
