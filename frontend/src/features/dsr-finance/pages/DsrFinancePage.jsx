import { useMemo, useState } from 'react';
import { BadgeDollarSign, Download, FileSpreadsheet, HandCoins, Pencil, Plus, Printer, RefreshCw, Trash2, Wallet } from 'lucide-react';
import { Alert, Badge, ChartPanel, ChartPanelSkeleton, EmptyState, SectionHeader, HorizontalBarChart, StatCard, StatCardSkeleton, TableSkeleton } from '../../../components/ui.jsx';
import { DatePickerField, MonthPickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { downloadSheetPdf } from '../../../services/printService.js';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { formatCurrency, formatDate, formatDateTime, formatNumber, todayISO } from '../../../utils/calculations.js';
import { toBarChartData } from '../../../utils/charts.js';
import { useDsrFinanceViewModel } from '../viewmodels/useDsrFinanceViewModel';
import { useDsrDueStatementViewModel } from '../viewmodels/useDsrDueStatementViewModel';
import DsrFinanceFormModal from '../components/DsrFinanceFormModal';
import SettleDueModal from '../components/SettleDueModal';

const MODULES = {
  advance: {
    tabKey: 'dsrFinance.advanceTab',
    addKey: 'dsrFinance.addAdvance',
    recordKey: 'dsrFinance.advance',
    dailyListKey: 'dsrFinance.dailyAdvanceList',
    monthlyListKey: 'dsrFinance.monthlyAdvanceList',
    performedByKey: 'dsrFinance.createdBy',
    deleteConfirmKey: 'dsrFinance.deleteAdvanceConfirm',
    icon: BadgeDollarSign,
  },
};

const TABS = [
  { key: 'advance', tabKey: 'dsrFinance.advanceTab', icon: BadgeDollarSign },
  { key: 'due', tabKey: 'nav.dsrDueStatement', icon: Wallet },
];

const DSR_CHART_FIELDS = { labelField: 'dsrName', valueField: 'totalAmount', metaFields: ['dsrArea', 'dsrPhone'] };

function ledgerTone(type) {
  if (type === 'COLLECTION' || type === 'ADVANCE_ADJUSTMENT') {
    return 'emerald';
  }
  if (type === 'SALE_DUE') {
    return 'rose';
  }
  if (type === 'OPENING') {
    return 'blue';
  }
  return 'slate';
}

function formatReference(entry) {
  if (!entry.referenceType && !entry.referenceId) {
    return '-';
  }

  const shortId = entry.referenceId ? String(entry.referenceId).slice(0, 18) : '-';
  return `${entry.referenceType || 'reference'} / ${shortId}`;
}

export default function DsrFinancePage() {
  const { t, can, dsrDirectory, confirm, pushToast } = useInventoryApp();
  const [activeTab, setActiveTab] = useState('advance');
  const advanceVm = useDsrFinanceViewModel('advance', { confirm });
  const dueVm = useDsrDueStatementViewModel({ dsrs: dsrDirectory });
  const [modal, setModal] = useState(null);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const canManageDsrFinance = can('manage_dsr_finance');

  const isDueTab = activeTab === 'due';
  const activeVm = activeTab === 'advance' ? advanceVm : dueVm;
  const moduleConfig = MODULES[activeTab];
  const Icon = moduleConfig?.icon || Wallet;
  const dailyChartData = useMemo(() => toBarChartData(activeVm.report?.dailySummary?.byDsr || [], DSR_CHART_FIELDS), [activeVm.report?.dailySummary?.byDsr]);
  const monthlyChartData = useMemo(() => toBarChartData(activeVm.report?.monthlySummary?.byDsr || [], DSR_CHART_FIELDS), [activeVm.report?.monthlySummary?.byDsr]);

  async function handleSave(record) {
    const result = await activeVm.saveRecord(record);
    if (result.ok) {
      setModal(null);
    }
    return result;
  }

  async function handleDelete(recordId) {
    const record = activeVm.report?.monthlyRecords?.find((item) => item.id === recordId);
    await activeVm.deleteRecord(recordId, {
      title: t('common.delete'),
      description: t(moduleConfig.deleteConfirmKey, {
        dsrName: record?.dsrName || t('dsrFinance.dsr'),
        recordType: t(moduleConfig.recordKey),
      }),
      confirmLabel: t('common.delete'),
      tone: 'rose',
    });
  }

  async function handleSettleDue(payload) {
    const result = await dueVm.settleDue(payload);
    if (result.ok) {
      setShowSettleModal(false);
      pushToast('success', t('dsrDueLedger.settleDue'), t('dsrDueLedger.settleSuccess'));
    }
    return result;
  }

  const dailyRecords = activeVm.report?.dailyRecords || [];
  const monthlyRecords = activeVm.report?.monthlyRecords || [];
  const dueEntries = isDueTab ? [...(dueVm.statement?.entries || [])].reverse() : [];

  async function handleExportAdvanceDailyExcel() {
    const { utils, writeFile } = await import('xlsx');
    const header = ['Date', 'DSR Name', 'Area', 'Amount', 'Note', 'Created By', 'Role'];
    const data = dailyRecords.map((r) => [r.date, r.dsrName, r.dsrArea || '', Number(r.amount), r.note || '', r.performedByName || '', r.performedByRole || '']);
    const ws = utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [{ wch: 14 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 24 }, { wch: 18 }, { wch: 14 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, t('dsrFinance.dailySheetName'));
    writeFile(wb, `dsr-advance-daily-${activeVm.date}.xlsx`);
  }

  async function handleExportAdvanceMonthlyExcel() {
    const { utils, writeFile } = await import('xlsx');
    const header = ['Date', 'DSR Name', 'Area', 'Amount', 'Note'];
    const data = monthlyRecords.map((r) => [r.date, r.dsrName, r.dsrArea || '', Number(r.amount), r.note || '']);
    const ws = utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [{ wch: 14 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 24 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, t('dsrFinance.monthlySheetName'));
    writeFile(wb, `dsr-advance-monthly-${activeVm.month}.xlsx`);
  }

  return (
    <div>
      <SectionHeader
        eyebrow={t('nav.dsrFinance')}
        title={t('dsrFinance.title')}
        description={t('dsrFinance.description')}
        action={canManageDsrFinance && !isDueTab ? (
          <button type="button" className="btn-primary" onClick={() => setModal({})} disabled={activeVm.loading}>
            <Plus size={18} />
            {t(moduleConfig.addKey)}
          </button>
        ) : null}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              type="button"
              className={isActive ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setActiveTab(tab.key)}
            >
              <TabIcon size={16} />
              {t(tab.tabKey)}
            </button>
          );
        })}
      </div>

      {activeVm.error ? (
        <div className="mb-6">
          <Alert type="error">{activeVm.error}</Alert>
        </div>
      ) : null}

      {isDueTab ? (
        <>
          <div className="surface mb-6 p-5">
            <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr_auto]">
              <div>
                <label className="label">{t('dsrDueLedger.dsr')}</label>
                <select className="input" value={dueVm.dsrId} onChange={(event) => dueVm.setDsrId(event.target.value)}>
                  {dsrDirectory.map((dsr) => (
                    <option key={dsr.id} value={dsr.id}>
                      {dsr.name} - {dsr.area}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">{t('dsrDueLedger.dateFrom')}</label>
                <DatePickerField value={dueVm.dateFrom} onChange={dueVm.setDateFrom} />
              </div>
              <div>
                <label className="label">{t('dsrDueLedger.dateTo')}</label>
                <DatePickerField value={dueVm.dateTo} onChange={dueVm.setDateTo} />
              </div>
              <div className="flex items-end gap-2">
                <button type="button" className="btn-secondary" onClick={dueVm.refresh}>
                  <RefreshCw size={16} />
                  {t('dsrDueLedger.refresh')}
                </button>
                <button type="button" className="btn-primary" disabled={!dueVm.dsrId} onClick={() => setShowSettleModal(true)}>
                  <HandCoins size={16} />
                  {t('dsrDueLedger.settleDue')}
                </button>
                {dueVm.statement ? (
                  <>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => { inventoryApi.recordPrint({ entityType: 'dsr_due_statement', entityId: dueVm.dsrId, label: 'pdf' }).catch(() => {}); downloadSheetPdf('dsr-due-statement-print', `dsr-due-statement.pdf`); }}
                    >
                      <Download size={16} />
                      {t('purchaseReceive.downloadPdf')}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => { inventoryApi.recordPrint({ entityType: 'dsr_due_statement', entityId: dueVm.dsrId, label: 'print' }).catch(() => {}); window.print(); }}
                    >
                      <Printer size={16} />
                      {t('purchaseReceive.printSheet')}
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {dueVm.loading ? (
            <TableSkeleton rows={6} columns={6} />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard title={t('dsrDueLedger.openingBalance')} value={formatCurrency(dueVm.statement?.openingBalance || 0)} icon={Wallet} tone="slate" />
                <StatCard title={t('dsrDueLedger.totalDebit')} value={formatCurrency(dueVm.statement?.totalDebit || 0)} icon={Wallet} tone="rose" />
                <StatCard title={t('dsrDueLedger.totalCredit')} value={formatCurrency(dueVm.statement?.totalCredit || 0)} icon={Wallet} tone="emerald" />
                <StatCard title={t('dsrDueLedger.closingBalance')} value={formatCurrency(dueVm.statement?.closingBalance || 0)} icon={Wallet} tone="blue" />
              </div>

              <div id="dsr-due-statement-print" className="surface mt-6 overflow-hidden">
                <div className="border-b border-slate-100 px-5 py-4">
                  <h2 className="text-base font-bold text-slate-950">{t('dsrDueLedger.entriesTitle')}</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="table-head">
                      <tr>
                        <th className="px-4 py-3">{t('dsrDueLedger.when')}</th>
                        <th className="px-4 py-3">{t('dsrDueLedger.type')}</th>
                        <th className="px-4 py-3 text-right">{t('dsrDueLedger.debit')}</th>
                        <th className="px-4 py-3 text-right">{t('dsrDueLedger.credit')}</th>
                        <th className="px-4 py-3 text-right">{t('dsrDueLedger.balanceAfter')}</th>
                        <th className="hidden px-4 py-3 lg:table-cell">{t('dsrDueLedger.reference')}</th>
                        <th className="hidden px-4 py-3 xl:table-cell">{t('dsrDueLedger.createdBy')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dueEntries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50">
                          <td className="table-cell whitespace-nowrap text-sm font-semibold text-slate-700">{formatDateTime(entry.createdAt)}</td>
                          <td className="table-cell">
                            <Badge tone={ledgerTone(entry.type)}>{t(`dsrDueLedger.types.${entry.type}`)}</Badge>
                            {entry.note ? <p className="mt-1 max-w-56 truncate text-xs text-slate-500">{entry.note}</p> : null}
                          </td>
                          <td className="table-cell text-right font-black text-rose-700">{entry.debit ? formatCurrency(entry.debit) : '-'}</td>
                          <td className="table-cell text-right font-black text-emerald-700">{entry.credit ? formatCurrency(entry.credit) : '-'}</td>
                          <td className="table-cell text-right font-black text-slate-950">{formatCurrency(entry.balanceAfter)}</td>
                          <td className="hidden table-cell lg:table-cell">
                            <p className="max-w-52 truncate text-xs font-semibold text-slate-600">{formatReference(entry)}</p>
                          </td>
                          <td className="hidden table-cell xl:table-cell">
                            <p className="font-semibold text-slate-950">{entry.createdByName || '-'}</p>
                            <p className="text-xs text-slate-500">{entry.createdByRole || ''}</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!dueEntries.length ? (
                  <div className="p-5">
                    <EmptyState title={t('dsrDueLedger.emptyTitle')} description={t('dsrDueLedger.emptyDescription')} icon={Wallet} />
                  </div>
                ) : null}
              </div>
            </>
          )}

          {showSettleModal ? (
            <SettleDueModal
              dsr={dueVm.statement?.dsr}
              balance={dueVm.statement?.closingBalance}
              onClose={() => setShowSettleModal(false)}
              onSave={handleSettleDue}
            />
          ) : null}
        </>
      ) : activeVm.loading ? (
        <div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
          </div>
          <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <ChartPanelSkeleton height="h-80" />
            <ChartPanelSkeleton height="h-80" />
          </div>
          <div className="mt-6">
            <TableSkeleton rows={6} columns={6} />
          </div>
          <div className="mt-6">
            <TableSkeleton rows={6} columns={4} />
          </div>
        </div>
      ) : (
        <>
          <div className="surface mb-6 p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">{t('nav.dsrFinance')}</p>
                <p className="mt-2 text-sm text-slate-500">{t('dsrFinance.description')}</p>
              </div>
              <span className="muted-chip">{formatNumber(activeVm.report?.dailyRecords?.length || 0)} {t('common.dsr')}</span>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="label">{t('dsrFinance.reportDate')}</label>
                <DatePickerField value={activeVm.date} onChange={activeVm.setDate} />
              </div>
              <div>
                <label className="label">{t('dsrFinance.reportMonth')}</label>
                <MonthPickerField value={activeVm.month} onChange={activeVm.setMonth} />
              </div>
              <div>
                <label className="label">{t('dsrFinance.dsrFilter')}</label>
                <select className="input" value={activeVm.dsrId} onChange={(event) => activeVm.setDsrId(event.target.value)}>
                  <option value="">{t('dsrFinance.allDsrs')}</option>
                  {dsrDirectory.map((dsr) => (
                    <option key={dsr.id} value={dsr.id}>
                      {dsr.name} - {dsr.area}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title={t('dsrFinance.dailyCount')} value={formatNumber(activeVm.report?.dailySummary?.count || 0)} icon={Icon} tone="blue" helper={t('dsrFinance.dailyCountHelper')} />
            <StatCard title={t('dsrFinance.dailyTotal')} value={formatCurrency(activeVm.report?.dailySummary?.totalAmount || 0)} icon={Icon} tone="emerald" helper={t('dsrFinance.dailyTotalHelper')} />
            <StatCard title={t('dsrFinance.monthlyCount')} value={formatNumber(activeVm.report?.monthlySummary?.count || 0)} icon={Icon} tone="amber" helper={t('dsrFinance.monthlyCountHelper')} />
            <StatCard title={t('dsrFinance.monthlyTotal')} value={formatCurrency(activeVm.report?.monthlySummary?.totalAmount || 0)} icon={Icon} tone="slate" helper={t('dsrFinance.monthlyTotalHelper')} />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <ChartPanel title={t('dsrFinance.dailyReport')} description={t('dsrFinance.dailyReportDescription')}>
              {dailyChartData.length ? (
                <HorizontalBarChart data={dailyChartData} valueFormatter={formatCurrency} />
              ) : (
                <EmptyState title={t('dsrFinance.noDailyTitle')} description={t('dsrFinance.noDailyDescription')} icon={Icon} />
              )}
            </ChartPanel>

            <ChartPanel title={t('dsrFinance.monthlyReport')} description={t('dsrFinance.monthlyReportDescription')}>
              {monthlyChartData.length ? (
                <HorizontalBarChart data={monthlyChartData} valueFormatter={formatCurrency} />
              ) : (
                <EmptyState title={t('dsrFinance.noMonthlyTitle')} description={t('dsrFinance.noMonthlyDescription')} icon={Icon} />
              )}
            </ChartPanel>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <div id="dsr-advance-daily-print" className="surface overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-bold text-slate-950">{t(moduleConfig.dailyListKey, { date: formatDate(activeVm.date) })}</h2>
                  <div className="flex items-center gap-2">
                    <span className="muted-chip">{formatNumber(dailyRecords.length)} {t('common.records')}</span>
                    <button
                      type="button"
                      className="btn-secondary no-print py-1.5 text-xs"
                      onClick={() => { inventoryApi.recordPrint({ entityType: 'dsr_advance', entityId: null, label: 'pdf' }).catch(() => {}); downloadSheetPdf('dsr-advance-daily-print', `dsr-advance-${activeVm.date}.pdf`); }}
                    >
                      <Download size={14} />
                      {t('purchaseReceive.downloadPdf')}
                    </button>
                    <button type="button" className="btn-secondary no-print py-1.5 text-xs" onClick={handleExportAdvanceDailyExcel}>
                      <FileSpreadsheet size={14} />
                      {t('common.exportExcel')}
                    </button>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="table-head">
                    <tr>
                      <th className="px-4 py-3">{t('dsrFinance.date')}</th>
                      <th className="px-4 py-3">{t('dsrFinance.dsr')}</th>
                      <th className="px-4 py-3">{t('dsrFinance.amount')}</th>
                      <th className="px-4 py-3 hidden sm:table-cell">{t('dsrFinance.note')}</th>
                      <th className="px-4 py-3 hidden md:table-cell">{t(moduleConfig.performedByKey)}</th>
                      {canManageDsrFinance ? <th className="px-4 py-3 text-right">{t('common.actions')}</th> : null}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dailyRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50">
                        <td className="table-cell">{formatDate(record.date)}</td>
                        <td className="table-cell">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-950">{record.dsrName}</span>
                            <span className="hidden text-xs text-slate-500 sm:block">{record.dsrArea}</span>
                          </div>
                        </td>
                        <td className="table-cell font-semibold">{formatCurrency(record.amount)}</td>
                        <td className="table-cell hidden sm:table-cell max-w-64"><p className="truncate">{record.note}</p></td>
                        <td className="table-cell hidden md:table-cell">
                          <p className="font-semibold text-slate-950">{record.performedByName || '-'}</p>
                          <p className="text-xs text-slate-500">{record.performedByRole || ''}</p>
                        </td>
                        {canManageDsrFinance ? (
                          <td className="table-cell">
                            <div className="flex justify-end gap-2">
                              <button type="button" className="icon-btn" title={t('common.edit')} onClick={() => setModal(record)}>
                                <Pencil size={16} />
                              </button>
                              <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" title={t('common.delete')} onClick={() => handleDelete(record.id)}>
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!dailyRecords.length ? (
                <div className="p-5">
                  <EmptyState title={t('dsrFinance.noDailyTitle')} description={t('dsrFinance.noDailyDescription')} icon={Icon} />
                </div>
              ) : null}
            </div>

            <div className="surface overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-bold text-slate-950">{t(moduleConfig.monthlyListKey, { month: activeVm.month })}</h2>
                  <div className="flex items-center gap-2">
                    <span className="muted-chip">{formatNumber(monthlyRecords.length)} {t('common.records')}</span>
                    <button type="button" className="btn-secondary py-1.5 text-xs" onClick={handleExportAdvanceMonthlyExcel}>
                      <FileSpreadsheet size={14} />
                      {t('common.exportExcel')}
                    </button>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="table-head">
                    <tr>
                      <th className="px-4 py-3">{t('dsrFinance.date')}</th>
                      <th className="px-4 py-3">{t('dsrFinance.dsr')}</th>
                      <th className="px-4 py-3">{t('dsrFinance.amount')}</th>
                      <th className="px-4 py-3 hidden sm:table-cell">{t('dsrFinance.note')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {monthlyRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50">
                        <td className="table-cell">{formatDate(record.date)}</td>
                        <td className="table-cell">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-950">{record.dsrName}</span>
                            <span className="hidden text-xs text-slate-500 sm:block">{record.dsrArea}</span>
                          </div>
                        </td>
                        <td className="table-cell font-semibold">{formatCurrency(record.amount)}</td>
                        <td className="table-cell hidden sm:table-cell max-w-64"><p className="truncate">{record.note}</p></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!monthlyRecords.length ? (
                <div className="p-5">
                  <EmptyState title={t('dsrFinance.noMonthlyTitle')} description={t('dsrFinance.noMonthlyDescription')} icon={Icon} />
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}

      {modal ? (
        <DsrFinanceFormModal
          kind={activeTab}
          record={modal.id ? modal : null}
          dsrs={dsrDirectory}
          defaultDate={activeVm.date || todayISO()}
          defaultDsrId={activeVm.dsrId}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      ) : null}
    </div>
  );
}
