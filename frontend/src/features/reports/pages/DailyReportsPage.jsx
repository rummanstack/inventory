import { useEffect, useState } from 'react';
import { CircleDollarSign, Download, Eye, FileSpreadsheet, FileText, Loader2, Package, PackageCheck, Printer, RotateCcw, Share2, Truck, TrendingUp, Percent, Users, ReceiptText, Wallet, BadgeDollarSign, CheckCircle2 } from 'lucide-react';
import PrintableSheet from '../../../components/PrintableSheet.jsx';
import TableReportActions from '../../../components/TableReportActions.jsx';
import { Alert, EmptyState, MobileCardList, MobileListCard, SectionHeader, StatCard, StatCardSkeleton, TableSkeleton, cx } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { buildPdfFileName, downloadSheetPdf } from '../../../services/printService.js';
import { inventoryApi } from '../../../services/inventoryApi';
import { formatCurrency, formatDate, formatNumber } from '../../../utils/calculations.js';
import { useDailyReportsViewModel } from '../viewmodels/useDailyReportsViewModel';
import DailyClosePanel from '../components/DailyClosePanel.jsx';
import { useAsyncAction } from '../../../hooks/useAsyncAction.js';

const TAB_SHORTCUTS = ['Alt+1', 'Alt+2', 'Alt+3', 'Alt+4', 'Alt+5', 'Alt+6', 'Alt+7', 'Alt+8'];
const REPORT_TABLE_SHORTCUTS = {
  pdf: { alt: true, key: 'd', label: 'Alt+D' },
  excel: { alt: true, key: 'e', label: 'Alt+E' },
  csv: { alt: true, key: 'c', label: 'Alt+C' },
  print: { alt: true, key: 'p', label: 'Alt+P' },
};

