import { formatCasePiece, formatCurrency, formatDate, formatNumber } from '../utils/calculations';
import { cx } from './ui';

export default function PrintableSheet({ sheet, printTarget = false, targetId }) {
  if (!sheet) return null;

  const rows = sheet.items || [];
  const extraReturns = sheet.extraReturns || [];
  const tableRows = [
    ...rows,
    ...extraReturns.map((item) => ({
      ...item,
      isExtraReturn: true,
      issuedPieces: 0,
      soldPieces: 0,
      payable: 0,
      rate: 0,
    })),
  ];
  const totalIssued = rows.reduce((sum, item) => sum + Number(item.issuedPieces || 0), 0);
  const totalReturned = tableRows.reduce((sum, item) => sum + Number(item.returnedPieces || 0), 0);
  const totalSold = rows.reduce((sum, item) => sum + Number(item.soldPieces || 0), 0);

  return (
    <div id={targetId} className={cx('mx-auto w-full max-w-[210mm] rounded-xl border border-slate-200 bg-white p-6 shadow-soft', printTarget && 'print-target')}>
      <div className="border-b-2 border-slate-950 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-normal text-slate-950">{sheet.businessName}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">DSR Delivery and Settlement Sheet</p>
            <p className="mt-1 text-xs text-slate-500">Dealer and distribution inventory control</p>
          </div>
          <div className="rounded-lg border border-slate-300 px-4 py-3 text-sm">
            <p className="font-bold text-slate-950">Date: {formatDate(sheet.date)}</p>
            <p className="mt-1 text-slate-600">Status: {sheet.status}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 border-b border-slate-200 py-4 text-sm sm:grid-cols-3">
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">DSR Name</p>
          <p className="mt-1 font-semibold text-slate-950">{sheet.dsrName || 'Unassigned'}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">Area</p>
          <p className="mt-1 font-semibold text-slate-950">{sheet.area || '-'}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">Phone</p>
          <p className="mt-1 font-semibold text-slate-950">{sheet.phone || '-'}</p>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="bg-slate-950 text-white">
              <th className="border border-slate-800 px-2 py-2">SL</th>
              <th className="border border-slate-800 px-2 py-2">Product</th>
              <th className="border border-slate-800 px-2 py-2">Issued Qty</th>
              <th className="border border-slate-800 px-2 py-2">Returned Qty</th>
              <th className="border border-slate-800 px-2 py-2">Sold Qty</th>
              <th className="border border-slate-800 px-2 py-2 text-right">Rate</th>
              <th className="border border-slate-800 px-2 py-2 text-right">Today Sell</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((item, index) => (
              <tr key={item.id || `${item.productId}-${item.rate}-${index}`} className="print-break-inside-avoid">
                <td className="border border-slate-300 px-2 py-2 font-semibold">{index + 1}</td>
                <td className="border border-slate-300 px-2 py-2 font-semibold text-slate-950">
                  {item.productName}
                  {item.isExtraReturn ? <span className="ml-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">(extra)</span> : null}
                </td>
                <td className="border border-slate-300 px-2 py-2">{formatCasePiece(item.issuedPieces, item.piecesPerCase)}</td>
                <td className="border border-slate-300 px-2 py-2">{formatCasePiece(item.returnedPieces, item.piecesPerCase)}</td>
                <td className="border border-slate-300 px-2 py-2">{formatCasePiece(item.soldPieces, item.piecesPerCase)}</td>
                <td className="border border-slate-300 px-2 py-2 text-right">{formatCurrency(item.rate)}</td>
                <td className="border border-slate-300 px-2 py-2 text-right font-bold">{formatCurrency(item.payable)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-bold text-slate-950">
              <td className="border border-slate-300 px-2 py-2" colSpan="2">
                Total
              </td>
              <td className="border border-slate-300 px-2 py-2">{formatNumber(totalIssued)} pcs</td>
              <td className="border border-slate-300 px-2 py-2">{formatNumber(totalReturned)} pcs</td>
              <td className="border border-slate-300 px-2 py-2">{formatNumber(totalSold)} pcs</td>
              <td className="border border-slate-300 px-2 py-2 text-right">Grand Total</td>
              <td className="border border-slate-300 px-2 py-2 text-right">{formatCurrency(sheet.totalPayable)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-6 flex flex-wrap items-end justify-end gap-x-4 gap-y-2 border-b border-slate-200 pb-3 text-sm">
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase text-slate-500">Previous Due</p>
          <p className="font-bold text-slate-950">{formatCurrency(sheet.previousDue || 0)}</p>
        </div>
        <span className="text-slate-300">|</span>
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase text-slate-500">Today Sell</p>
          <p className="font-bold text-slate-950">{formatCurrency(sheet.totalPayable)}</p>
        </div>
        <span className="text-slate-300">|</span>
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase text-slate-500">Discount</p>
          <p className="font-bold text-slate-950">- {formatCurrency(sheet.discount || 0)}</p>
        </div>
        <span className="text-slate-300">|</span>
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase text-slate-500">Extra Return</p>
          <p className="font-bold text-slate-950">- {formatCurrency(sheet.extraReturnValue || 0)}</p>
        </div>
        <span className="text-slate-300">|</span>
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase text-slate-500">Amount Paid</p>
          <p className="font-bold text-slate-950">{formatCurrency(sheet.amountPaid || 0)}</p>
        </div>
        <span className="text-slate-300">|</span>
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase text-slate-500">Today Due</p>
          <p className="font-bold text-slate-950">{formatCurrency(sheet.todayDue || 0)}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-950" />
        <p className="text-base font-black text-slate-950">Total Due: {formatCurrency(sheet.dueAmount || 0)}</p>
        <div className="h-px flex-1 bg-slate-950" />
      </div>

      <div className="mt-12 flex justify-between text-sm font-semibold text-slate-950">
        <div className="w-36">
          <div className="border-t border-slate-900 pt-2">DSR Signature</div>
        </div>
        <div className="w-36">
          <div className="border-t border-slate-900 pt-2 text-right">Manager Signature</div>
        </div>
      </div>
    </div>
  );
}
