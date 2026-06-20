import { formatCurrency, formatDate, formatDateTime } from '../../../../utils/calculations.js';
import { cx } from '../../../../components/ui.jsx';

function typeLabel(type, t) {
  if (type === 'COLLECTION') return t('retailer.customerDue.types.COLLECTION');
  if (type === 'SALE_DUE') return t('retailer.customerDue.types.SALE_DUE');
  if (type === 'RETURN_ADJUSTMENT') return t('retailer.customerDue.types.RETURN_ADJUSTMENT');
  if (type === 'MANUAL_ADJUSTMENT') return t('retailer.customerDue.types.MANUAL_ADJUSTMENT');
  return type;
}

export default function CustomerDuePrintSheet({ statement, customerName, businessName, dateFrom, dateTo, printTarget = false, targetId, t, language = 'en' }) {
  const entries = statement ? [...(statement.entries || [])].reverse() : [];

  return (
    <div id={targetId} className={cx('mx-auto w-full max-w-[210mm] bg-white p-8', printTarget && 'print-target')}>
      <div className="border-b-2 border-slate-950 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">{businessName}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">{t('retailer.customerDue.printTitle')}</p>
          </div>
          <div className="text-right text-[11px]">
            <p className="font-bold text-slate-950">{customerName}</p>
            {dateFrom && dateTo ? (
              <p className="mt-1 text-slate-500">{formatDate(dateFrom, language)} - {formatDate(dateTo, language)}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-3 border-b border-slate-200 pb-4 text-center text-[10px]">
        <div>
          <p className="font-bold uppercase text-slate-400">{t('retailer.customerDue.summaryOpening')}</p>
          <p className="mt-1 font-black text-slate-950">{formatCurrency(statement?.openingBalance, language)}</p>
        </div>
        <div>
          <p className="font-bold uppercase text-slate-400">{t('retailer.customerDue.summaryTotalDebit')}</p>
          <p className="mt-1 font-black text-rose-700">{formatCurrency(statement?.totalDebit, language)}</p>
        </div>
        <div>
          <p className="font-bold uppercase text-slate-400">{t('retailer.customerDue.summaryTotalCredit')}</p>
          <p className="mt-1 font-black text-emerald-700">{formatCurrency(statement?.totalCredit, language)}</p>
        </div>
        <div>
          <p className="font-bold uppercase text-slate-400">{t('retailer.customerDue.summaryClosing')}</p>
          <p className="mt-1 font-black text-slate-950">{formatCurrency(statement?.closingBalance, language)}</p>
        </div>
      </div>

      <table className="mt-4 w-full border-collapse text-[9px]">
        <thead>
          <tr className="bg-slate-950 text-white">
            <th className="border border-slate-800 px-1.5 py-1 text-left">{t('retailer.customerDue.tableDate')}</th>
            <th className="border border-slate-800 px-1.5 py-1 text-left">{t('retailer.customerDue.tableType')}</th>
            <th className="border border-slate-800 px-1.5 py-1 text-right">{t('retailer.customerDue.tableDebit')}</th>
            <th className="border border-slate-800 px-1.5 py-1 text-right">{t('retailer.customerDue.tableCredit')}</th>
            <th className="border border-slate-800 px-1.5 py-1 text-right">{t('retailer.customerDue.tableBalance')}</th>
            <th className="border border-slate-800 px-1.5 py-1 text-left">{t('retailer.customerDue.tableNote')}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td className="border border-slate-200 px-1.5 py-1 whitespace-nowrap">{formatDateTime(entry.createdAt, language)}</td>
              <td className="border border-slate-200 px-1.5 py-1 font-semibold">{typeLabel(entry.type, t)}</td>
              <td className="border border-slate-200 px-1.5 py-1 text-right font-bold text-rose-700">{entry.debit ? formatCurrency(entry.debit, language) : '-'}</td>
              <td className="border border-slate-200 px-1.5 py-1 text-right font-bold text-emerald-700">{entry.credit ? formatCurrency(entry.credit, language) : '-'}</td>
              <td className="border border-slate-200 px-1.5 py-1 text-right font-black">{formatCurrency(entry.balanceAfter, language)}</td>
              <td className="border border-slate-200 px-1.5 py-1 max-w-[120px] truncate text-slate-500">{entry.note || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-12 flex justify-between text-[10px] font-semibold text-slate-950">
        <div className="w-32"><div className="border-t border-slate-900 pt-2">{t('retailer.customerDue.customerSignature')}</div></div>
        <div className="w-32"><div className="border-t border-slate-900 pt-2 text-right">{t('retailer.customerDue.authorizedBy')}</div></div>
      </div>
    </div>
  );
}
