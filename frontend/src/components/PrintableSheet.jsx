import { formatCurrency, formatDate, formatNumber } from '../utils/calculations';
import { cx } from './ui';

function formatCasePieceLocalized(totalPieces, piecesPerCase, language, t) {
  const safeTotal = Number(totalPieces || 0);
  const safeCaseSize = Math.max(1, Number(piecesPerCase || 1));
  const cases = Math.floor(safeTotal / safeCaseSize);
  const pieces = safeTotal % safeCaseSize;
  return `${formatNumber(cases, language)} ${t('common.case')} ${formatNumber(pieces, language)} ${t('common.pcs')}`;
}

export default function PrintableSheet({ sheet, printTarget = false, targetId, t, language = 'en' }) {
  if (!sheet) return null;

  const rows = sheet.items || [];
  const extraReturns = sheet.extraReturns || [];
  const withReturnValue = (item) => {
    const returnedPieces = Number(item.returnedPieces || 0);
    const damagedPieces = Number(item.damagedPieces || 0);
    const rate = Number(item.rate || 0);
    return {
      ...item,
      returnedPieces,
      damagedPieces,
      rate,
      returnValue: Number(item.returnValue || 0) || (returnedPieces + damagedPieces) * rate,
    };
  };
  const tableRows = [
    ...rows.map(withReturnValue),
    ...extraReturns.map((item) => withReturnValue({
      ...item,
      isExtraReturn: true,
      issuedPieces: 0,
      soldPieces: 0,
      payable: 0,
    })),
  ];
  const totalIssued = rows.reduce((sum, item) => sum + Number(item.issuedPieces || 0), 0);
  const totalReturned = tableRows.reduce((sum, item) => sum + Number(item.returnedPieces || 0), 0);
  const totalDamaged = tableRows.reduce((sum, item) => sum + Number(item.damagedPieces || 0), 0);
  const totalSold = rows.reduce((sum, item) => sum + Number(item.soldPieces || 0), 0);
  const totalReturnValue = Number(sheet.totalReturnValue || 0) || tableRows.reduce((sum, item) => sum + Number(item.returnValue || 0), 0);
  const saleTotal = Number(sheet.totalPayable || 0) - Number(sheet.extraReturnValue || 0);
  const statusLabel = sheet.status === 'Completed'
    ? t('history.completed')
    : sheet.status === 'Pending'
      ? t('dashboard.pending')
      : sheet.status === 'No Issue'
        ? t('dashboard.noIssue')
        : sheet.status === 'Archived'
          ? t('common.archived')
        : sheet.status || '-';

  return (
    <div id={targetId} className={cx('mx-auto w-full max-w-[210mm] rounded-xl border border-slate-200 bg-white p-6 shadow-soft', printTarget && 'print-target')}>
      <div className="border-b-2 border-slate-950 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-normal text-slate-950">{sheet.businessName}</h2>
          </div>
          <div className="rounded-lg border border-slate-300 px-4 py-3 text-sm">
            <p className="font-bold text-slate-950">{t('common.date')}: {formatDate(sheet.date, language)}</p>
            <p className="mt-1 font-semibold text-slate-600">{t('settlement.printableStatus')}: {statusLabel}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 border-b border-slate-200 py-4 text-sm sm:grid-cols-3">
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">{t('settlement.printableDsrName')}</p>
          <p className="mt-1 font-semibold text-slate-950">{sheet.dsrName || '-'}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">{t('settlement.printableArea')}</p>
          <p className="mt-1 font-semibold text-slate-950">{sheet.area || '-'}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">{t('settlement.printablePhone')}</p>
          <p className="mt-1 font-semibold text-slate-950">{sheet.phone || '-'}</p>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-center align-middle text-[10px]">
          <thead>
            <tr className="bg-slate-950 text-white">
              <th className="border border-slate-800 px-1.5 py-1 align-middle">{t('settlement.printableSl')}</th>
              <th className="border border-slate-800 px-1.5 py-1 align-middle">{t('products.product')}</th>
              <th className="border border-slate-800 px-1.5 py-1 align-middle">{t('settlement.issued')}</th>
              <th className="border border-slate-800 px-1.5 py-1 align-middle">{t('settlement.returnCase')}</th>
              <th className="border border-slate-800 px-1.5 py-1 align-middle">{t('settlement.damagedCase')}</th>
              <th className="border border-slate-800 px-1.5 py-1 align-middle">{t('settlement.sold')}</th>
              <th className="border border-slate-800 px-1.5 py-1 align-middle">{t('settlement.rate')}</th>
              <th className="border border-slate-800 px-1.5 py-1 align-middle">{t('settlement.payable')}</th>
              <th className="border border-slate-800 px-1.5 py-1 align-middle">{t('settlement.damagedReturnedPrice')}</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((item, index) => (
              <tr key={item.id || `${item.productId}-${item.rate}-${index}`} className="print-break-inside-avoid">
                <td className="border border-slate-300 px-1.5 py-1 align-middle font-semibold">{formatNumber(index + 1, language)}</td>
                <td className="border border-slate-300 px-1.5 py-1 align-middle font-semibold text-slate-950">
                  {item.productName}
                </td>
                <td className="border border-slate-300 px-1.5 py-1 align-middle font-semibold">{formatCasePieceLocalized(item.issuedPieces, item.piecesPerCase, language, t)}</td>
                <td className="border border-slate-300 px-1.5 py-1 align-middle font-semibold">{formatCasePieceLocalized(item.returnedPieces, item.piecesPerCase, language, t)}</td>
                <td className="border border-slate-300 px-1.5 py-1 align-middle font-semibold">{formatCasePieceLocalized(item.damagedPieces, item.piecesPerCase, language, t)}</td>
                <td className="border border-slate-300 px-1.5 py-1 align-middle font-semibold">{formatCasePieceLocalized(item.soldPieces, item.piecesPerCase, language, t)}</td>
                <td className="border border-slate-300 px-1.5 py-1 align-middle font-semibold">{formatCurrency(item.rate, language)}</td>
                <td className="border border-slate-300 px-1.5 py-1 align-middle font-bold">{formatCurrency(item.payable, language)}</td>
                <td className="border border-slate-300 px-1.5 py-1 align-middle font-bold text-rose-700">
                  {item.returnValue > 0 ? `- ${formatCurrency(item.returnValue, language)}` : formatCurrency(0, language)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-bold text-slate-950">
              <td className="border border-slate-300 px-1.5 py-1 align-middle" colSpan="2">
                {t('common.total')}
              </td>
              <td className="border border-slate-300 px-1.5 py-1 align-middle font-bold">{formatNumber(totalIssued, language)} {t('common.pcs')}</td>
              <td className="border border-slate-300 px-1.5 py-1 align-middle font-bold">{formatNumber(totalReturned, language)} {t('common.pcs')}</td>
              <td className="border border-slate-300 px-1.5 py-1 align-middle font-bold">{formatNumber(totalDamaged, language)} {t('common.pcs')}</td>
              <td className="border border-slate-300 px-1.5 py-1 align-middle font-bold">{formatNumber(totalSold, language)} {t('common.pcs')}</td>
              <td className="border border-slate-300 px-1.5 py-1 align-middle">{t('common.grandTotal')}</td>
              <td className="border border-slate-300 px-1.5 py-1 align-middle">
                {saleTotal < 0 ? `- ${formatCurrency(Math.abs(saleTotal), language)}` : formatCurrency(saleTotal, language)}
              </td>
              <td className="border border-slate-300 px-1.5 py-1 align-middle text-rose-700">- {formatCurrency(totalReturnValue, language)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-x-1.5 gap-y-2 border-b border-slate-200 pb-3 text-xs">
        <div className="text-center">
          <p className="whitespace-nowrap text-[8px] font-bold uppercase text-slate-500">{t('settlement.todaySales')}</p>
          <p className="whitespace-nowrap font-bold text-slate-950">{saleTotal < 0 ? `- ${formatCurrency(Math.abs(saleTotal), language)}` : formatCurrency(saleTotal, language)}</p>
        </div>
        <span className="text-slate-300">|</span>
        <div className="text-center">
          <p className="whitespace-nowrap text-[8px] font-bold uppercase text-slate-500">{t('settlement.discount')}</p>
          <p className="whitespace-nowrap font-bold text-slate-950">- {formatCurrency(sheet.discount || 0, language)}</p>
        </div>
        <span className="text-slate-300">|</span>
        <div className="text-center">
          <p className="whitespace-nowrap text-[8px] font-bold uppercase text-slate-500">{t('settlement.todayPayable')}</p>
          <p className="whitespace-nowrap font-bold text-slate-950">{formatCurrency(Math.max(0, saleTotal - (sheet.discount || 0)), language)}</p>
        </div>
        <span className="text-slate-300">|</span>
        <div className="text-center">
          <p className="whitespace-nowrap text-[8px] font-bold uppercase text-slate-500">{t('settlement.previousDue')}</p>
          <p className="whitespace-nowrap font-bold text-slate-950">+ {formatCurrency(sheet.previousDue || 0, language)}</p>
        </div>
        <span className="text-slate-300">|</span>
        <div className="text-center">
          <p className="whitespace-nowrap text-[8px] font-bold uppercase text-slate-500">{t('settlement.totalReceivable')}</p>
          <p className="whitespace-nowrap font-bold text-slate-950">{formatCurrency(sheet.totalReceivable || 0, language)}</p>
        </div>
        <span className="text-slate-300">|</span>
        <div className="text-center">
          <p className="whitespace-nowrap text-[8px] font-bold uppercase text-slate-500">{t('settlement.amountPaid')}</p>
          <p className="whitespace-nowrap font-black text-slate-950">- {formatCurrency(sheet.amountPaid || 0, language)}</p>
        </div>
        <span className="text-slate-300">|</span>
        <div className="text-center">
          <p className="whitespace-nowrap text-[8px] font-bold uppercase text-slate-500">{t('settlement.todayDue')}</p>
          <p className="whitespace-nowrap font-bold text-rose-600">{formatCurrency(sheet.todayDue || 0, language)}</p>
        </div>
        {sheet.srHandovers && sheet.srHandovers.length > 0 ? (
          <>
            <span className="text-slate-300">|</span>
            <div className="text-center">
              <p className="whitespace-nowrap text-[8px] font-bold uppercase text-slate-500">{t('settlement.srHandoverTitle')}</p>
              <p className="whitespace-nowrap font-bold text-slate-950">- {formatCurrency(sheet.srHandovers.reduce((sum, h) => sum + Number(h.amount || 0), 0), language)}</p>
            </div>
          </>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-center">
        <p className="text-base font-black text-slate-950">{t('settlement.newDue')}: {formatCurrency(sheet.dueAmount || 0, language)}</p>
      </div>

      <div className="mt-12 flex justify-between text-sm font-semibold text-slate-950">
        <div className="w-36">
          <div className="border-t border-slate-900 pt-2">{t('settlement.printableCustomerSignature')}</div>
        </div>
        <div className="w-36">
          <div className="border-t border-slate-900 pt-2 text-right">{t('settlement.printableManagerSignature')}</div>
        </div>
      </div>
    </div>
  );
}
