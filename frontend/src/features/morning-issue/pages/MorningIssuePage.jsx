import { AlertTriangle, Save, Truck } from 'lucide-react';
import { Alert, EmptyState, SectionHeader, TableSkeleton, cx } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/date-picker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCasePiece, formatCurrency, formatNumber } from '../../../utils/calculations.js';
import { useMorningIssueViewModel } from '../viewmodels/useMorningIssueViewModel';

export default function MorningIssuePage() {
  const { productDirectory, dsrDirectory, today, saveIssue, t, can } = useInventoryApp();
  const vm = useMorningIssueViewModel({ products: productDirectory, dsrs: dsrDirectory, today, saveIssueAction: saveIssue, t });
  const canCreateIssue = can('create_issues');
  const canUpdateIssue = can('update_issues');
  const canEditIssue = (vm.existingIssue ? canUpdateIssue : canCreateIssue) && !vm.existingSettlement;

  return (
    <div>
      <SectionHeader eyebrow={t('nav.morningIssue')} title={t('nav.morningIssue')} description={t('morningIssue.description')} />

      <div className="surface mb-6 p-5">
        <div className="grid gap-4 lg:grid-cols-[180px_minmax(220px,1fr)_repeat(3,minmax(130px,160px))]">
          <div>
            <label className="label">{t('common.date')}</label>
            <DatePickerField value={vm.date} onChange={vm.setDate} />
          </div>
          <div>
            <label className="label">{t('dsr.title')}</label>
            <select className="input" value={vm.dsrId} onChange={(event) => vm.setDsrId(event.target.value)}>
              {vm.activeDsrs.map((dsr) => (
                <option key={dsr.id} value={dsr.id}>
                  {dsr.name} - {dsr.area}
                </option>
              ))}
            </select>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-bold uppercase text-slate-500">{t('morningIssue.lines')}</p>
            <p className="mt-1 text-xl font-black text-slate-950">{formatNumber(vm.selectedRows.length)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-bold uppercase text-slate-500">{t('morningIssue.totalQty')}</p>
            <p className="mt-1 text-xl font-black text-slate-950">{formatNumber(vm.totalIssuedPieces)} pcs</p>
          </div>
          <div className="rounded-lg border border-[var(--secondary-soft)] bg-[var(--secondary-soft)] px-4 py-3">
            <p className="text-xs font-bold uppercase text-[var(--secondary-strong)]">{vm.existingIssue ? t('morningIssue.updatedValue') : t('morningIssue.issueValue')}</p>
            <p className="mt-1 text-xl font-black text-[var(--secondary-strong)]">{formatCurrency(vm.totalIssueValue)}</p>
          </div>
        </div>
        {vm.message ? (
          <div className="mt-4">
            <Alert type={vm.message.type}>{vm.message.text}</Alert>
          </div>
        ) : null}
        {vm.existingIssue ? (
          <div className="mt-4">
            <Alert type="info">{t('morningIssue.existingInfo')}</Alert>
          </div>
        ) : null}
        {vm.existingSettlement ? (
          <div className="mt-4">
            <Alert type="warning">{t('morningIssue.settlementLocked')}</Alert>
          </div>
        ) : null}
      </div>

      {vm.loading ? (
        <div className="mt-6">
          <TableSkeleton rows={6} columns={7} />
        </div>
      ) : (
      <div className="surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-950">{t('morningIssue.sheetTitle')}</h2>
            <p className="mt-1 text-sm text-slate-500">{t('morningIssue.sheetDescription')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canEditIssue ? (
              <button type="button" className="btn-primary" onClick={vm.saveIssue} disabled={vm.saving || !productDirectory.length || Boolean(vm.invalidRows.length) || Boolean(vm.existingSettlement)}>
                <Save size={18} />
                {vm.saving ? t('common.saving') : vm.existingIssue ? t('morningIssue.updateIssue') : t('morningIssue.saveIssue')}
              </button>
            ) : (
              <span className="text-sm font-semibold text-slate-400">-</span>
            )}
          </div>
        </div>

        {productDirectory.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-3">{t('products.product')}</th>
                    <th className="px-4 py-3">{t('morningIssue.availableStock')}</th>
                    <th className="px-4 py-3">{t('common.case')}</th>
                    <th className="px-4 py-3">{t('common.piece')}</th>
                    <th className="px-4 py-3">{t('morningIssue.totalIssue')}</th>
                    <th className="px-4 py-3">{t('morningIssue.rate')}</th>
                    <th className="px-4 py-3 text-right">{t('morningIssue.value')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vm.issueRows.map((row) => {
                    const quantity = vm.quantities[row.id] || {};
                    return (
                      <tr key={row.id} className={cx('hover:bg-slate-50', row.invalid && 'bg-rose-50')}>
                        <td className="table-cell">
                          <p className="font-semibold text-slate-950">{row.name}</p>
                          <p className="text-xs text-slate-500">{row.category} - {row.piecesPerCase} {t('common.pcsPerCase')}</p>
                        </td>
                        <td className="table-cell">
                          <p className="font-semibold text-slate-950">{formatCasePiece(row.availableStock, row.piecesPerCase)}</p>
                          <p className="text-xs text-slate-500">{formatNumber(row.availableStock)} {t('common.pcs')}</p>
                        </td>
                        <td className="table-cell">
                          <input className="input h-9 w-24" type="number" min="0" value={quantity.caseQty || ''} onChange={(event) => vm.updateQuantity(row.id, 'caseQty', event.target.value)} disabled={vm.saving} />
                        </td>
                        <td className="table-cell">
                          <input className="input h-9 w-24" type="number" min="0" value={quantity.pieceQty || ''} onChange={(event) => vm.updateQuantity(row.id, 'pieceQty', event.target.value)} disabled={vm.saving} />
                        </td>
                        <td className="table-cell">
                          <p className={cx('font-semibold', row.invalid ? 'text-rose-700' : 'text-slate-950')}>{formatCasePiece(row.issuedPieces, row.piecesPerCase)}</p>
                          {row.invalid ? <p className="text-xs font-semibold text-rose-700">{t('morningIssue.exceedsStock')}</p> : null}
                        </td>
                        <td className="table-cell">{formatCurrency(row.rate)}</td>
                        <td className="table-cell text-right font-bold">{formatCurrency(row.issueValue)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 border-t border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
              {vm.invalidRows.length ? (
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-rose-700">
                  <AlertTriangle size={17} />
                  {t('morningIssue.invalidRows', { count: vm.invalidRows.length })}
                </div>
              ) : (
                <div className="text-sm font-semibold text-slate-600">{t('morningIssue.saveHint')}</div>
              )}
              <div className="text-right text-sm">
                <p className="font-semibold text-slate-600">{t('morningIssue.totalIssueValue')}</p>
                <p className="text-2xl font-black text-slate-950">{formatCurrency(vm.totalIssueValue)}</p>
              </div>
            </div>
          </>
        ) : (
          <div className="p-5">
            <EmptyState title={t('morningIssue.noProducts')} description={t('morningIssue.noProductsDescription')} icon={Truck} />
          </div>
        )}
      </div>
      )}
    </div>
  );
}
