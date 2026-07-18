import { useEffect, useState } from 'react';
import { Alert, Badge, EmptyState, MobileCardList, MobileListCard, SectionHeader, Select, TableSkeleton, cx } from '../../../components/ui.jsx';
import { DateRangePickerField } from '../../../components/DatePicker.jsx';
import { FileText } from 'lucide-react';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency, formatDate } from '../../../utils/calculations.js';
import { useDueScheduleReportViewModel } from '../viewmodels/useDueScheduleReportViewModel.js';
import { useOverdueReportViewModel } from '../viewmodels/useOverdueReportViewModel.js';
import { useCollectionReportViewModel } from '../viewmodels/useCollectionReportViewModel.js';
import { useInstallmentCustomerStatementViewModel } from '../viewmodels/useInstallmentCustomerStatementViewModel.js';

const TABS = ['dueSchedule', 'overdue', 'collection', 'customerStatement'];
const TAB_SHORTCUTS = ['Alt+1', 'Alt+2', 'Alt+3', 'Alt+4'];

function DueScheduleTab() {
  const { t, language } = useInventoryApp();
  const rr = useDueScheduleReportViewModel();

  return (
    <div>
      <div className="surface mb-6 flex flex-wrap items-end gap-4 p-5">
        <div className="min-w-[280px]">
          <label className="label">{t('installments.reports.dateFrom')} - {t('installments.reports.dateTo')}</label>
          <DateRangePickerField
            from={rr.dateFrom}
            to={rr.dateTo}
            onChange={(from, to) => { rr.setDateFrom(from); rr.setDateTo(to); }}
            placeholder={`${t('installments.reports.dateFrom')} - ${t('installments.reports.dateTo')}`}
          />
        </div>
        <button type="button" className="btn-primary shrink-0" onClick={rr.applyRange} disabled={rr.loading}>
          {t('installments.reports.generate')}
        </button>
      </div>
      {rr.error ? <Alert type="error">{rr.error}</Alert> : rr.loading ? <TableSkeleton columns={5} /> : rr.data ? (
        <div className="surface overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4 text-sm font-bold text-slate-950">
            {t('installments.reports.totalDue')}: {formatCurrency(rr.data.totalDue, language)}
          </div>
          {!rr.data.rows.length ? (
            <div className="p-5"><EmptyState title={t('installments.reports.noRows')} icon={FileText} /></div>
          ) : (
            <>
            <MobileCardList>
              {rr.data.rows.map((row) => (
                <MobileListCard
                  key={row.id}
                  title={row.planNumber}
                  subtitle={`${row.customerName || '-'} · ${formatDate(row.dueDate, language)}`}
                  value={formatCurrency(row.remainingAmount, language)}
                  valueClass="text-amber-600"
                />
              ))}
            </MobileCardList>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-2">{t('installments.plans.planNumber')}</th>
                    <th className="px-4 py-2">{t('installments.plans.customer')}</th>
                    <th className="px-4 py-2">{t('installments.plans.dueDate')}</th>
                    <th className="px-4 py-2 text-right">{t('installments.detail.remainingAmount')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rr.data.rows.map((row) => (
                    <tr key={row.id}>
                      <td className="table-cell font-semibold text-slate-950">{row.planNumber}</td>
                      <td className="table-cell">{row.customerName || '-'}</td>
                      <td className="table-cell">{formatDate(row.dueDate, language)}</td>
                      <td className="table-cell text-right font-semibold text-amber-600">{formatCurrency(row.remainingAmount, language)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function OverdueTab() {
  const { t, language, can, applyInstallmentLateFee } = useInventoryApp();
  const { data, loading, error, refresh } = useOverdueReportViewModel();
  const canManage = can('manage_installment_plans');

  if (error) return <Alert type="error">{error}</Alert>;
  if (loading) return <TableSkeleton columns={6} />;
  if (!data) return null;

  async function handleApply(scheduleId) {
    const result = await applyInstallmentLateFee(scheduleId);
    if (result?.ok) refresh();
  }

  return (
    <div className="surface overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
        <span className="text-sm font-bold text-slate-950">{t('installments.reports.totalOverdue')}: {formatCurrency(data.totalOverdue, language)}</span>
        <Badge tone={data.lateFeeRuleActive ? 'emerald' : 'slate'}>
          {data.lateFeeRuleActive ? t('installments.reports.lateFeeRuleActive') : t('installments.reports.lateFeeRuleInactive')}
        </Badge>
      </div>
      {!data.rows.length ? (
        <div className="p-5"><EmptyState title={t('installments.reports.noOverdue')} icon={FileText} /></div>
      ) : (
        <>
        <MobileCardList>
          {data.rows.map((row) => (
            <MobileListCard
              key={row.id}
              title={row.planNumber}
              subtitle={`${row.customerName || '-'} · ${formatDate(row.dueDate, language)}`}
              value={formatCurrency(row.remainingAmount, language)}
              valueClass="text-amber-600"
              valueSub={`${row.daysOverdue} ${t('installments.reports.daysOverdue')}`}
              action={canManage ? (
                <button
                  type="button"
                  className="btn-secondary py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!data.lateFeeRuleActive || !(row.previewLateFee > 0)}
                  onClick={() => handleApply(row.id)}
                >
                  {t('installments.reports.applyLateFee')}
                </button>
              ) : null}
            />
          ))}
        </MobileCardList>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-2">{t('installments.plans.planNumber')}</th>
                <th className="px-4 py-2">{t('installments.plans.customer')}</th>
                <th className="px-4 py-2">{t('installments.plans.dueDate')}</th>
                <th className="px-4 py-2 text-right">{t('installments.reports.daysOverdue')}</th>
                <th className="px-4 py-2 text-right">{t('installments.detail.remainingAmount')}</th>
                <th className="px-4 py-2 text-right">{t('installments.reports.previewLateFee')}</th>
                {canManage ? <th className="px-4 py-2 text-right">{t('common.actions')}</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.rows.map((row) => (
                <tr key={row.id}>
                  <td className="table-cell font-semibold text-slate-950">{row.planNumber}</td>
                  <td className="table-cell">{row.customerName || '-'}</td>
                  <td className="table-cell">{formatDate(row.dueDate, language)}</td>
                  <td className="table-cell text-right font-semibold text-rose-600">{row.daysOverdue}</td>
                  <td className="table-cell text-right font-semibold text-amber-600">{formatCurrency(row.remainingAmount, language)}</td>
                  <td className="table-cell text-right">{row.previewLateFee > 0 ? formatCurrency(row.previewLateFee, language) : '-'}</td>
                  {canManage ? (
                    <td className="table-cell text-right">
                      <button
                        type="button"
                        className="btn-secondary py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!data.lateFeeRuleActive || !(row.previewLateFee > 0)}
                        onClick={() => handleApply(row.id)}
                      >
                        {t('installments.reports.applyLateFee')}
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}

function CollectionTab() {
  const { t, language } = useInventoryApp();
  const rr = useCollectionReportViewModel();

  return (
    <div>
      <div className="surface mb-6 flex flex-wrap items-end gap-4 p-5">
        <div className="min-w-[280px]">
          <label className="label">{t('installments.reports.dateFrom')} - {t('installments.reports.dateTo')}</label>
          <DateRangePickerField
            from={rr.dateFrom}
            to={rr.dateTo}
            onChange={(from, to) => { rr.setDateFrom(from); rr.setDateTo(to); }}
            placeholder={`${t('installments.reports.dateFrom')} - ${t('installments.reports.dateTo')}`}
          />
        </div>
        <button type="button" className="btn-primary shrink-0" onClick={rr.applyRange} disabled={rr.loading}>
          {t('installments.reports.generate')}
        </button>
      </div>
      {rr.error ? <Alert type="error">{rr.error}</Alert> : rr.loading ? <TableSkeleton columns={5} /> : rr.data ? (
        <div className="surface overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4 text-sm font-bold text-slate-950">
            {t('installments.reports.totalCollected')}: {formatCurrency(rr.data.totalCollected, language)}
          </div>
          {!rr.data.rows.length ? (
            <div className="p-5"><EmptyState title={t('installments.reports.noCollections')} icon={FileText} /></div>
          ) : (
            <>
            <MobileCardList>
              {rr.data.rows.map((row) => (
                <MobileListCard
                  key={row.id}
                  title={row.planNumber}
                  subtitle={`${row.customerName || '-'} · ${formatDate(row.paymentDate, language)}`}
                  value={formatCurrency(row.amount, language)}
                  valueClass="text-emerald-600"
                  valueSub={t(`installments.payment.methods.${row.paymentMethod}`)}
                />
              ))}
            </MobileCardList>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-2">{t('installments.payment.date')}</th>
                    <th className="px-4 py-2">{t('installments.plans.planNumber')}</th>
                    <th className="px-4 py-2">{t('installments.plans.customer')}</th>
                    <th className="px-4 py-2 text-right">{t('installments.payment.amount')}</th>
                    <th className="px-4 py-2">{t('installments.payment.method')}</th>
                    <th className="px-4 py-2">{t('installments.reports.collector')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rr.data.rows.map((row) => (
                    <tr key={row.id}>
                      <td className="table-cell">{formatDate(row.paymentDate, language)}</td>
                      <td className="table-cell font-semibold text-slate-950">{row.planNumber}</td>
                      <td className="table-cell">{row.customerName || '-'}</td>
                      <td className="table-cell text-right font-semibold text-emerald-600">{formatCurrency(row.amount, language)}</td>
                      <td className="table-cell">{t(`installments.payment.methods.${row.paymentMethod}`)}</td>
                      <td className="table-cell text-slate-500">{row.collectedByName || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function CustomerStatementTab() {
  const { t, language, retailCustomerDirectory } = useInventoryApp();
  const vm = useInstallmentCustomerStatementViewModel();

  return (
    <div>
      <div className="surface mb-6 p-5">
        <label className="label">{t('installments.plans.customer')}</label>
        <Select className="input" value={vm.customerId} onChange={(event) => vm.setCustomerId(event.target.value)}>
          <option value="">{t('installments.createPlan.selectCustomer')}</option>
          {retailCustomerDirectory.map((customer) => (
            <option key={customer.id} value={customer.id}>{customer.name}</option>
          ))}
        </Select>
      </div>
      {vm.error ? <Alert type="error">{vm.error}</Alert> : vm.loading ? <TableSkeleton columns={4} /> : vm.statement ? (
        !vm.statement.plans?.length ? (
          <div className="surface p-5"><EmptyState title={t('installments.reports.noPlans')} icon={FileText} /></div>
        ) : (
          <div className="surface overflow-hidden">
            <div className="flex flex-wrap gap-6 border-b border-slate-100 px-5 py-4 text-sm">
              <span><span className="text-slate-500">{t('installments.plans.finalPayableAmount')}: </span><span className="font-bold text-slate-950">{formatCurrency(vm.statement.totals.finalPayableAmount, language)}</span></span>
              <span><span className="text-slate-500">{t('installments.detail.totalPaid')}: </span><span className="font-bold text-emerald-600">{formatCurrency(vm.statement.totals.totalPaid, language)}</span></span>
              <span><span className="text-slate-500">{t('installments.plans.outstandingAmount')}: </span><span className="font-bold text-amber-600">{formatCurrency(vm.statement.totals.outstandingAmount, language)}</span></span>
            </div>
            <MobileCardList>
              {vm.statement.plans.map(({ plan }) => (
                <MobileListCard
                  key={plan.id}
                  title={plan.planNumber}
                  badge={<Badge tone="slate">{t(`installments.plans.status.${plan.status}`)}</Badge>}
                  subtitle={formatDate(plan.saleDate, language)}
                  value={formatCurrency(plan.outstandingAmount, language)}
                  valueClass="text-amber-600"
                  valueSub={formatCurrency(plan.totalPaid, language)}
                />
              ))}
            </MobileCardList>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-2">{t('installments.plans.planNumber')}</th>
                    <th className="px-4 py-2">{t('installments.plans.saleDate')}</th>
                    <th className="px-4 py-2 text-right">{t('installments.plans.finalPayableAmount')}</th>
                    <th className="px-4 py-2 text-right">{t('installments.detail.totalPaid')}</th>
                    <th className="px-4 py-2 text-right">{t('installments.plans.outstandingAmount')}</th>
                    <th className="px-4 py-2">{t('installments.plans.statusLabel')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vm.statement.plans.map(({ plan }) => (
                    <tr key={plan.id}>
                      <td className="table-cell font-semibold text-slate-950">{plan.planNumber}</td>
                      <td className="table-cell">{formatDate(plan.saleDate, language)}</td>
                      <td className="table-cell text-right">{formatCurrency(plan.finalPayableAmount, language)}</td>
                      <td className="table-cell text-right text-emerald-600">{formatCurrency(plan.totalPaid, language)}</td>
                      <td className="table-cell text-right font-semibold text-amber-600">{formatCurrency(plan.outstandingAmount, language)}</td>
                      <td className="table-cell">{t(`installments.plans.status.${plan.status}`)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : null}
    </div>
  );
}

export default function InstallmentReportsPage() {
  const { t } = useInventoryApp();
  const [activeTab, setActiveTab] = useState('dueSchedule');

  useEffect(() => {
    function handleKeyDown(event) {
      const isShortcut = event.altKey && !event.ctrlKey && !event.metaKey;
      if (!isShortcut) return;
      const index = Number(event.key) - 1;
      if (index >= 0 && index < TABS.length) {
        event.preventDefault();
        setActiveTab(TABS[index]);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div>
      <SectionHeader title={t('installments.reports.title')} compact />

      <div className="no-print mb-4 overflow-x-auto">
        <div className="inline-flex min-w-full gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 sm:min-w-0">
          {TABS.map((tab, index) => {
            const selected = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                className={cx(
                  'flex min-h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 text-sm font-bold transition sm:flex-none',
                  selected ? 'border border-indigo-200 bg-indigo-50 text-indigo-800 shadow-sm ring-2 ring-indigo-100' : 'border border-transparent text-slate-500 hover:bg-white/70 hover:text-slate-800',
                )}
                aria-pressed={selected}
                onClick={() => setActiveTab(tab)}
              >
                {t(`installments.reports.tabs.${tab}`)}
                <kbd className={cx('rounded border px-1.5 py-0.5 text-[10px] font-black', selected ? 'border-indigo-200 bg-white text-indigo-700' : 'border-slate-200 bg-white text-slate-400')}>{TAB_SHORTCUTS[index]}</kbd>
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'dueSchedule' ? <DueScheduleTab /> : null}
      {activeTab === 'overdue' ? <OverdueTab /> : null}
      {activeTab === 'collection' ? <CollectionTab /> : null}
      {activeTab === 'customerStatement' ? <CustomerStatementTab /> : null}
    </div>
  );
}
