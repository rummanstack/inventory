import { formatCurrency, formatDate } from '../../../../utils/calculations.js';
import { cx } from '../../../../components/ui.jsx';

export default function SalesInvoicePrintSheet({ invoice, businessName, printTarget = false, targetId }) {
  const items = invoice?.items || [];

  return (
    <div id={targetId} className={cx('mx-auto w-full max-w-[210mm] bg-white p-8', printTarget && 'print-target')}>
      <div className="border-b-2 border-slate-950 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">{businessName}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">Sales Invoice</p>
          </div>
          <div className="text-right text-sm">
            <p className="text-lg font-black text-slate-950">{invoice?.invoiceNumber}</p>
            <p className="mt-1 text-slate-500">Date: {formatDate(invoice?.invoiceDate)}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4 border-b border-slate-200 pb-4 text-[11px]">
        <div>
          <p className="font-bold uppercase text-slate-400">Customer</p>
          <p className="mt-1 font-semibold text-slate-950">{invoice?.customerName || 'Walk-in'}</p>
        </div>
        <div>
          <p className="font-bold uppercase text-slate-400">Customer Type</p>
          <p className="mt-1 font-semibold text-slate-950">{invoice?.customerType}</p>
        </div>
        <div>
          <p className="font-bold uppercase text-slate-400">Sale Type</p>
          <p className="mt-1 font-semibold text-slate-950">{invoice?.saleType}</p>
        </div>
      </div>

      <table className="mt-4 w-full border-collapse text-[10px]">
        <thead>
          <tr className="bg-slate-950 text-white">
            <th className="border border-slate-800 px-2 py-1.5 text-left">Product</th>
            <th className="border border-slate-800 px-2 py-1.5 text-right">Qty</th>
            <th className="border border-slate-800 px-2 py-1.5 text-right">Price</th>
            <th className="border border-slate-800 px-2 py-1.5 text-right">Discount</th>
            <th className="border border-slate-800 px-2 py-1.5 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={item.id || i} className="print-break-inside-avoid">
              <td className="border border-slate-200 px-2 py-1.5 font-semibold text-slate-950">{item.productName}</td>
              <td className="border border-slate-200 px-2 py-1.5 text-right">{item.quantityPieces}</td>
              <td className="border border-slate-200 px-2 py-1.5 text-right">{formatCurrency(item.actualSalePrice)}</td>
              <td className="border border-slate-200 px-2 py-1.5 text-right">{formatCurrency(item.lineDiscount)}</td>
              <td className="border border-slate-200 px-2 py-1.5 text-right font-bold">{formatCurrency(item.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex justify-end">
        <div className="w-56 space-y-1.5 text-[11px]">
          <div className="flex justify-between">
            <span className="text-slate-500">Subtotal</span>
            <span className="font-semibold">{formatCurrency(invoice?.subtotal)}</span>
          </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Discount</span>
          <span className="font-semibold text-rose-700">- {formatCurrency(invoice?.discount)}</span>
        </div>
        {Number(invoice?.taxRate || 0) > 0 ? (
          <div className="flex justify-between">
            <span className="text-slate-500">Tax ({Number(invoice.taxRate || 0).toFixed(2)}%)</span>
            <span className="font-semibold">{formatCurrency(invoice?.taxAmount)}</span>
          </div>
        ) : null}
        <div className="flex justify-between border-t border-slate-300 pt-1 font-bold text-slate-950">
          <span>Total</span>
          <span>{formatCurrency(invoice?.totalAmount)}</span>
        </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Paid</span>
            <span className="font-semibold text-emerald-700">{formatCurrency(invoice?.paidAmount)}</span>
          </div>
          <div className="flex justify-between border-t-2 border-slate-800 pt-1.5 text-[12px] font-black text-slate-950">
            <span>Due</span>
            <span>{formatCurrency(invoice?.dueAmount)}</span>
          </div>
        </div>
      </div>

      {invoice?.note ? (
        <div className="mt-4 border-t border-slate-200 pt-3 text-[11px]">
          <p className="font-bold uppercase text-slate-400">Note</p>
          <p className="mt-1 text-slate-700">{invoice.note}</p>
        </div>
      ) : null}

      <div className="mt-12 flex justify-between text-[11px] font-semibold text-slate-950">
        <div className="w-36"><div className="border-t border-slate-900 pt-2">Customer Signature</div></div>
        <div className="w-36"><div className="border-t border-slate-900 pt-2 text-right">Authorized By</div></div>
      </div>
    </div>
  );
}
