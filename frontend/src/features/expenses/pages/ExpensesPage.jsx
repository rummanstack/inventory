import { useEffect, useMemo, useState } from 'react';
import { CircleDollarSign, Download, FileSpreadsheet, Loader2, Pencil, Plus, ReceiptText, Search, Tags, Trash2, TrendingUp, X } from 'lucide-react';
import { Alert, Badge, ChartPanel, ChartPanelSkeleton, EmptyState, MobileCardList, MobileListCard, Pagination, SectionHeader, HorizontalBarChart, StatCard, TableSkeleton, cx } from '../../../components/ui.jsx';
import { DatePickerField, MonthPickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { downloadSheetPdf } from '../../../services/printService.js';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { formatCurrency, formatDate, formatNumber, todayISO } from '../../../utils/calculations.js';
import { toBarChartData } from '../../../utils/charts.js';
import { useExpenseViewModel } from '../viewmodels/useExpenseViewModel';
import ExpenseFormModal from '../components/ExpenseFormModal';
import { useAsyncAction } from '../../../hooks/useAsyncAction.js';

const CATEGORY_CHART_FIELDS = { labelField: 'category', valueField: 'totalAmount' };
const PAGE_SIZE = 20;
const EXPENSE_TABS = [
  { key: 'daily', labelKey: 'expenses.dailyTab', shortcut: 'Alt+1' },
  { key: 'monthly', labelKey: 'expenses.monthlyTab', shortcut: 'Alt+2' },
];

const CATEGORY_I18N_KEYS = {
  Bank: 'expenses.categories.bank',
  Salary: 'expenses.categories.salary',
  Office: 'expenses.categories.office',
  Rent: 'expenses.categories.rent',
  Vehicle: 'expenses.categories.vehicle',
  'Load/Unload': 'expenses.categories.loadUnload',
  Other: 'expenses.categories.other',
};

export default function ExpensesPage() {
  const { t, can, confirm } = useInventoryApp();
  const tCategory = (category) => { const key = CATEGORY_I18N_KEYS[category]; return key ? t(key) : category; };
  const vm = useExpenseViewModel({ confirm });
  const [modal, setModal] = useState(null);
  const [activeTab, setActiveTab] = useState('daily');
  const [dailyPage, setDailyPage] = useState(1);
  const [monthlyPage, setMonthlyPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const canManageExpenses = can('manage_expenses');
  const [downloadingDailyPdf, downloadDailyPdf] = useAsyncAction();
  const [downloadingMonthlyPdf, downloadMonthlyPdf] = useAsyncAction();

  useEffect(() => { setDailyPage(1); }, [vm.date]);
  useEffect(() => { setMonthlyPage(1); }, [vm.month]);
  useEffect(() => { setDailyPage(1); setMonthlyPage(1); }, [search, categoryFilter]);

  useEffect(() => {
    function handleKeyDown(event) {
      const isShortcut = event.altKey && !event.ctrlKey && !event.metaKey;
      if (!isShortcut) return;
      const index = Number(event.key) - 1;
      if (index >= 0 && index < EXPENSE_TABS.length) {
        event.preventDefault();
        setActiveTab(EXPENSE_TABS[index].key);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const dailyCategories = useMemo(() => toBarChartData(vm.report?.dailySummary?.byCategory || [], CATEGORY_CHART_FIELDS), [vm.report?.dailySummary?.byCategory]);
  const monthlyCategories = useMemo(() => toBarChartData(vm.report?.monthlySummary?.byCategory || [], CATEGORY_CHART_FIELDS), [vm.report?.monthlySummary?.byCategory]);

  const dailyAll = vm.report?.dailyExpenses || [];
  const monthlyAll = vm.report?.monthlyExpenses || [];
  const dailyTotal = Number(vm.report?.dailySummary?.totalAmount || 0);
  const monthlyTotal = Number(vm.report?.monthlySummary?.totalAmount || 0);
  const dailyCount = Number(vm.report?.dailySummary?.count || 0);
  const monthlyCount = Number(vm.report?.monthlySummary?.count || 0);
  const activeTotal = activeTab === 'daily' ? dailyTotal : monthlyTotal;
  const activeCount = activeTab === 'daily' ? dailyCount : monthlyCount;
  const activeCategories = activeTab === 'daily' ? dailyCategories : monthlyCategories;
  const topCategory = [...activeCategories].sort((left, right) => Number(right.value || 0) - Number(left.value || 0))[0];

  const filterExpenses = (expenses) => {
    const term = search.trim().toLowerCase();
    return expenses.filter((expense) => {
      const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
      const haystack = [expense.category, expense.note, expense.createdByName, expense.createdByRole].filter(Boolean).join(' ').toLowerCase();
      return matchesCategory && (!term || haystack.includes(term));
    });
  };
  const dailyFiltered = filterExpenses(dailyAll);
  const monthlyFiltered = filterExpenses(monthlyAll);
  const dailyTotalPages = Math.ceil(dailyFiltered.length / PAGE_SIZE);
  const monthlyTotalPages = Math.ceil(monthlyFiltered.length / PAGE_SIZE);

  const dailyPaged = dailyFiltered.slice((dailyPage - 1) * PAGE_SIZE, dailyPage * PAGE_SIZE);
  const monthlyPaged = monthlyFiltered.slice((monthlyPage - 1) * PAGE_SIZE, monthlyPage * PAGE_SIZE);
  const activeAll = activeTab === 'daily' ? dailyAll : monthlyAll;
  const availableCategories = [...new Set(activeAll.map((expense) => expense.category).filter(Boolean))].sort();

  async function handleSave(expense) {
    const result = await vm.saveExpense(expense);
    if (result.ok) {
      setModal(null);
    }
    return result;
  }

  async function handleExportDailyExcel() {
    const { utils, writeFile } = await import('xlsx');
    const header = ['Date', 'Category', 'Amount', 'Note', 'Created By', 'Role'];
    const data = dailyAll.map((e) => [e.date, e.category, Number(e.amount), e.note || '', e.createdByName || '', e.createdByRole || '']);
    const ws = utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [{ wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 28 }, { wch: 18 }, { wch: 14 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, t('expenses.dailySheetName'));
    writeFile(wb, `expenses-daily-${vm.date}.xlsx`);
  }

  async function handleExportMonthlyExcel() {
    const { utils, writeFile } = await import('xlsx');
    const header = ['Date', 'Category', 'Amount', 'Note', 'Created By', 'Role'];
    const data = monthlyAll.map((e) => [e.date, e.category, Number(e.amount), e.note || '', e.createdByName || '', e.createdByRole || '']);
    const ws = utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [{ wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 28 }, { wch: 18 }, { wch: 14 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, t('expenses.monthlySheetName'));
    writeFile(wb, `expenses-monthly-${vm.month}.xlsx`);
  }

  async function handleDelete(expenseId) {
    const expense = [...dailyAll, ...monthlyAll].find((item) => item.id === expenseId);
    await vm.deleteExpense(expenseId, {
      title: t('common.delete'),
      description: t('expenses.deleteConfirm', { category: expense?.category || t('expenses.expense') }),
      confirmLabel: t('common.delete'),
      tone: 'rose',
      requireReason: true,
      reasonLabel: t('common.deleteReasonLabel'),
      reasonPlaceholder: t('common.deleteReasonPlaceholder'),
    });
  }

  return (
    <div>
      <SectionHeader
        title={t('expenses.title')}
        compact
        action={canManageExpenses ? (
          <button type="button" className="btn-primary" onClick={() => setModal({})}>
            <Plus size={18} />
            {t('expenses.add')}
          </button>
        ) : null}
      />

      {vm.error ? (
        <div className="mb-6">
          <Alert type="error">{vm.error}</Alert>
        </div>
      ) : null}

      <div className="surface no-print mb-6 flex flex-col gap-4 p-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="overflow-x-auto">
          <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-400">{t('expenses.reportView')}</span>
          <div className="inline-flex min-w-full gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 sm:min-w-0">
            {EXPENSE_TABS.map((tab) => {
              const selected = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  className={cx(
                    'flex min-h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 text-sm font-bold transition sm:flex-none',
                    selected ? 'border border-indigo-200 bg-white text-indigo-800 shadow-sm ring-2 ring-indigo-100' : 'border border-transparent text-slate-500 hover:bg-white/70 hover:text-slate-800',
                  )}
                  aria-pressed={selected}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {t(tab.labelKey)}
                  <kbd className={cx('rounded border px-1.5 py-0.5 text-[10px] font-black', selected ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-400')}>{tab.shortcut}</kbd>
                </button>
              );
            })}
          </div>
        </div>

        <div className="w-full lg:w-80">
          <label className="label">{activeTab === 'daily' ? t('expenses.reportDate') : t('expenses.reportMonth')}</label>
          {activeTab === 'daily' ? (
            <DatePickerField value={vm.date} onChange={vm.setDate} max={todayISO()} />
          ) : (
            <MonthPickerField value={vm.month} onChange={vm.setMonth} />
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={activeTab === 'daily' ? t('expenses.dailyTotal') : t('expenses.monthlyTotal')}
          value={formatCurrency(activeTotal)}
          icon={CircleDollarSign}
          tone="rose"
        />
        <StatCard
          title={activeTab === 'daily' ? t('expenses.dailyCount') : t('expenses.monthlyCount')}
          value={formatNumber(activeCount)}
          icon={ReceiptText}
          tone="blue"
        />
        <StatCard
          title={t('expenses.averageExpense')}
          value={formatCurrency(activeCount ? activeTotal / activeCount : 0)}
          icon={TrendingUp}
          tone="amber"
        />
        <StatCard
          title={t('expenses.topCategory')}
          value={topCategory ? tCategory(topCategory.label) : t('expenses.noCategory')}
          icon={Tags}
          tone="slate"
        />
      </div>

      {vm.loading ? (
        <div className="mt-6 space-y-6">
          <ChartPanelSkeleton height="h-72" />
          <TableSkeleton rows={6} columns={6} />
        </div>
      ) : activeTab === 'daily' ? (
        <>
          <div className="mt-6">
            <ChartPanel title={t('expenses.dailyReport')} description={t('expenses.dailyReportDescription')}>
              {dailyCategories.length ? (
                <HorizontalBarChart data={dailyCategories} valueFormatter={formatCurrency} />
              ) : (
                <EmptyState title={dailyAll.length ? t('expenses.noMatchesTitle') : t('expenses.noDailyTitle')} description={dailyAll.length ? t('expenses.noMatchesDescription') : t('expenses.noDailyDescription')} icon={CircleDollarSign} />
              )}
            </ChartPanel>
          </div>

          <div className="mt-6">
            {/* Daily list */}
            <div id="expenses-daily-print" className="surface overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h2 className="section-title">{t('expenses.dailyExpenseList', { date: formatDate(vm.date) })}</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="muted-chip">{formatNumber(dailyAll.length)} {t('common.records')}</span>
                    <button
                      type="button"
                      className="btn-secondary no-print py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => downloadDailyPdf(async () => {
                        await inventoryApi.recordPrint({ entityType: 'expenses_daily', entityId: null, label: 'pdf' }).catch(() => {});
                        await downloadSheetPdf('expenses-daily-print', `expenses-daily-${vm.date}.pdf`);
                      })}
                      disabled={downloadingDailyPdf}
                    >
                      {downloadingDailyPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                      {t('purchaseReceive.downloadPdf')}
                    </button>
                    <button type="button" className="btn-secondary no-print py-1.5 text-xs" onClick={handleExportDailyExcel}>
                      <FileSpreadsheet size={14} />
                      {t('common.exportExcel')}
                    </button>
                  </div>
                </div>
              </div>
              <div className="no-print grid gap-3 border-b border-slate-100 bg-slate-50/60 p-4 sm:grid-cols-[minmax(0,1fr)_220px_auto]">
                <label className="relative">
                  <span className="sr-only">{t('expenses.searchExpenses')}</span>
                  <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input className="input pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('expenses.searchExpenses')} />
                </label>
                <select className="input" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                  <option value="all">{t('expenses.allCategories')}</option>
                  {availableCategories.map((category) => <option key={category} value={category}>{tCategory(category)}</option>)}
                </select>
                <button
                  type="button"
                  className="btn-secondary min-h-10 justify-center disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!search && categoryFilter === 'all'}
                  onClick={() => { setSearch(''); setCategoryFilter('all'); }}
                >
                  <X size={15} />
                  {t('expenses.resetFilters')}
                </button>
              </div>
              <MobileCardList>
                {dailyPaged.map((expense) => (
                  <MobileListCard
                    key={expense.id}
                    title={tCategory(expense.category)}
                    subtitle={`${formatDate(expense.date)}${expense.note ? ` · ${expense.note}` : ''}`}
                    value={formatCurrency(expense.amount)}
                    valueClass="text-rose-600"
                    valueSub={expense.createdByName || null}
                    action={canManageExpenses ? (
                      <>
                        <button type="button" className="icon-btn" title={t('common.edit')} onClick={() => setModal(expense)}>
                          <Pencil size={16} />
                        </button>
                        <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" title={t('common.delete')} onClick={() => handleDelete(expense.id)}>
                          <Trash2 size={16} />
                        </button>
                      </>
                    ) : null}
                  />
                ))}
              </MobileCardList>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full">
                  <thead className="table-head">
                    <tr>
                      <th className="px-4 py-3">{t('expenses.date')}</th>
                      <th className="px-4 py-3">{t('expenses.category')}</th>
                      <th className="px-4 py-3">{t('expenses.amount')}</th>
                      <th className="px-4 py-3">{t('expenses.note')}</th>
                      <th className="px-4 py-3">{t('expenses.createdBy')}</th>
                      {canManageExpenses ? <th className="px-4 py-3 text-right">{t('common.actions')}</th> : null}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dailyPaged.map((expense) => (
                      <tr key={expense.id} className="hover:bg-slate-50">
                        <td className="table-cell">{formatDate(expense.date)}</td>
                        <td className="table-cell"><Badge tone="slate">{tCategory(expense.category)}</Badge></td>
                        <td className="table-cell font-bold text-rose-600">{formatCurrency(expense.amount)}</td>
                        <td className="table-cell max-w-64">
                          <p className="truncate">{expense.note}</p>
                        </td>
                        <td className="table-cell">
                          <p className="font-semibold text-slate-950">{expense.createdByName || '-'}</p>
                          <p className="text-xs text-slate-500">{expense.createdByRole || ''}</p>
                        </td>
                        {canManageExpenses ? (
                          <td className="table-cell">
                            <div className="row-actions flex justify-end gap-2">
                              <button type="button" className="icon-btn" title={t('common.edit')} onClick={() => setModal(expense)}>
                                <Pencil size={16} />
                              </button>
                              <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" title={t('common.delete')} onClick={() => handleDelete(expense.id)}>
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
              {!dailyFiltered.length ? (
                <div className="p-5">
                  <EmptyState title={dailyAll.length ? t('expenses.noMatchesTitle') : t('expenses.noDailyTitle')} description={dailyAll.length ? t('expenses.noMatchesDescription') : t('expenses.noDailyDescription')} icon={CircleDollarSign} />
                </div>
              ) : null}
              {dailyTotalPages > 1 ? (
                <div className="border-t border-slate-100 px-5 py-4">
                  <Pagination page={dailyPage} totalPages={dailyTotalPages} onPageChange={setDailyPage} />
                </div>
              ) : null}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="mt-6">
            <ChartPanel title={t('expenses.monthlyReport')} description={t('expenses.monthlyReportDescription')}>
              {monthlyCategories.length ? (
                <HorizontalBarChart data={monthlyCategories} valueFormatter={formatCurrency} />
              ) : (
                <EmptyState title={monthlyAll.length ? t('expenses.noMatchesTitle') : t('expenses.noMonthlyTitle')} description={monthlyAll.length ? t('expenses.noMatchesDescription') : t('expenses.noMonthlyDescription')} icon={CircleDollarSign} />
              )}
            </ChartPanel>
          </div>

          <div className="mt-6">
            {/* Monthly list */}
            <div id="expenses-monthly-print" className="surface overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h2 className="section-title">{t('expenses.monthlyExpenseList', { month: vm.month })}</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="muted-chip">{formatNumber(monthlyAll.length)} {t('common.records')}</span>
                    <button
                      type="button"
                      className="btn-secondary no-print py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => downloadMonthlyPdf(async () => {
                        await inventoryApi.recordPrint({ entityType: 'expenses_monthly', entityId: null, label: 'pdf' }).catch(() => {});
                        await downloadSheetPdf('expenses-monthly-print', `expenses-monthly-${vm.month}.pdf`);
                      })}
                      disabled={downloadingMonthlyPdf}
                    >
                      {downloadingMonthlyPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                      {t('purchaseReceive.downloadPdf')}
                    </button>
                    <button type="button" className="btn-secondary no-print py-1.5 text-xs" onClick={handleExportMonthlyExcel}>
                      <FileSpreadsheet size={14} />
                      {t('common.exportExcel')}
                    </button>
                  </div>
                </div>
              </div>
              <div className="no-print grid gap-3 border-b border-slate-100 bg-slate-50/60 p-4 sm:grid-cols-[minmax(0,1fr)_220px_auto]">
                <label className="relative">
                  <span className="sr-only">{t('expenses.searchExpenses')}</span>
                  <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input className="input pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('expenses.searchExpenses')} />
                </label>
                <select className="input" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                  <option value="all">{t('expenses.allCategories')}</option>
                  {availableCategories.map((category) => <option key={category} value={category}>{tCategory(category)}</option>)}
                </select>
                <button
                  type="button"
                  className="btn-secondary min-h-10 justify-center disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!search && categoryFilter === 'all'}
                  onClick={() => { setSearch(''); setCategoryFilter('all'); }}
                >
                  <X size={15} />
                  {t('expenses.resetFilters')}
                </button>
              </div>
              <MobileCardList>
                {monthlyPaged.map((expense) => (
                  <MobileListCard
                    key={expense.id}
                    title={tCategory(expense.category)}
                    subtitle={`${formatDate(expense.date)}${expense.note ? ` · ${expense.note}` : ''}`}
                    value={formatCurrency(expense.amount)}
                    valueClass="text-rose-600"
                    valueSub={expense.createdByName || null}
                    action={canManageExpenses ? (
                      <>
                        <button type="button" className="icon-btn" title={t('common.edit')} onClick={() => setModal(expense)}><Pencil size={16} /></button>
                        <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" title={t('common.delete')} onClick={() => handleDelete(expense.id)}><Trash2 size={16} /></button>
                      </>
                    ) : null}
                  />
                ))}
              </MobileCardList>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full">
                  <thead className="table-head">
                    <tr>
                      <th className="px-4 py-3">{t('expenses.date')}</th>
                      <th className="px-4 py-3">{t('expenses.category')}</th>
                      <th className="px-4 py-3">{t('expenses.amount')}</th>
                      <th className="px-4 py-3">{t('expenses.note')}</th>
                      <th className="px-4 py-3">{t('expenses.createdBy')}</th>
                      {canManageExpenses ? <th className="px-4 py-3 text-right">{t('common.actions')}</th> : null}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {monthlyPaged.map((expense) => (
                      <tr key={expense.id} className="hover:bg-slate-50">
                        <td className="table-cell">{formatDate(expense.date)}</td>
                        <td className="table-cell"><Badge tone="slate">{tCategory(expense.category)}</Badge></td>
                        <td className="table-cell font-bold text-rose-600">{formatCurrency(expense.amount)}</td>
                        <td className="table-cell max-w-64">
                          <p className="truncate">{expense.note}</p>
                        </td>
                        <td className="table-cell">
                          <p className="font-semibold text-slate-950">{expense.createdByName || '-'}</p>
                          <p className="text-xs text-slate-500">{expense.createdByRole || ''}</p>
                        </td>
                        {canManageExpenses ? (
                          <td className="table-cell">
                            <div className="row-actions flex justify-end gap-2">
                              <button type="button" className="icon-btn" title={t('common.edit')} onClick={() => setModal(expense)}><Pencil size={16} /></button>
                              <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" title={t('common.delete')} onClick={() => handleDelete(expense.id)}><Trash2 size={16} /></button>
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!monthlyFiltered.length ? (
                <div className="p-5">
                  <EmptyState title={monthlyAll.length ? t('expenses.noMatchesTitle') : t('expenses.noMonthlyTitle')} description={monthlyAll.length ? t('expenses.noMatchesDescription') : t('expenses.noMonthlyDescription')} icon={CircleDollarSign} />
                </div>
              ) : null}
              {monthlyTotalPages > 1 ? (
                <div className="border-t border-slate-100 px-5 py-4">
                  <Pagination page={monthlyPage} totalPages={monthlyTotalPages} onPageChange={setMonthlyPage} />
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}

      {modal ? (
        <ExpenseFormModal
          expense={modal.id ? modal : null}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      ) : null}
    </div>
  );
}
