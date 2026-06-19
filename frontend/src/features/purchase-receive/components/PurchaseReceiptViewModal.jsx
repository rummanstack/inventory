import { Download, Printer } from 'lucide-react';
import { Badge, Modal } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import AuditHistory from '../../../components/AuditHistory.jsx';
import { downloadSheetPdf } from '../../../services/printService.js';
import { inventoryApi } from '../../../services/inventoryApi';
import { formatCasePiece, formatCurrency, formatDate } from '../../../utils/calculations.js';
import { paymentStatusOf, paymentStatusTone } from '../../../models/inventoryViewData.js';
import PurchaseReceiptPrintSheet from './PurchaseReceiptPrintSheet';

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-950">{value || '-'}</p>
    </div>
  );
}

export default function PurchaseReceiptViewModal({ purchaseReceipt, onClose }) {
  const { t } = useInventoryApp();
  const items = purchaseReceipt.items || [];
  const printTargetId = `purchase-receipt-print-${purchaseReceipt.id}`;

  function recordPurchasePrint(label) {
    inventoryApi.recordPrint({ entityType: 'purchase_receipt', entityId: purchaseReceipt.id, label }).catch(() => {});
  }

  return (
    <>
      <Modal title={purchaseReceipt.purchaseNumber} description={t('purchaseReceive.viewDescription')} onClose={onClose} width="max-w-3xl">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('purchaseReceive.supplier')} value={purchaseReceipt.supplierName} />
          <Field label={t('purchaseReceive.date')} value={formatDate(purchaseReceipt.purchaseDate)} />
          <Field label={t('purchaseReceive.supplierInvoiceNo')} value={purchaseReceipt.supplierInvoiceNo} />
          <Field label={t('purchaseReceive.paymentMethodLabel')} value={t(`purchaseReceive.paymentMethods.${purchaseReceipt.paymentMethod}`)} />
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="table-head">
              <tr>
                <th className="px-3 py-2 text-left">{t('products.product')}</th>
                <th className="px-3 py-2 text-right">{t('purchaseReceive.quantityPieces')}</th>
                <th className="px-3 py-2 text-right">{t('purchaseReceive.purchasePriceLabel')}</th>
                <th className="px-3 py-2 text-right">{t('purchaseReceive.lineDiscountLabel')}</th>
                <th className="px-3 py-2 text-right">{t('purchaseReceive.totalAmount')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, index) => (
                <tr key={item.id || index}>
                  <td className="px-3 py-2 font-semibold text-slate-950">{item.productName}</td>
                  <td className="px-3 py-2 text-right">{formatCasePiece(item.quantityPieces, item.piecesPerCase)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(item.purchasePrice)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(item.lineDiscount)}</td>
                  <td className="px-3 py-2 text-right font-bold">{formatCurrency(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-end">
          <div className="w-full max-w-xs space-y-2 text-sm">
          {Number(purchaseReceipt.taxRate || 0) > 0 ? (
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-slate-600">{t('retailer.shared.taxRateLabel')}</span>
              <span className="font-bold text-slate-950">{Number(purchaseReceipt.taxRate || 0).toFixed(2)}%</span>
            </div>
          ) : null}
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-600">{t('purchaseReceive.discountLabel')}</span>
            <span className="font-bold text-rose-700">- {formatCurrency(purchaseReceipt.discount)}</span>
          </div>
          {Number(purchaseReceipt.taxRate || 0) > 0 ? (
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-600">{t('retailer.shared.taxAmountLabel')}</span>
              <span className="font-bold text-slate-950">{formatCurrency(purchaseReceipt.taxAmount)}</span>
            </div>
          ) : null}
            <div className="flex items-center justify-between border-t border-slate-200 pt-2">
              <span className="font-black uppercase tracking-[0.1em] text-slate-700">{t('purchaseReceive.totalAmount')}</span>
              <span className="font-black text-slate-950">{formatCurrency(purchaseReceipt.totalAmount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-600">{t('purchaseReceive.paidAmountLabel')}</span>
              <span className="font-bold text-emerald-700">{formatCurrency(purchaseReceipt.paidAmount)}</span>
            </div>
            <div className="flex items-center justify-between border-t-2 border-slate-300 pt-2">
              <span className="text-base font-black uppercase tracking-[0.1em] text-slate-950">{t('purchaseReceive.dueAmount')}</span>
              <span className="text-lg font-black"><Badge tone={paymentStatusTone(paymentStatusOf(purchaseReceipt))}>{formatCurrency(purchaseReceipt.dueAmount)}</Badge></span>
            </div>
          </div>
        </div>

        {purchaseReceipt.note ? (
          <div className="mt-4 border-t border-slate-200 pt-3 text-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{t('purchaseReceive.noteLabel')}</p>
            <p className="mt-1 text-slate-700">{purchaseReceipt.note}</p>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => { recordPurchasePrint('pdf'); downloadSheetPdf(printTargetId, `purchase-${purchaseReceipt.purchaseNumber}.pdf`); }}
          >
            <Download size={18} />
            {t('purchaseReceive.downloadPdf')}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => { recordPurchasePrint('print'); window.print(); }}
          >
            <Printer size={18} />
            {t('purchaseReceive.printSheet')}
          </button>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-4">
          <AuditHistory entityType="purchase_receipt" entityId={purchaseReceipt.id} />
        </div>
      </Modal>

      <div className="hidden print:block">
        <PurchaseReceiptPrintSheet purchaseReceipt={purchaseReceipt} printTarget targetId={printTargetId} />
      </div>
    </>
  );
}
