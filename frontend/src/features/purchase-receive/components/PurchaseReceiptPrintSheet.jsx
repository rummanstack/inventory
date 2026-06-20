import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { cx } from '../../../components/ui.jsx';
import { formatCasePiece, formatCurrency, formatDate } from '../../../utils/calculations.js';

export default function PurchaseReceiptPrintSheet({ purchaseReceipt, printTarget = false, targetId }) {
  const { t, tenant, language } = useInventoryApp();
  if (!purchaseReceipt) return null;

  const items = purchaseReceipt.items || [];

  return (
    <div id={targetId} className={cx('mx-auto w-full max-w-[210mm] rounded-xl border border-slate-200 bg-white p-6 shadow-soft', printTarget && 'print-target')}>
      <div className="border-b-2 border-slate-950 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-normal text-slate-950">{tenant?.name}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">{t('purchaseReceive.printableTitle')}</p>
          </div>
          <div className="rounded-lg border border-slate-300 px-4 py-3 text-sm">
            <p className="font-bold text-slate-950">{t('purchaseReceive.purchaseNumber')}: {purchaseReceipt.purchaseNumber}</p>
            <p className="mt-1 text-slate-600">{t('purchaseReceive.date')}: {formatDate(purchaseReceipt.purchaseDate, language)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 border-b border-slate-200 py-4 text-sm sm:grid-cols-3">
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">{t('purchaseReceive.supplier')}</p>
          <p className="mt-1 font-semibold text-slate-950">{purchaseReceipt.supplierName || '-'}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">{t('purchaseReceive.supplierInvoiceNo')}</p>
          <p className="mt-1 font-semibold text-slate-950">{purchaseReceipt.supplierInvoiceNo || '-'}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">{t('purchaseReceive.paymentMethodLabel')}</p>
          <p className="mt-1 font-semibold text-slate-950">{t(`purchaseReceive.paymentMethods.${purchaseReceipt.paymentMethod}`)}</p>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-center align-middle text-[11px]">
          <thead>
            <tr className="bg-slate-950 text-white">
              <th className="border border-slate-800 px-1.5 py-1 align-middle">{t('common.sl')}</th>
              <th className="border border-slate-800 px-1.5 py-1 align-middle">{t('products.product')}</th>
              <th className="border border-slate-800 px-1.5 py-1 align-middle">{t('purchaseReceive.quantityPieces')}</th>
              <th className="border border-slate-800 px-1.5 py-1 align-middle">{t('purchaseReceive.purchasePriceLabel')}</th>
              <th className="border border-slate-800 px-1.5 py-1 align-middle">{t('purchaseReceive.lineDiscountLabel')}</th>
              <th className="border border-slate-800 px-1.5 py-1 align-middle">{t('purchaseReceive.totalAmount')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id || index} className="print-break-inside-avoid">
                <td className="border border-slate-300 px-1.5 py-1 align-middle font-semibold">{index + 1}</td>
                <td className="border border-slate-300 px-1.5 py-1 align-middle font-semibold text-slate-950">{item.productName}</td>
                <td className="border border-slate-300 px-1.5 py-1 align-middle">{formatCasePiece(item.quantityPieces, item.piecesPerCase, language)}</td>
                <td className="border border-slate-300 px-1.5 py-1 align-middle">{formatCurrency(item.purchasePrice, language)}</td>
                <td className="border border-slate-300 px-1.5 py-1 align-middle">{formatCurrency(item.lineDiscount, language)}</td>
                <td className="border border-slate-300 px-1.5 py-1 align-middle font-bold">{formatCurrency(item.lineTotal, language)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex justify-end">
        <div className="w-full max-w-xs space-y-2 text-sm">
          {Number(purchaseReceipt.taxRate || 0) > 0 ? (
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-600">{t('retailer.shared.taxRateLabel')}</span>
              <span className="font-bold text-slate-950">{Number(purchaseReceipt.taxRate || 0).toFixed(2)}%</span>
            </div>
          ) : null}
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-600">{t('purchaseReceive.discountLabel')}</span>
            <span className="font-bold text-rose-700">- {formatCurrency(purchaseReceipt.discount, language)}</span>
          </div>
          {Number(purchaseReceipt.taxRate || 0) > 0 ? (
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-600">{t('retailer.shared.taxAmountLabel')}</span>
              <span className="font-bold text-slate-950">{formatCurrency(purchaseReceipt.taxAmount, language)}</span>
            </div>
          ) : null}
          <div className="flex items-center justify-between border-t border-slate-200 pt-2">
            <span className="font-black uppercase tracking-[0.1em] text-slate-700">{t('purchaseReceive.totalAmount')}</span>
            <span className="font-black text-slate-950">{formatCurrency(purchaseReceipt.totalAmount, language)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-600">{t('purchaseReceive.paidAmountLabel')}</span>
            <span className="font-bold text-emerald-700">{formatCurrency(purchaseReceipt.paidAmount, language)}</span>
          </div>
          <div className="flex items-center justify-between border-t-2 border-slate-300 pt-2">
            <span className="text-base font-black uppercase tracking-[0.1em] text-slate-950">{t('purchaseReceive.dueAmount')}</span>
            <span className="text-lg font-black text-rose-700">{formatCurrency(purchaseReceipt.dueAmount, language)}</span>
          </div>
        </div>
      </div>

      {purchaseReceipt.note ? (
        <div className="mt-4 border-t border-slate-200 pt-3 text-sm">
          <p className="text-xs font-bold uppercase text-slate-500">{t('purchaseReceive.noteLabel')}</p>
          <p className="mt-1 text-slate-700">{purchaseReceipt.note}</p>
        </div>
      ) : null}

      <div className="mt-12 flex justify-between text-sm font-semibold text-slate-950">
        <div className="w-36">
          <div className="border-t border-slate-900 pt-2">{t('purchaseReceive.receivedBy')}</div>
        </div>
        <div className="w-36">
          <div className="border-t border-slate-900 pt-2 text-right">{t('purchaseReceive.authorizedSignature')}</div>
        </div>
      </div>
    </div>
  );
}
