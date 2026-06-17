import { formatCurrency, formatDate, formatDateTime } from '../../../../utils/calculations.js';
import { cx } from '../../../../components/ui.jsx';

function typeLabel(type) {
  if (type === 'COLLECTION') return 'Collection';
  if (type === 'SALE_DUE') return 'Sale Due';
  if (type === 'RETURN_ADJUSTMENT') return 'Return';
  if (type === 'MANUAL_ADJUSTMENT') return 'Adjustment';
  return type;
}

export default function CustomerDuePrintSheet({ statement, customerName, businessName, dateFrom, dateTo, printTarget = false, targetId }) {
  const entries = statement ? [...(statement.entries || [])].reverse() : [];

  return (
    <div id={targetId} className={cx('mx-auto w-full max-w-[210mm] bg-white p-8', printTarget && 'print-target')}>
      <div className="border-b-2 border-slate-950 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">{businessName}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">Customer Due Statement</p>
          </div>
          <div className="text-right text-[11px]">
            <p className="font-bold text-slate-950">{customerName}</p>
            {dateFrom && dateTo ? (
              <p className="mt-1 text-slate-500">{formatDate(dateFrom)} – {formatDate(dateTo)}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-3 border-b border-slate-200 pb-4 text-center text-[10px]">
        <div>
          <p className="font-bold uppercase text-slate-400">Opening</p>
          <p className="mt-1 font-black text-slate-950">{formatCurrency(statement?.openingBalance)}</p>
        </div>
        <div>
          <p className="font-bold uppercase text-slate-400">Total Debit</p>
          <p className="mt-1 font-black text-rose-700">{formatCurrency(statement?.totalDebit)}</p>
        </div>
        <div>
          <p className="font-bold uppercase text-slate-400">Total Credit</p>
          <p className="mt-1 font-black text-emerald-700">{formatCurrency(statement?.totalCredit)}</p>
        </div>
        <div>
          <p className="font-bold uppercase text-slate-400">Closing</p>
          <p className="mt-1 font-black text-slate-950">{formatCurrency(statement?.closingBalance)}</p>
        </div>
      </div>

      <table className="mt-4 w-full border-collapse text-[9px]">
        <thead>
          <tr className="bg-slate-950 text-white">
            <th className="border border-slate-800 px-1.5 py-1 text-left">Date</th>
            <th className="border border-slate-800 px-1.5 py-1 text-left">Type</th>
            <th className="border border-slate-800 px-1.5 py-1 text-right">Debit</th>
            <th className="border border-slate-800 px-1.5 py-1 text-right">Credit</th>
            <th className="border border-slate-800 px-1.5 py-1 text-right">Balance</th>
            <th className="border border-slate-800 px-1.5 py-1 text-left">Note</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td className="border border-slate-200 px-1.5 py-1 whitespace-nowrap">{formatDateTime(entry.createdAt)}</td>
              <td className="border border-slate-200 px-1.5 py-1 font-semibold">{typeLabel(entry.type)}</td>
              <td className="border border-slate-200 px-1.5 py-1 text-right font-bold text-rose-700">{entry.debit ? formatCurrency(entry.debit) : '-'}</td>
              <td className="border border-slate-200 px-1.5 py-1 text-right font-bold text-emerald-700">{entry.credit ? formatCurrency(entry.credit) : '-'}</td>
              <td className="border border-slate-200 px-1.5 py-1 text-right font-black">{formatCurrency(entry.balanceAfter)}</td>
              <td className="border border-slate-200 px-1.5 py-1 max-w-[120px] truncate text-slate-500">{entry.note || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-12 flex justify-between text-[10px] font-semibold text-slate-950">
        <div className="w-32"><div className="border-t border-slate-900 pt-2">Customer Signature</div></div>
        <div className="w-32"><div className="border-t border-slate-900 pt-2 text-right">Authorized By</div></div>
      </div>
    </div>
  );
}
