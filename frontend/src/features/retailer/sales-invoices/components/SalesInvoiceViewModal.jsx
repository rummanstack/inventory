import { Download, Printer } from 'lucide-react';
import { Badge, Modal } from '../../../../components/ui.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import AuditHistory from '../../../../components/AuditHistory.jsx';
import { downloadSheetPdf } from '../../../../services/printService.js';
import { printRetailReceipt } from '../../../../services/receiptService.js';
import { inventoryApi } from '../../../../services/inventoryApi.js';
import { formatCurrency, formatDate } from '../../../../utils/calculations.js';
import { paymentStatusOf, paymentStatusTone } from '../../../../models/inventoryViewData.js';
import SalesInvoicePrintSheet from './SalesInvoicePrintSheet.jsx';

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-950">{value || '-'}</p>
    </div>
  );
}

export default function SalesInvoiceViewModal({ salesInvoice, onClose }) {
  const { t, tenant, pushToast } = useInventoryApp();
  const items = salesInvoice.items || [];
  const printTargetId = `sales-invoice-print-${salesInvoice.id}`;
  const businessName = tenant?.name || '';

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
        <Field label={t('retailer.shared.invoiceDateLabel')} value={formatDate(salesInvoice.invoiceDate)} />
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
            {items.map((item, index) => (
              <tr key={item.id || index}>
                <td className="px-3 py-2 font-semibold text-slate-950">{item.productName}</td>
                <td className="px-3 py-2 text-right">{item.quantityPieces}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(item.actualSalePrice)}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(item.lineDiscount)}</td>
                <td className="px-3 py-2 text-right font-bold">{formatCurrency(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-end">
        <div className="w-full max-w-xs space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-600">{t('retailer.shared.subtotal')}</span>
            <span className="font-bold text-slate-950">{formatCurrency(salesInvoice.subtotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-600">{t('retailer.shared.discountLabel')}</span>
            <span className="font-bold text-rose-700">- {formatCurrency(salesInvoice.discount)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 pt-2">
            <span className="font-black uppercase tracking-[0.1em] text-slate-700">{t('retailer.shared.totalAmount')}</span>
            <span className="font-black text-slate-950">{formatCurrency(salesInvoice.totalAmount)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-600">{t('retailer.shared.paidAmountLabel')}</span>
            <span className="font-bold text-emerald-700">{formatCurrency(salesInvoice.paidAmount)}</span>
          </div>
          <div className="flex items-center justify-between border-t-2 border-slate-300 pt-2">
            <span className="text-base font-black uppercase tracking-[0.1em] text-slate-950">{t('retailer.shared.dueAmount')}</span>
            <span className="text-lg font-black"><Badge tone={paymentStatusTone(paymentStatusOf(salesInvoice))}>{formatCurrency(salesInvoice.dueAmount)}</Badge></span>
          </div>
        </div>
      </div>

      {salesInvoice.note ? (
        <div className="mt-4 border-t border-slate-200 pt-3 text-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{t('purchaseReceive.noteLabel')}</p>
          <p className="mt-1 text-slate-700">{salesInvoice.note}</p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => { recordInvoicePrint('pdf'); downloadSheetPdf(printTargetId, `invoice-${salesInvoice.invoiceNumber}.pdf`); }}
        >
          <Download size={18} />
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

    <div className="hidden print:block">
      <SalesInvoicePrintSheet invoice={salesInvoice} businessName={businessName} printTarget targetId={printTargetId} />
    </div>
    </>
  );
}
