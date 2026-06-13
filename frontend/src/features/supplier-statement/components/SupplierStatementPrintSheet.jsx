import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { cx } from '../../../components/ui.jsx';
import { formatCurrency, formatDate, formatDateTime } from '../../../utils/calculations.js';

export default function SupplierStatementPrintSheet({ statement, printTarget = false, targetId }) {
  const { t, tenant } = useInventoryApp();
  if (!statement) return null;

  const entries = [...(statement.entries || [])].reverse();

  return (
    <div id={targetId} className={cx('mx-auto w-full max-w-[210mm] rounded-xl border border-slate-200 bg-white p-6 shadow-soft', printTarget && 'print-target')}>
      <div className="border-b-2 border-slate-950 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-normal text-slate-950">{tenant?.name}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">{t('supplierStatement.printableTitle')}</p>
          </div>
          <div className="rounded-lg border border-slate-300 px-4 py-3 text-sm">
            <p className="font-bold text-slate-950">{statement.supplier?.name}</p>
            <p className="mt-1 text-slate-600">{formatDate(statement.dateFrom)} - {formatDate(statement.dateTo)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 border-b border-slate-200 py-4 text-sm sm:grid-cols-4">
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">{t('supplierStatement.openingBalance')}</p>
          <p className="mt-1 font-semibold text-slate-950">{formatCurrency(statement.openingBalance)}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">{t('supplierStatement.totalDebit')}</p>
          <p className="mt-1 font-semibold text-rose-700">{formatCurrency(statement.totalDebit)}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">{t('supplierStatement.totalCredit')}</p>
          <p className="mt-1 font-semibold text-emerald-700">{formatCurrency(statement.totalCredit)}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">{t('supplierStatement.closingBalance')}</p>
          <p className="mt-1 font-semibold text-slate-950">{formatCurrency(statement.closingBalance)}</p>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-center align-middle text-[11px]">
          <thead>
            <tr className="bg-slate-950 text-white">
              <th className="border border-slate-800 px-1.5 py-1 align-middle">{t('supplierStatement.when')}</th>
              <th className="border border-slate-800 px-1.5 py-1 align-middle">{t('supplierStatement.type')}</th>
              <th className="border border-slate-800 px-1.5 py-1 align-middle">{t('supplierStatement.debit')}</th>
              <th className="border border-slate-800 px-1.5 py-1 align-middle">{t('supplierStatement.credit')}</th>
              <th className="border border-slate-800 px-1.5 py-1 align-middle">{t('supplierStatement.balanceAfter')}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="print-break-inside-avoid">
                <td className="border border-slate-300 px-1.5 py-1 align-middle">{formatDateTime(entry.createdAt)}</td>
                <td className="border border-slate-300 px-1.5 py-1 align-middle font-semibold text-slate-950">{t(`supplierStatement.types.${entry.type}`)}</td>
                <td className="border border-slate-300 px-1.5 py-1 align-middle">{entry.debit ? formatCurrency(entry.debit) : '-'}</td>
                <td className="border border-slate-300 px-1.5 py-1 align-middle">{entry.credit ? formatCurrency(entry.credit) : '-'}</td>
                <td className="border border-slate-300 px-1.5 py-1 align-middle font-bold">{formatCurrency(entry.balanceAfter)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
