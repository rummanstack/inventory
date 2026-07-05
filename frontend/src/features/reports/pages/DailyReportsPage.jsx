import { CircleDollarSign, Download, Eye, FileSpreadsheet, FileText, PackageCheck, Printer, RotateCcw, Truck, TrendingUp, Percent, Users, ReceiptText, Wallet, BadgeDollarSign } from 'lucide-react';
import PrintableSheet from '../../../components/PrintableSheet.jsx';
import TableReportActions from '../../../components/TableReportActions.jsx';
import { Alert, EmptyState, SectionHeader, StatCard, StatCardSkeleton, TableSkeleton } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { buildPdfFileName, downloadSheetPdf } from '../../../services/printService.js';
import { inventoryApi } from '../../../services/inventoryApi';
import { formatCurrency, formatDate, formatNumber } from '../../../utils/calculations.js';
import { useDailyReportsViewModel } from '../viewmodels/useDailyReportsViewModel';
import DailyClosePanel from '../components/DailyClosePanel.jsx';

export default function DailyReportsPage() {
  const { productDirectory, dsrDirectory, today, t, tenant, language } = useInventoryApp();
  const vm = useDailyReportsViewModel({ products: productDirectory, dsrs: dsrDirectory, today, t, tenantName: tenant?.name });
  const dueCollectedTotal = vm.dueCollectionRows.reduce((sum, r) => sum + r.total, 0);
  const reportFileSuffix = vm.isSingleDay ? vm.dateFrom : `${vm.dateFrom}-to-${vm.dateTo}`;
  const reportSubtitle = vm.isSingleDay ? vm.dateFrom : `${vm.dateFrom} to ${vm.dateTo}`;

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

          {/* DSR Table */}
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
                  />
                  <span className="muted-chip">{formatNumber(vm.rows.length)} {t('common.dsr')}</span>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-3">{t('dsr.title')}</th>
                    <th className="px-4 py-3">{t('reports.issued')}</th>
                    <th className="px-4 py-3 hidden sm:table-cell">{t('reports.returned')}</th>
                    <th className="px-4 py-3">{t('reports.sold')}</th>
                    <th className="px-4 py-3 hidden md:table-cell">{t('reports.paid')}</th>
                    <th className="px-4 py-3 hidden lg:table-cell">{t('reports.due')}</th>
                    <th className="px-4 py-3 hidden lg:table-cell">{t('reports.discount')}</th>
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
                        <td className="table-cell hidden sm:table-cell">
                          <span className="font-semibold text-slate-950">{formatCurrency(row.returnValue)}</span>
                          <span className="ml-1 text-xs text-slate-400">{formatNumber(row.returnedPieces)} {t('common.pcs')}</span>
                        </td>
                        <td className="table-cell">
                          <span className="font-semibold text-slate-950">{formatCurrency(row.totalPayable)}</span>
                          <span className="ml-1 text-xs text-slate-400">{formatNumber(row.soldPieces)} {t('common.pcs')}</span>
                        </td>
                        <td className="table-cell hidden md:table-cell">{formatCurrency(row.amountPaid)}</td>
                        <td className="table-cell hidden lg:table-cell text-rose-600">{formatCurrency(rowDue)}</td>
                        <td className="table-cell hidden lg:table-cell text-amber-600">{formatCurrency(row.discount)}</td>
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

          {/* SR Table */}
          <div id="daily-reports-sr-table" className="surface mt-6 overflow-hidden">
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
                  />
                  {vm.srRows.length > 0 && <span className="muted-chip">{formatNumber(vm.srRows.length)} SR</span>}
                </div>
              </div>
            </div>
            {vm.srRows.length === 0 ? (
              <EmptyState title={t('reports.noSrData')} description={t('reports.noSrDataDescription')} icon={Users} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="table-head">
                    <tr>
                      <th className="px-4 py-3">SR</th>
                      <th className="px-4 py-3 text-right">{t('reports.handover')}</th>
                      <th className="px-4 py-3 text-right">{t('reports.srCollected')}</th>
                      <th className="px-4 py-3 text-right hidden sm:table-cell">{t('reports.due')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vm.srRows.map((row) => (
                      <tr key={row.srId} className="hover:bg-slate-50">
                        <td className="table-cell font-semibold text-slate-950">{row.srName}</td>
                        <td className="table-cell text-right font-semibold text-slate-950">{formatCurrency(row.handover)}</td>
                        <td className="table-cell text-right font-semibold text-emerald-600">{formatCurrency(row.collected)}</td>
                        <td className="table-cell text-right hidden sm:table-cell text-rose-600">
                          {formatCurrency(Math.max(0, row.handover - row.collected))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Expense Table */}
          <div id="daily-reports-expense-table" className="surface mt-6 overflow-hidden">
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
              <div className="overflow-x-auto">
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
            )}
          </div>

          {/* Salary Table */}
          <div id="daily-reports-salary-table" className="surface mt-6 overflow-hidden">
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
              <div className="overflow-x-auto">
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
            )}
          </div>

          {/* Due Collections */}
          <div id="daily-reports-due-collections-table" className="surface mt-6 overflow-hidden">
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
                  />
                  {vm.dueCollectionRows.length > 0 && <span className="muted-chip">{formatCurrency(dueCollectedTotal)}</span>}
                </div>
              </div>
            </div>
            {vm.dueCollectionRows.length === 0 ? (
              <EmptyState title={t('reports.noDueCollections')} description={t('reports.noDueCollectionsDescription')} icon={CircleDollarSign} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="table-head">
                    <tr>
                      <th className="px-4 py-3">{t('common.dsr')}</th>
                      <th className="px-4 py-3 hidden sm:table-cell">{t('dsr.area')}</th>
                      <th className="px-4 py-3 text-right">{t('reports.collected')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vm.dueCollectionRows.map((row) => (
                      <tr key={row.dsrId} className="hover:bg-slate-50">
                        <td className="table-cell font-semibold text-slate-950">{row.dsrName}</td>
                        <td className="table-cell hidden sm:table-cell text-slate-500">{row.area}</td>
                        <td className="table-cell text-right font-semibold text-emerald-600">{formatCurrency(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* DSR Outstanding Due Balances */}
          <div id="daily-reports-due-balances-table" className="surface mt-6 overflow-hidden">
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
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="table-head">
                    <tr>
                      <th className="px-4 py-3">{t('common.dsr')}</th>
                      <th className="px-4 py-3 hidden sm:table-cell">{t('dsr.area')}</th>
                      <th className="px-4 py-3 text-right">{t('reports.currentBalance')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vm.dsrDueBalanceRows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="table-cell font-semibold text-slate-950">{row.dsrName}</td>
                        <td className="table-cell hidden sm:table-cell text-slate-500">{row.area}</td>
                        <td className="table-cell text-right font-semibold text-rose-600">{formatCurrency(row.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Daily Close — single-day only */}
          {vm.isSingleDay && (
            <div className="mt-6">
              <DailyClosePanel
                close={vm.dailyClose}
                totals={vm.totals}
                profitTotals={vm.profitTotals}
                date={vm.dateFrom}
                t={t}
                language={language}
              />
            </div>
          )}

          {/* Printable Sheet - single-day mode only */}
          {vm.selectedSheet && vm.isSingleDay ? (
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between gap-3 no-print">
                <div>
                  <h2 className="section-title">{t('reports.printableSheet')}</h2>
                  <p className="text-sm text-slate-500">{vm.selectedSheet.dsrName} - {formatDate(vm.selectedSheet.date)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" className="btn-secondary" onClick={() => { recordReportPrint('pdf'); downloadSheetPdf('report-print-sheet', buildPdfFileName(vm.selectedSheet)); }}>
                    <Download size={18} />
                    {t('reports.downloadPdf')}
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
