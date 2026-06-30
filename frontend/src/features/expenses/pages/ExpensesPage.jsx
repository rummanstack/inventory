import { useEffect, useMemo, useState } from 'react';
import { CircleDollarSign, Download, FileSpreadsheet, Pencil, Plus, Trash2 } from 'lucide-react';
import { Alert, Badge, ChartPanel, ChartPanelSkeleton, EmptyState, Pagination, SectionHeader, HorizontalBarChart, StatCard, TableSkeleton } from '../../../components/ui.jsx';
import { DatePickerField, MonthPickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { downloadSheetPdf } from '../../../services/printService.js';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { formatCurrency, formatDate, formatNumber, todayISO } from '../../../utils/calculations.js';
import { toBarChartData } from '../../../utils/charts.js';
import { useExpenseViewModel } from '../viewmodels/useExpenseViewModel';
import ExpenseFormModal from '../components/ExpenseFormModal';

const CATEGORY_CHART_FIELDS = { labelField: 'category', valueField: 'totalAmount' };
const PAGE_SIZE = 20;

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
  const [dailyPage, setDailyPage] = useState(1);
  const [monthlyPage, setMonthlyPage] = useState(1);
  const canManageExpenses = can('manage_expenses');

  useEffect(() => { setDailyPage(1); }, [vm.date]);
  useEffect(() => { setMonthlyPage(1); }, [vm.month]);

  const dailyCategories = useMemo(() => toBarChartData(vm.report?.dailySummary?.byCategory || [], CATEGORY_CHART_FIELDS), [vm.report?.dailySummary?.byCategory]);
  const monthlyCategories = useMemo(() => toBarChartData(vm.report?.monthlySummary?.byCategory || [], CATEGORY_CHART_FIELDS), [vm.report?.monthlySummary?.byCategory]);

  const dailyAll = vm.report?.dailyExpenses || [];
  const monthlyAll = vm.report?.monthlyExpenses || [];

  const dailyTotalPages = Math.ceil(dailyAll.length / PAGE_SIZE);
  const monthlyTotalPages = Math.ceil(monthlyAll.length / PAGE_SIZE);

  const dailyPaged = useMemo(
    () => dailyAll.slice((dailyPage - 1) * PAGE_SIZE, dailyPage * PAGE_SIZE),
    [dailyAll, dailyPage],
  );
  const monthlyPaged = useMemo(
    () => monthlyAll.slice((monthlyPage - 1) * PAGE_SIZE, monthlyPage * PAGE_SIZE),
    [monthlyAll, monthlyPage],
  );

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
    const expense = monthlyAll.find((item) => item.id === expenseId);
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
        eyebrow={t('nav.expenses')}
        title={t('expenses.title')}
        description={t('expenses.description')}
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

      <div className="surface mb-6 p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label mt-3">{t('expenses.reportDate')}</label>
            <DatePickerField value={vm.date} onChange={vm.setDate} max={new Date().toISOString().slice(0, 10)} />
          </div>
          <div>
            <label className="label mt-3">{t('expenses.reportMonth')}</label>
            <MonthPickerField value={vm.month} onChange={vm.setMonth} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title={t('expenses.dailyCount')} value={formatNumber(vm.report?.dailySummary?.count || 0)} icon={CircleDollarSign} tone="blue" helper={t('expenses.dailyCountHelper')} />
        <StatCard title={t('expenses.dailyTotal')} value={formatCurrency(vm.report?.dailySummary?.totalAmount || 0)} icon={CircleDollarSign} tone="emerald" helper={t('expenses.dailyTotalHelper')} />
        <StatCard title={t('expenses.monthlyCount')} value={formatNumber(vm.report?.monthlySummary?.count || 0)} icon={CircleDollarSign} tone="amber" helper={t('expenses.monthlyCountHelper')} />
        <StatCard title={t('expenses.monthlyTotal')} value={formatCurrency(vm.report?.monthlySummary?.totalAmount || 0)} icon={CircleDollarSign} tone="slate" helper={t('expenses.monthlyTotalHelper')} />
      </div>

      {vm.loading ? (
        <div className="mt-6 space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <ChartPanelSkeleton height="h-72" />
            <ChartPanelSkeleton height="h-72" />
          </div>
          <TableSkeleton rows={6} columns={6} />
          <TableSkeleton rows={6} columns={5} />
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <ChartPanel title={t('expenses.dailyReport')} description={t('expenses.dailyReportDescription')}>
              {dailyCategories.length ? (
                <HorizontalBarChart data={dailyCategories} valueFormatter={formatCurrency} />
              ) : (
                <EmptyState title={t('expenses.noDailyTitle')} description={t('expenses.noDailyDescription')} icon={CircleDollarSign} />
              )}
            </ChartPanel>

            <ChartPanel title={t('expenses.monthlyReport')} description={t('expenses.monthlyReportDescription')}>
              {monthlyCategories.length ? (
                <HorizontalBarChart data={monthlyCategories} valueFormatter={formatCurrency} />
              ) : (
                <EmptyState title={t('expenses.noMonthlyTitle')} description={t('expenses.noMonthlyDescription')} icon={CircleDollarSign} />
              )}
            </ChartPanel>
          </div>

          <div className="mt-6 flex flex-col gap-6">
            {/* Daily list */}
            <div id="expenses-daily-print" className="surface overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="section-title">{t('expenses.dailyExpenseList', { date: formatDate(vm.date) })}</h2>
                  <div className="flex items-center gap-2">
                    <span className="muted-chip">{formatNumber(dailyAll.length)} {t('common.records')}</span>
                    <button
                      type="button"
                      className="btn-secondary no-print py-1.5 text-xs"
                      onClick={() => { inventoryApi.recordPrint({ entityType: 'expenses_daily', entityId: null, label: 'pdf' }).catch(() => {}); downloadSheetPdf('expenses-daily-print', `expenses-daily-${vm.date}.pdf`); }}
                    >
                      <Download size={14} />
                      {t('purchaseReceive.downloadPdf')}
                    </button>
                    <button type="button" className="btn-secondary no-print py-1.5 text-xs" onClick={handleExportDailyExcel}>
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
                      <th className="px-4 py-3">{t('expenses.date')}</th>
                      <th className="px-4 py-3">{t('expenses.category')}</th>
                      <th className="px-4 py-3">{t('expenses.amount')}</th>
                      <th className="px-4 py-3 hidden sm:table-cell">{t('expenses.note')}</th>
                      <th className="px-4 py-3 hidden md:table-cell">{t('expenses.createdBy')}</th>
                      {canManageExpenses ? <th className="px-4 py-3 text-right">{t('common.actions')}</th> : null}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dailyPaged.map((expense) => (
                      <tr key={expense.id} className="hover:bg-slate-50">
                        <td className="table-cell">{formatDate(expense.date)}</td>
                        <td className="table-cell"><Badge tone="slate">{tCategory(expense.category)}</Badge></td>
                        <td className="table-cell font-semibold">{formatCurrency(expense.amount)}</td>
                        <td className="table-cell hidden sm:table-cell max-w-64">
                          <p className="truncate">{expense.note}</p>
                        </td>
                        <td className="table-cell hidden md:table-cell">
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
              {!dailyAll.length ? (
                <div className="p-5">
                  <EmptyState title={t('expenses.noDailyTitle')} description={t('expenses.noDailyDescription')} icon={CircleDollarSign} />
                </div>
              ) : null}
              {dailyTotalPages > 1 ? (
                <div className="border-t border-slate-100 px-5 py-4">
                  <Pagination page={dailyPage} totalPages={dailyTotalPages} onPageChange={setDailyPage} />
                </div>
              ) : null}
            </div>

            {/* Monthly list */}
            <div id="expenses-monthly-print" className="surface overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="section-title">{t('expenses.monthlyExpenseList', { month: vm.month })}</h2>
                  <div className="flex items-center gap-2">
                    <span className="muted-chip">{formatNumber(monthlyAll.length)} {t('common.records')}</span>
                    <button
                      type="button"
                      className="btn-secondary no-print py-1.5 text-xs"
                      onClick={() => { inventoryApi.recordPrint({ entityType: 'expenses_monthly', entityId: null, label: 'pdf' }).catch(() => {}); downloadSheetPdf('expenses-monthly-print', `expenses-monthly-${vm.month}.pdf`); }}
                    >
                      <Download size={14} />
                      {t('purchaseReceive.downloadPdf')}
                    </button>
                    <button type="button" className="btn-secondary no-print py-1.5 text-xs" onClick={handleExportMonthlyExcel}>
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
                      <th className="px-4 py-3">{t('expenses.date')}</th>
                      <th className="px-4 py-3">{t('expenses.category')}</th>
                      <th className="px-4 py-3">{t('expenses.amount')}</th>
                      <th className="px-4 py-3 hidden sm:table-cell">{t('expenses.note')}</th>
                      <th className="px-4 py-3 hidden md:table-cell">{t('expenses.createdBy')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {monthlyPaged.map((expense) => (
                      <tr key={expense.id} className="hover:bg-slate-50">
                        <td className="table-cell">{formatDate(expense.date)}</td>
                        <td className="table-cell"><Badge tone="slate">{tCategory(expense.category)}</Badge></td>
                        <td className="table-cell font-semibold">{formatCurrency(expense.amount)}</td>
                        <td className="table-cell hidden sm:table-cell max-w-64">
                          <p className="truncate">{expense.note}</p>
                        </td>
                        <td className="table-cell hidden md:table-cell">
                          <p className="font-semibold text-slate-950">{expense.createdByName || '-'}</p>
                          <p className="text-xs text-slate-500">{expense.createdByRole || ''}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!monthlyAll.length ? (
                <div className="p-5">
                  <EmptyState title={t('expenses.noMonthlyTitle')} description={t('expenses.noMonthlyDescription')} icon={CircleDollarSign} />
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
          defaultDate={vm.date || todayISO()}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      ) : null}
    </div>
  );
}
