import { useEffect } from 'react';
import { AlertTriangle, Save, Truck } from 'lucide-react';
import { Alert, EmptyState, SectionHeader, TableSkeleton, cx, Select } from '../../../components/ui.jsx';
import TableReportActions from '../../../components/TableReportActions.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCasePiece, formatCurrency, formatNumber } from '../../../utils/calculations.js';
import { useMorningIssueViewModel } from '../viewmodels/useMorningIssueViewModel';

const autoSelect = (e) => e.target.select();
const MORNING_ISSUE_REPORT_ID = 'morning-issue-report';

export default function MorningIssuePage() {
  const { productDirectory, dsrDirectory, today, saveIssue, t, can } = useInventoryApp();
  const vm = useMorningIssueViewModel({ products: productDirectory, dsrs: dsrDirectory, today, saveIssueAction: saveIssue, t });
  const canCreateIssue = can('create_issues');
  const canUpdateIssue = can('update_issues');
  // Existing issues can only be edited on their own day — backend enforces the same rule.
  const canEditIssue = (vm.existingIssue ? (canUpdateIssue && vm.date === today) : canCreateIssue) && !vm.existingSettlement;

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 's' && (event.ctrlKey || event.metaKey) && canEditIssue && !vm.saving) {
        event.preventDefault();
        vm.saveIssue();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [canEditIssue, vm.saving, vm.saveIssue]);

  return (
    <div>
      <SectionHeader eyebrow={t('nav.morningIssue')} title={t('nav.morningIssue')} description={t('morningIssue.description')} />

      <div className="surface mb-6 p-5">
        <div className="grid gap-4 lg:grid-cols-[180px_minmax(220px,1fr)_repeat(3,minmax(130px,160px))]">
          <div>
            <label className="label">{t('common.date')}</label>
            <DatePickerField value={vm.date} onChange={vm.setDate} max={new Date().toISOString().slice(0, 10)} />
          </div>
          <div>
            <label className="label">{t('common.dsr')}</label>
            <Select className="input" value={vm.dsrId} onChange={(event) => vm.setDsrId(event.target.value)}>
              {vm.activeDsrs.map((dsr) => (
                <option key={dsr.id} value={dsr.id}>
                  {dsr.name} - {dsr.area}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="label">{t('morningIssue.lines')}</label>
            <input className="input" disabled readOnly value={formatNumber(vm.selectedRows.length)} />
          </div>
          <div>
            <label className="label">{t('morningIssue.totalQty')}</label>
            <input className="input" disabled readOnly value={`${formatNumber(vm.totalIssuedPieces)} pcs`} />
          </div>
          <div>
            <label className="label">{vm.existingIssue ? t('morningIssue.updatedValue') : t('morningIssue.issueValue')}</label>
            <input className="input" disabled readOnly value={formatCurrency(vm.totalIssueValue)} />
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
      <div id={MORNING_ISSUE_REPORT_ID} className="surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="section-title">{t('morningIssue.sheetTitle')}</h2>
            <p className="mt-1 text-sm text-slate-500">{t('morningIssue.sheetDescription')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <TableReportActions targetId={MORNING_ISSUE_REPORT_ID} title={t('morningIssue.sheetTitle')} fileName="morning-issue" entityType="morning_issue" t={t} />
            <Select clearable={false} className="input h-9 min-w-[11rem] sm:w-52" value={vm.categoryId} onChange={(event) => vm.setCategoryId(event.target.value)}>
              <option value="">{t('categories.allCategories')}</option>
              {vm.categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </Select>
            {canEditIssue ? (
              <button type="button" className="btn-primary" onClick={vm.saveIssue} disabled={vm.saving || !productDirectory.length || Boolean(vm.invalidRows.length) || Boolean(vm.existingSettlement)}>
                <Save size={18} />
                {vm.saving ? t('common.saving') : vm.existingIssue ? t('morningIssue.updateIssue') : t('morningIssue.saveIssue')}
                <kbd className="ml-1 rounded border border-indigo-400/40 bg-indigo-500/20 px-1 py-0.5 font-mono text-[10px] text-indigo-200">Ctrl+S</kbd>
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
                  {vm.visibleRows.map((row) => {
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
                          <input className="input h-9 w-24" type="number" inputMode="decimal" min="0" value={quantity.caseQty || ''} onFocus={autoSelect} onChange={(event) => vm.updateQuantity(row.id, 'caseQty', event.target.value)} disabled={vm.saving} />
                        </td>
                        <td className="table-cell">
                          <input className="input h-9 w-24" type="number" inputMode="decimal" min="0" value={quantity.pieceQty || ''} onFocus={autoSelect} onChange={(event) => vm.updateQuantity(row.id, 'pieceQty', event.target.value)} disabled={vm.saving} />
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
                <p className="text-2xl font-semibold text-slate-950">{formatCurrency(vm.totalIssueValue)}</p>
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

