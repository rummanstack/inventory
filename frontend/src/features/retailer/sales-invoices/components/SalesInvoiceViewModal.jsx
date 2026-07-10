import { Fragment } from 'react';
import { Download, Loader2, Printer } from 'lucide-react';
import { Badge, CopyableText, Modal } from '../../../../components/ui.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import AuditHistory from '../../../../components/AuditHistory.jsx';
import { downloadSheetPdf } from '../../../../services/printService.js';
import { printRetailReceipt } from '../../../../services/receiptService.js';
import { inventoryApi } from '../../../../services/inventoryApi.js';
import { formatCurrency, formatDate } from '../../../../utils/calculations.js';
import { paymentStatusOf, paymentStatusTone } from '../../../../models/inventoryViewData.js';
import SalesInvoicePrintSheet from './SalesInvoicePrintSheet.jsx';
import { useAsyncAction } from '../../../../hooks/useAsyncAction.js';

function Field({ label, value, copyValue }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <div className="mt-1"><CopyableText value={copyValue ?? value} copyLabel={label} displayValue={value} textClassName="text-sm font-semibold text-slate-950" /></div>
    </div>
  );
}

function addMonthsToDate(isoDate, months) {
  if (!isoDate || !Number(months || 0)) {
    return null;
  }
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + Number(months || 0));
  return date.toISOString().slice(0, 10);
}