export default function DailyReportsPage() {
  const { productDirectory, dsrDirectory, today, t, tenant, language } = useInventoryApp();
  const vm = useDailyReportsViewModel({ products: productDirectory, dsrs: dsrDirectory, today, t, tenantName: tenant?.name });
  const [downloadingSheetPdf, downloadSheetPdfAction] = useAsyncAction();
  const [sharingSheetPdf, shareSheetPdfAction] = useAsyncAction();
  const [activeTab, setActiveTab] = useState('dsr');
  const dueCollectedTotal = vm.dueCollectionRows.reduce((sum, r) => sum + r.total, 0);
  const reportFileSuffix = vm.isSingleDay ? vm.dateFrom : `${vm.dateFrom}-to-${vm.dateTo}`;
  const reportSubtitle = vm.isSingleDay ? vm.dateFrom : `${vm.dateFrom} to ${vm.dateTo}`;

  const tabs = [
    { key: 'dsr', labelKey: 'reports.tabDsr', icon: Truck },
    { key: 'products', labelKey: 'reports.tabProducts', icon: Package },
    { key: 'sr', labelKey: 'reports.tabSr', icon: Users },
    { key: 'expenses', labelKey: 'reports.tabExpenses', icon: ReceiptText },
    { key: 'salary', labelKey: 'reports.tabSalary', icon: BadgeDollarSign },
    { key: 'dueCollections', labelKey: 'reports.tabDueCollections', icon: CircleDollarSign },
    { key: 'dueBalances', labelKey: 'reports.tabDueBalances', icon: Wallet },
    ...(vm.isSingleDay ? [{ key: 'dailyClose', labelKey: 'reports.tabDailyClose', icon: CheckCircle2 }] : []),
  ];

  useEffect(() => {
    if (!tabs.some((tab) => tab.key === activeTab)) {
      setActiveTab('dsr');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vm.isSingleDay]);

  useEffect(() => {
    function handleKeyDown(event) {
      const isShortcut = event.altKey && !event.ctrlKey && !event.metaKey;
      if (!isShortcut) return;
      const index = Number(event.key) - 1;
      if (index >= 0 && index < tabs.length) {
        event.preventDefault();
        setActiveTab(tabs[index].key);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs.map((tab) => tab.key).join(',')]);

  function recordReportPrint(label) {
    if (!vm.selectedSheet) return;
    inventoryApi.recordPrint({ entityType: 'report', entityId: vm.selectedSheet.dsrId, label: `${vm.selectedSheet.date} ${label}` }).catch(() => {});
  }

  async function handleExportSheetExcel() {
    const sheet = vm.selectedSheet;
    if (!sheet) return;
    const { utils, writeFile } = await import('xlsx');
    const rows = [...(sheet.items || []), ...(sheet.extraReturns || []).map((item) => ({ ...item, isExtraReturn: true }))];
    const header = [t('products.product'), t('settlement.issued'), t('settlement.returnCase'), t('settlement.damagedCase'), t('settlement.sold'), t('settlement.rate'), t('settlement.payable')];
    const data = rows.map((item) => [
      item.productName,
      Number(item.issuedPieces || 0),
      Number(item.returnedPieces || 0),
      Number(item.damagedPieces || 0),
      Number(item.soldPieces || 0),
      Number(item.rate || 0),
      Number(item.payable || 0),
    ]);
    const ws = utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [{ wch: 24 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, t('reports.printableSheet'));
    writeFile(wb, `${sheet.dsrName || 'dsr'}-${sheet.date}.xlsx`.toLowerCase().replace(/[^a-z0-9.-]+/g, '-'));
  }

  if (vm.loading) {
    return (
      <div>
        <SectionHeader eyebrow={t('nav.reports')} title={t('nav.reports')} description={t('reports.description')} />
        <div className="surface mb-6 grid gap-4 p-5 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200" />
              <div className="h-11 animate-pulse rounded-2xl bg-slate-100" />
            </div>
          ))}
        </div>
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
        <TableSkeleton rows={6} columns={7} />
      </div>
    );
  }

  const dateLabel = vm.isSingleDay
    ? formatDate(vm.dateFrom, language)
    : `${formatDate(vm.dateFrom, language)} - ${formatDate(vm.dateTo, language)}`;

  return (
    <div>
      <SectionHeader eyebrow={t('nav.reports')} title={t('nav.reports')} description={t('reports.description')} />

      {/* Date range pickers */}
      <div className="surface mb-6 grid gap-4 p-5 sm:grid-cols-2">
        <div>
          <label className="label">{t('profit.dateFrom')}</label>
          <DatePickerField value={vm.dateFrom} onChange={vm.setDateFrom} max={vm.dateTo} />
        </div>
        <div>
          <label className="label">{t('profit.dateTo')}</label>
          <DatePickerField value={vm.dateTo} onChange={vm.setDateTo} min={vm.dateFrom} max={new Date().toISOString().slice(0, 10)} />
        </div>
      </div>

      {vm.error ? (
        <Alert type="error">{vm.error}</Alert>
      ) : (
        <>
          {/* 8 stat cards */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title={t('reports.issued')} value={formatCurrency(vm.totals.issuedValue)} helper={`${formatNumber(vm.totals.issuedPieces, language)} ${t('common.pcs')}`} icon={Truck} tone="amber" />
            <StatCard title={t('reports.returned')} value={formatCurrency(vm.totals.returnValue)} helper={`${formatNumber(vm.totals.returnedPieces, language)} ${t('common.pcs')}`} icon={RotateCcw} tone="slate" />
            <StatCard title={t('reports.sold')} value={formatCurrency(vm.totals.totalPayable)} helper={`${formatNumber(vm.totals.soldPieces, language)} ${t('common.pcs')}`} icon={PackageCheck} tone="emerald" />
            <StatCard title={t('reports.paid')} value={formatCurrency(vm.totals.amountPaid)} helper={`${formatNumber(vm.rows.length)} ${t('common.dsr')}`} icon={CircleDollarSign} tone="blue" />
            <StatCard
              title={t('reports.due')}
              value={formatCurrency(vm.dueBreakdown.total)}
              helper={t('reports.dueBreakdown', {
                dsr: formatCurrency(vm.dueBreakdown.dsrDue),
                sr: formatCurrency(vm.dueBreakdown.srDue),
                customer: formatCurrency(vm.dueBreakdown.customerDue),
              })}
              icon={Wallet}
              tone="rose"
            />
            <StatCard title={t('reports.srHandover')} value={formatCurrency(vm.totals.srHandover)} icon={Users} tone="indigo" />
            <StatCard title={t('reports.discount')} value={formatCurrency(vm.totals.discount)} icon={Percent} tone="amber" />
            <StatCard title={t('reports.profit')} value={vm.profitTotals ? formatCurrency(vm.profitTotals.profit) : '-'} icon={TrendingUp} tone={vm.profitTotals && vm.profitTotals.profit >= 0 ? 'emerald' : 'rose'} />
          </div>

          {/* Report tabs */}
          <div className="no-print mb-6 overflow-x-auto">
            <div className="inline-flex min-w-full gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 sm:min-w-0">
              {tabs.map((tab, index) => {
                const Icon = tab.icon;
                const selected = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    className={cx(
                      'flex min-h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 text-sm font-bold transition sm:flex-none',
                      selected ? 'border border-indigo-200 bg-indigo-50 text-indigo-800 shadow-sm ring-2 ring-indigo-100' : 'border border-transparent text-slate-500 hover:bg-white/70 hover:text-slate-800',
                    )}
                    aria-pressed={selected}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    <Icon size={16} />
                    {t(tab.labelKey)}
                    <kbd className={cx('rounded border px-1.5 py-0.5 text-[10px] font-black', selected ? 'border-indigo-200 bg-white text-indigo-700' : 'border-slate-200 bg-white text-slate-400')}>{TAB_SHORTCUTS[index]}</kbd>
                  </button>
                );
              })}
            </div>
          </div>

          {/* DSR Table */}
          {activeTab === 'dsr' ? (
          <div id="daily-reports-dsr-table" className="surface overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="section-title">
                  {vm.isSingleDay ? t('reports.dsrTable', { date: formatDate(vm.dateFrom, language) }) : t('reports.dsrTableRange')}
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  <TableReportActions
                    targetId="daily-reports-dsr-table"
                    title={vm.isSingleDay ? t('reports.dsrTable', { date: formatDate(vm.dateFrom, language) }) : t('reports.dsrTableRange')}
                    subtitle={reportSubtitle}
                    fileName={`daily-reports-dsr-${reportFileSuffix}`}
                    entityType="daily_reports_dsr"
                    t={t}
                    className="flex flex-wrap gap-2 no-print"
                    shortcuts={REPORT_TABLE_SHORTCUTS}
                  />
                </div>
              </div>
            </div>
            <MobileCardList>
              {vm.rows.map((row) => {
                const rowDue = Math.max(0, row.totalPayable - row.discount - row.amountPaid);
                return (
                  <MobileListCard
                    key={row.dsrId}
                    onClick={vm.isSingleDay && row.settlementCount > 0 ? () => vm.viewSheet(row) : undefined}
                    title={row.dsrName}
                    subtitle={`${row.area} · ${formatNumber(row.soldPieces)} ${t('common.pcs')}`}
                    value={formatCurrency(row.totalPayable)}
                    valueSub={rowDue > 0 ? formatCurrency(rowDue) : null}
                    valueClass={rowDue > 0 ? 'text-rose-600' : undefined}
                  />
                );
              })}
              {vm.rows.length === 0 ? (
                <div className="p-5">
                  <EmptyState title={t('reports.noRouteTitle')} description={t('reports.noRouteDescription')} icon={FileText} />
                </div>
              ) : null}
            </MobileCardList>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-3">{t('dsr.title')}</th>
                    <th className="px-4 py-3">{t('reports.issued')}</th>
                    <th className="px-4 py-3">{t('reports.returned')}</th>
                    <th className="px-4 py-3">{t('reports.sold')}</th>
                    <th className="px-4 py-3">{t('reports.paid')}</th>
                    <th className="px-4 py-3">{t('reports.due')}</th>
                    <th className="px-4 py-3">{t('reports.discount')}</th>
                    {vm.isSingleDay && <th className="px-4 py-3 text-right no-print">{t('reports.sheet')}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vm.rows.map((row) => {
                    const rowDue = Math.max(0, row.totalPayable - row.discount - row.amountPaid);
                    return (
                      <tr key={row.dsrId} className="hover:bg-slate-50">
                        <td className="table-cell">
                          <p className="font-semibold text-slate-950">{row.dsrName}</p>
                          <p className="text-xs text-slate-500">{row.area}</p>
                        </td>
                        <td className="table-cell">
                          <span className="font-semibold text-slate-950">{formatCurrency(row.issuedValue)}</span>
                          <span className="ml-1 text-xs text-slate-400">{formatNumber(row.issuedPieces)} {t('common.pcs')}</span>
                        </td>
                        <td className="table-cell">
                          <span className="font-semibold text-slate-950">{formatCurrency(row.returnValue)}</span>
                          <span className="ml-1 text-xs text-slate-400">{formatNumber(row.returnedPieces)} {t('common.pcs')}</span>
                        </td>
                        <td className="table-cell">
                          <span className="font-semibold text-slate-950">{formatCurrency(row.totalPayable)}</span>
                          <span className="ml-1 text-xs text-slate-400">{formatNumber(row.soldPieces)} {t('common.pcs')}</span>
                        </td>
                        <td className="table-cell">{formatCurrency(row.amountPaid)}</td>
                        <td className="table-cell text-rose-600">{formatCurrency(rowDue)}</td>
                        <td className="table-cell text-amber-600">{formatCurrency(row.discount)}</td>
                        {vm.isSingleDay && (
                          <td className="table-cell text-right no-print">
                            <button
                              type="button"
                              className="btn-secondary h-9 px-3"
                              onClick={() => vm.viewSheet(row)}
                              disabled={row.settlementCount === 0}
                            >
                              <Eye size={16} />
                              {t('reports.view')}
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {vm.rows.length === 0 && (
                    <tr>
                      <td colSpan={vm.isSingleDay ? 8 : 7} className="p-5">
                        <EmptyState title={t('reports.noRouteTitle')} description={t('reports.noRouteDescription')} icon={FileText} />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          ) : null}

          {/* Product Wise Sell */}
          {activeTab === 'products' ? (
          <div id="daily-reports-product-table" className="surface overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="section-title">{t('reports.productWiseTable')}</h2>
                  <p className="mt-0.5 text-xs text-slate-400">{t('reports.productWiseTableDescription')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <TableReportActions
                    targetId="daily-reports-product-table"
                    title={t('reports.productWiseTable')}
                    subtitle={reportSubtitle}
                    fileName={`daily-reports-products-${reportFileSuffix}`}
                    entityType="daily_reports_products"
                    t={t}
                    className="flex flex-wrap gap-2 no-print"
                    shortcuts={REPORT_TABLE_SHORTCUTS}
                  />
                  {vm.productRows.length > 0 && <span className="muted-chip">{formatNumber(vm.productRows.length)} {t('products.product')}</span>}
                </div>
              </div>
            </div>
            {vm.productRows.length === 0 ? (
              <EmptyState title={t('reports.noProductSales')} description={t('reports.noProductSalesDescription')} icon={Package} />
            ) : (
              <>
              <MobileCardList>
                {vm.productRows.map((row) => (
                  <MobileListCard
                    key={row.productId}
                    title={row.productName}
                    subtitle={`${formatNumber(row.quantitySold)} ${t('common.pcs')} ${t('reports.sold')}`}
                    value={formatCurrency(row.revenue)}
                    valueSub={formatCurrency(row.profit)}
                    valueClass={row.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}
                  />
                ))}
              </MobileCardList>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full">
                  <thead className="table-head">
                    <tr>
                      <th className="px-4 py-3">{t('products.product')}</th>
                      <th className="px-4 py-3 text-right">{t('reports.quantitySold')}</th>
                      <th className="px-4 py-3 text-right">{t('reports.revenue')}</th>
                      <th className="px-4 py-3 text-right">{t('reports.profit')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vm.productRows.map((row) => (
                      <tr key={row.productId} className="hover:bg-slate-50">
                        <td className="table-cell font-semibold text-slate-950">{row.productName}</td>
                        <td className="table-cell text-right">{formatNumber(row.quantitySold)} {t('common.pcs')}</td>
                        <td className="table-cell text-right font-semibold text-slate-950">{formatCurrency(row.revenue)}</td>
                        <td className={`table-cell text-right font-semibold ${row.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(row.profit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>
          ) : null}

          {/* SR Table */}
          {activeTab === 'sr' ? (
          <div id="daily-reports-sr-table" className="surface overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="section-title">{t('reports.srTable')}</h2>
                  <p className="mt-0.5 text-xs text-slate-400">{t('reports.srTableDescription')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <TableReportActions
                    targetId="daily-reports-sr-table"
                    title={t('reports.srTable')}
                    subtitle={reportSubtitle}
                    fileName={`daily-reports-sr-${reportFileSuffix}`}
                    entityType="daily_reports_sr"
                    t={t}
                    className="flex flex-wrap gap-2 no-print"
                    shortcuts={REPORT_TABLE_SHORTCUTS}
                  />
                  {vm.srRows.length > 0 && <span className="muted-chip">{formatNumber(vm.srRows.length)} SR</span>}
                </div>
              </div>
            </div>
            {vm.srRows.length === 0 ? (
              <EmptyState title={t('reports.noSrData')} description={t('reports.noSrDataDescription')} icon={Users} />
            ) : (
              <>
              <MobileCardList>
                {vm.srRows.map((row) => (
                  <MobileListCard
                    key={row.srId}
                    title={row.srName}
                    subtitle={`${t('reports.handover')} ${formatCurrency(row.handover)}`}
                    value={formatCurrency(row.collected)}
                    valueSub={formatCurrency(Math.max(0, row.handover - row.collected))}
                    valueClass="text-emerald-600"
                  />
                ))}
              </MobileCardList>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full">
                  <thead className="table-head">
                    <tr>
                      <th className="px-4 py-3">SR</th>
                      <th className="px-4 py-3 text-right">{t('reports.handover')}</th>
                      <th className="px-4 py-3 text-right">{t('reports.srCollected')}</th>
                      <th className="px-4 py-3 text-right">{t('reports.due')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vm.srRows.map((row) => (
                      <tr key={row.srId} className="hover:bg-slate-50">
                        <td className="table-cell font-semibold text-slate-950">{row.srName}</td>
                        <td className="table-cell text-right font-semibold text-slate-950">{formatCurrency(row.handover)}</td>
                        <td className="table-cell text-right font-semibold text-emerald-600">{formatCurrency(row.collected)}</td>
                        <td className="table-cell text-right text-rose-600">
                          {formatCurrency(Math.max(0, row.handover - row.collected))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>
          ) : null}

          {/* Expense Table */}
          {activeTab === 'expenses' ? (
          <div id="daily-reports-expense-table" className="surface overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="section-title">{t('reports.expenseTable')}</h2>
                  <p className="mt-0.5 text-xs text-slate-400">{t('reports.expenseTableDescription')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <TableReportActions
                    targetId="daily-reports-expense-table"
                    title={t('reports.expenseTable')}
                    subtitle={reportSubtitle}
                    fileName={`daily-reports-expenses-${reportFileSuffix}`}
                    entityType="daily_reports_expenses"
                    t={t}
                    className="flex flex-wrap gap-2 no-print"
                    shortcuts={REPORT_TABLE_SHORTCUTS}
                  />
                  {vm.expenseRows.length > 0 && (
                    <span className="muted-chip">{formatCurrency(vm.expenseRows.reduce((s, r) => s + r.totalAmount, 0))}</span>
                  )}
                </div>
              </div>
            </div>
            {vm.expenseRows.length === 0 ? (
              <EmptyState title={t('reports.noExpenses')} description={t('reports.noExpensesDescription')} icon={ReceiptText} />
            ) : (
              <>
              <MobileCardList>
                {vm.expenseRows.map((row) => (
                  <MobileListCard
                    key={row.category}
                    title={row.category}
                    value={formatCurrency(row.totalAmount)}
                    valueClass="text-rose-600"
                  />
                ))}
              </MobileCardList>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full">
                  <thead className="table-head">
                    <tr>
                      <th className="px-4 py-3">{t('reports.expenseType')}</th>
                      <th className="px-4 py-3 text-right">{t('reports.expenseTotal')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vm.expenseRows.map((row) => (
                      <tr key={row.category} className="hover:bg-slate-50">
                        <td className="table-cell font-semibold text-slate-950">{row.category}</td>
                        <td className="table-cell text-right font-semibold text-rose-600">{formatCurrency(row.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>
          ) : null}

          {/* Salary Table */}
          {activeTab === 'salary' ? (
          <div id="daily-reports-salary-table" className="surface overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="section-title">{t('reports.salaryTable')}</h2>
                  <p className="mt-0.5 text-xs text-slate-400">{t('reports.salaryTableDescription')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <TableReportActions
                    targetId="daily-reports-salary-table"
                    title={t('reports.salaryTable')}
                    subtitle={reportSubtitle}
                    fileName={`daily-reports-salary-${reportFileSuffix}`}
                    entityType="daily_reports_salary"
                    t={t}
                    className="flex flex-wrap gap-2 no-print"
                    shortcuts={REPORT_TABLE_SHORTCUTS}
                  />
                  {vm.salaryRows.length > 0 && (
                    <span className="muted-chip">{formatCurrency(vm.salaryRows.reduce((s, r) => s + r.totalPaid, 0))}</span>
                  )}
                </div>
              </div>
            </div>
            {vm.salaryRows.length === 0 ? (
              <EmptyState title={t('reports.noSalary')} description={t('reports.noSalaryDescription')} icon={BadgeDollarSign} />
            ) : (
              <>
              <MobileCardList>
                {vm.salaryRows.map((row) => (
                  <MobileListCard
                    key={row.employeeId}
                    title={row.employeeName}
                    value={formatCurrency(row.totalPaid)}
                    valueClass="text-emerald-600"
                  />
                ))}
              </MobileCardList>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full">
                  <thead className="table-head">
                    <tr>
                      <th className="px-4 py-3">{t('reports.employee')}</th>
                      <th className="px-4 py-3 text-right">{t('reports.salaryPaid')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vm.salaryRows.map((row) => (
                      <tr key={row.employeeId} className="hover:bg-slate-50">
                        <td className="table-cell font-semibold text-slate-950">{row.employeeName}</td>
                        <td className="table-cell text-right font-semibold text-emerald-600">{formatCurrency(row.totalPaid)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>
          ) : null}

          {/* Due Collections */}
          {activeTab === 'dueCollections' ? (
          <div id="daily-reports-due-collections-table" className="surface overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="section-title">{t('reports.dueCollections', { date: dateLabel })}</h2>
                  <p className="mt-0.5 text-xs text-slate-400">{t('reports.dueCollectionsDescription')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <TableReportActions
                    targetId="daily-reports-due-collections-table"
                    title={t('reports.dueCollections', { date: dateLabel })}
                    subtitle={reportSubtitle}
                    fileName={`daily-reports-due-collections-${reportFileSuffix}`}
                    entityType="daily_reports_due_collections"
                    t={t}
                    className="flex flex-wrap gap-2 no-print"
                    shortcuts={REPORT_TABLE_SHORTCUTS}
                  />
                  {vm.dueCollectionRows.length > 0 && <span className="muted-chip">{formatCurrency(dueCollectedTotal)}</span>}
                </div>
              </div>
            </div>
            {vm.dueCollectionRows.length === 0 ? (
              <EmptyState title={t('reports.noDueCollections')} description={t('reports.noDueCollectionsDescription')} icon={CircleDollarSign} />
            ) : (
              <>
              <MobileCardList>
                {vm.dueCollectionRows.map((row) => (
                  <MobileListCard
                    key={row.dsrId}
                    title={row.dsrName}
                    subtitle={row.area}
                    value={formatCurrency(row.total)}
                    valueClass="text-emerald-600"
                  />
                ))}
              </MobileCardList>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full">
                  <thead className="table-head">
                    <tr>
                      <th className="px-4 py-3">{t('common.dsr')}</th>
                      <th className="px-4 py-3">{t('dsr.area')}</th>
                      <th className="px-4 py-3 text-right">{t('reports.collected')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vm.dueCollectionRows.map((row) => (
                      <tr key={row.dsrId} className="hover:bg-slate-50">
                        <td className="table-cell font-semibold text-slate-950">{row.dsrName}</td>
                        <td className="table-cell text-slate-500">{row.area}</td>
                        <td className="table-cell text-right font-semibold text-emerald-600">{formatCurrency(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>
          ) : null}

          {/* DSR Outstanding Due Balances */}
          {activeTab === 'dueBalances' ? (
          <div id="daily-reports-due-balances-table" className="surface overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="section-title">{t('reports.dueBalances')}</h2>
                  <p className="mt-0.5 text-xs text-slate-400">{t('reports.dueBalancesDescription')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <TableReportActions
                    targetId="daily-reports-due-balances-table"
                    title={t('reports.dueBalances')}
                    subtitle={reportSubtitle}
                    fileName={`daily-reports-due-balances-${reportFileSuffix}`}
                    entityType="daily_reports_due_balances"
                    t={t}
                    className="flex flex-wrap gap-2 no-print"
                    shortcuts={REPORT_TABLE_SHORTCUTS}
                  />
                  {vm.dsrDueBalanceRows.length > 0 && (
                    <span className="muted-chip">{formatNumber(vm.dsrDueBalanceRows.length)} {t('common.dsr')}</span>
                  )}
                </div>
              </div>
            </div>
            {vm.dsrDueBalanceRows.length === 0 ? (
              <EmptyState title={t('reports.noDueBalances')} description={t('reports.noDueBalancesDescription')} icon={Wallet} />
            ) : (
              <>
              <MobileCardList>
                {vm.dsrDueBalanceRows.map((row) => (
                  <MobileListCard
                    key={row.id}
                    title={row.dsrName}
                    subtitle={row.area}
                    value={formatCurrency(row.balance)}
                    valueClass="text-rose-600"
                  />
                ))}
              </MobileCardList>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full">
                  <thead className="table-head">
                    <tr>
                      <th className="px-4 py-3">{t('common.dsr')}</th>
                      <th className="px-4 py-3">{t('dsr.area')}</th>
                      <th className="px-4 py-3 text-right">{t('reports.currentBalance')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vm.dsrDueBalanceRows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="table-cell font-semibold text-slate-950">{row.dsrName}</td>
                        <td className="table-cell text-slate-500">{row.area}</td>
                        <td className="table-cell text-right font-semibold text-rose-600">{formatCurrency(row.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>
          ) : null}

          {/* Daily Close — single-day only */}
          {vm.isSingleDay && activeTab === 'dailyClose' ? (
            <DailyClosePanel
              close={vm.dailyClose}
              totals={vm.totals}
              profitTotals={vm.profitTotals}
              date={vm.dateFrom}
              t={t}
              language={language}
            />
          ) : null}

          {/* Printable Sheet - single-day mode only */}
          {vm.selectedSheet && vm.isSingleDay ? (
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between gap-3 no-print">
                <div>
                  <h2 className="section-title">{t('reports.printableSheet')}</h2>
                  <p className="text-sm text-slate-500">{vm.selectedSheet.dsrName} - {formatDate(vm.selectedSheet.date)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => downloadSheetPdfAction(async () => {
                      recordReportPrint('pdf');
                      await downloadSheetPdf('report-print-sheet', buildPdfFileName(vm.selectedSheet));
                    })}
                    disabled={downloadingSheetPdf}
                  >
                    {downloadingSheetPdf ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                    {t('reports.downloadPdf')}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary lg:hidden disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => shareSheetPdfAction(async () => {
                      recordReportPrint('share');
                      await downloadSheetPdf('report-print-sheet', buildPdfFileName(vm.selectedSheet), { share: true });
                    })}
                    disabled={sharingSheetPdf}
                  >
                    {sharingSheetPdf ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />}
                    {t('common.share')}
                  </button>
                  <button type="button" className="btn-secondary" onClick={handleExportSheetExcel}>
                    <FileSpreadsheet size={18} />
                    {t('common.exportExcel')}
                  </button>
                  <button type="button" className="btn-primary" onClick={() => { recordReportPrint('print'); window.print(); }}>
                    <Printer size={18} />
                    {t('reports.printSheet')}
                  </button>
                </div>
              </div>
              <PrintableSheet sheet={vm.selectedSheet} printTarget targetId="report-print-sheet" t={t} language={language} />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