export default function SalesInvoiceViewModal({ salesInvoice, onClose }) {
  const { t, tenant, pushToast, language } = useInventoryApp();
  const items = salesInvoice.items || [];
  const printTargetId = `sales-invoice-print-${salesInvoice.id}`;
  const businessName = tenant?.name || '';
  const [downloadingPdf, downloadPdf] = useAsyncAction();

  function recordInvoicePrint(label) {
    inventoryApi.recordPrint({ entityType: 'sales_invoice', entityId: salesInvoice.id, label }).catch(() => {});
  }

  async function handleReceiptPrint() {
    const result = await printRetailReceipt(salesInvoice, {
      businessName: tenant?.name || '',
      businessAddress: tenant?.address || '',
      businessPhone: tenant?.phone || '',
      businessEmail: tenant?.email || '',
      title: t('retailer.shared.receiptTitle'),
      language,
    });

    if (!result.ok) {
      pushToast('error', t('retailer.shared.printReceiptFailed'), t('alerts.requestFailed'));
      return;
    }

    recordInvoicePrint('receipt');
  }

  return (
    <>
    <Modal title={salesInvoice.invoiceNumber} description={t('retailer.salesInvoices.viewDescription')} onClose={onClose} width="max-w-3xl">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label={t('retailer.shared.invoiceNumberLabel')} value={salesInvoice.invoiceNumber} />
        <Field label="Invoice ID" value={salesInvoice.id} />
        <Field label={t('retailer.shared.invoiceDateLabel')} value={formatDate(salesInvoice.invoiceDate, language)} />
        <Field label={t('retailer.shared.saleTypeLabel')} value={t(`retailer.shared.saleTypes.${salesInvoice.saleType}`)} />
        <Field label={t('retailer.shared.customerTypeLabel')} value={t(`retailer.shared.customerTypes.${salesInvoice.customerType}`)} />
        <Field label={t('retailer.shared.customerLabel')} value={salesInvoice.customerName} />
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-3 py-2 text-left">{t('products.product')}</th>
              <th className="px-3 py-2 text-right">{t('retailer.shared.quantityLabel')}</th>
              <th className="px-3 py-2 text-right">{t('retailer.shared.priceLabel')}</th>
              <th className="px-3 py-2 text-right">{t('retailer.shared.lineDiscountLabel')}</th>
              <th className="px-3 py-2 text-right">{t('retailer.shared.totalAmount')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item, index) => {
              const brandModel = [item.brandSnapshot, item.modelSnapshot].filter(Boolean).join(' / ');
              const serials = (item.serials || []).map((serial) => serial.serialNumber || serial.imei1 || serial.imei2).filter(Boolean);
              const warrantyMonths = Number(item.warrantyMonthsSnapshot || 0);
              const warrantyEndDate = warrantyMonths > 0 ? addMonthsToDate(salesInvoice.invoiceDate, warrantyMonths) : null;
              const hasElectronicsDetail = serials.length > 0 || warrantyMonths > 0;

              return (
                <Fragment key={item.id || index}>
                  <tr>
                    <td className="px-3 py-2 font-semibold text-slate-950">
                      {item.productName}
                      {brandModel ? <span className="block text-xs font-medium text-slate-500">{brandModel}</span> : null}
                    </td>
                    <td className="px-3 py-2 text-right">{Number(item.quantityPieces || 0).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-GB')}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(item.actualSalePrice, language)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(item.lineDiscount, language)}</td>
                    <td className="px-3 py-2 text-right font-bold">{formatCurrency(item.lineTotal, language)}</td>
                  </tr>
                  {hasElectronicsDetail ? (
                    <tr>
                      <td colSpan={5} className="bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
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
      </div>

      <div className="mt-4 flex justify-end">
        <div className="w-full max-w-xs space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-600">{t('retailer.shared.subtotal')}</span>
            <span className="font-bold text-slate-950">{formatCurrency(salesInvoice.subtotal, language)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-600">{t('retailer.shared.discountLabel')}</span>
            <span className="font-bold text-rose-700">- {formatCurrency(salesInvoice.discount, language)}</span>
          </div>
          {Number(salesInvoice.loyaltyRedeemAmount || 0) > 0 ? (
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-600">{t('retailer.shared.loyaltyRedeemAmount')}</span>
              <span className="font-bold text-rose-700">- {formatCurrency(salesInvoice.loyaltyRedeemAmount, language)}</span>
            </div>
          ) : null}
          {Number(salesInvoice.taxRate || 0) > 0 ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-slate-600">{t('retailer.shared.taxRateLabel')}</span>
                <span className="font-bold text-slate-950">{new Intl.NumberFormat(language === 'bn' ? 'bn-BD' : 'en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(salesInvoice.taxRate || 0))}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-600">{t('retailer.shared.taxAmountLabel')}</span>
                <span className="font-bold text-slate-950">{formatCurrency(salesInvoice.taxAmount, language)}</span>
              </div>
            </>
          ) : null}
          <div className="flex items-center justify-between border-t border-slate-200 pt-2">
            <span className="font-semibold uppercase tracking-[0.1em] text-slate-700">{t('retailer.shared.totalAmount')}</span>
            <span className="font-semibold text-slate-950">{formatCurrency(salesInvoice.totalAmount, language)}</span>
          </div>
          {Number(salesInvoice.loyaltyPointsEarned || 0) > 0 ? (
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-600">{t('retailer.shared.loyaltyPointsEarned')}</span>
              <span className="font-bold text-emerald-700">{Number(salesInvoice.loyaltyPointsEarned || 0).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-GB')}</span>
            </div>
          ) : null}
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-600">{t('retailer.shared.paidAmountLabel')}</span>
            <span className="font-bold text-emerald-700">{formatCurrency(salesInvoice.paidAmount, language)}</span>
          </div>
          <div className="flex items-center justify-between border-t-2 border-slate-300 pt-2">
            <span className="text-base font-semibold uppercase tracking-[0.1em] text-slate-950">{t('retailer.shared.dueAmount')}</span>
            <span className="text-lg font-semibold"><Badge tone={paymentStatusTone(paymentStatusOf(salesInvoice))}>{formatCurrency(salesInvoice.dueAmount, language)}</Badge></span>
          </div>
        </div>
      </div>

      {salesInvoice.note ? (
        <div className="mt-4 border-t border-slate-200 pt-3 text-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{t('purchaseReceive.noteLabel')}</p>
          <p className="mt-1 text-slate-700">{salesInvoice.note}</p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => downloadPdf(async () => { recordInvoicePrint('pdf'); await downloadSheetPdf(printTargetId, `invoice-${salesInvoice.invoiceNumber}.pdf`); })}
          disabled={downloadingPdf}
        >
          {downloadingPdf ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
          {t('purchaseReceive.downloadPdf')}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={handleReceiptPrint}
        >
          <Printer size={18} />
          {t('retailer.shared.printReceipt')}
        </button>
      </div>

      <div className="mt-6 border-t border-slate-100 pt-4">
        <AuditHistory entityType="sales_invoice" entityId={salesInvoice.id} />
      </div>
    </Modal>

    <div className="absolute -left-[10000px] top-0">
      <SalesInvoicePrintSheet invoice={salesInvoice} businessName={businessName} businessAddress={tenant?.address || ''} businessPhone={tenant?.phone || ''} businessEmail={tenant?.email || ''} printTarget targetId={printTargetId} t={t} language={language} />
    </div>
    </>
  );
}
