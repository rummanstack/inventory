import { CircleDollarSign, Download, Eye, FileSpreadsheet, FileText, PackageCheck, Printer, RotateCcw, Truck } from 'lucide-react';
import PrintableSheet from '../../../components/PrintableSheet.jsx';
import { Alert, Badge, ChartPanel, ChartPanelSkeleton, DonutChart, EmptyState, SectionHeader, StackedBarChart, StatCard, StatCardSkeleton, TableSkeleton } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { statusTone } from '../../../models/inventoryViewData.js';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { buildPdfFileName, downloadSheetPdf } from '../../../services/printService.js';
import { inventoryApi } from '../../../services/inventoryApi';
import { formatCurrency, formatDate, formatNumber } from '../../../utils/calculations.js';
import { useDailyReportsViewModel } from '../viewmodels/useDailyReportsViewModel';
import { getCssVar } from '../../../utils/theme.js';

export default function DailyReportsPage() {
  const { productDirectory, dsrDirectory, today, t, tenant, language } = useInventoryApp();
  const vm = useDailyReportsViewModel({ products: productDirectory, dsrs: dsrDirectory, today, t, tenantName: tenant?.name });

  function recordReportPrint(label) {
    if (!vm.selectedSheet) {
      return;
    }
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

        <div className="mb-6 grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="surface rounded-[28px] p-5">
            <div className="space-y-2">
              <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200" />
              <div className="h-11 animate-pulse rounded-2xl bg-slate-100" />
              <div className="h-3 w-64 animate-pulse rounded-full bg-slate-100" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <ChartPanelSkeleton height="h-80" />
          <ChartPanelSkeleton height="h-80" />
        </div>

        <div className="mt-6">
          <TableSkeleton rows={6} columns={9} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader eyebrow={t('nav.reports')} title={t('nav.reports')} description={t('reports.description')} />

      <div className="mb-6 grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="surface rounded-[28px] p-5">
          <label className="label mt-3">{t('reports.reportDate')}</label>
          <DatePickerField value={vm.date} onChange={vm.setDate} max={new Date().toISOString().slice(0, 10)} />
          <p className="mt-3 text-sm text-slate-500">{t('reports.description')}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <StatCard title={t('reports.issued')} value={`${formatNumber(vm.totals.issuedPieces)} ${t('common.pcs')}`} icon={Truck} tone="amber" />
          <StatCard title={t('reports.returned')} value={`${formatNumber(vm.totals.returnedPieces)} ${t('common.pcs')}`} icon={RotateCcw} tone="slate" />
          <StatCard title={t('reports.sold')} value={`${formatNumber(vm.totals.soldPieces)} ${t('common.pcs')}`} icon={PackageCheck} tone="emerald" />
          <StatCard title={t('reports.payable')} value={formatCurrency(vm.totals.totalPayable)} icon={CircleDollarSign} tone="blue" />
        </div>
      </div>

      {vm.error ? (
        <Alert type="error">{vm.error}</Alert>
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <ChartPanel title={t('reports.routeReport', { date: formatDate(vm.date) })} description={t('reports.routeReportDescription')}>
              {vm.chartRows.length ? (
                <StackedBarChart
                  data={vm.chartRows}
                  segments={[
                    { key: 'issued', label: t('reports.issued'), color: getCssVar('--issued-soft', '#bfbdd2') },
                    { key: 'returned', label: t('reports.returned'), color: getCssVar('--returned', '#f8aa17') },
                    { key: 'sold', label: t('reports.sold'), color: getCssVar('--success', '#37a864') },
                  ]}
                  totalFormatter={(value) => `${formatNumber(value)} pcs`}
                />
              ) : (
                <EmptyState title={t('reports.noRouteTitle')} description={t('reports.noRouteDescription')} icon={FileText} />
              )}
            </ChartPanel>

            <ChartPanel title={t('reports.statusMix')} description={t('reports.statusMixDescription')}>
              <DonutChart data={vm.reportMix} centerLabel={t('reports.routes')} centerValue={formatNumber(vm.rows.length)} valueFormatter={(value) => `${formatNumber(value)} ${t('common.dsr')}`} />
            </ChartPanel>
          </div>

          <div className="surface mt-6 overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-bold text-slate-950">{t('reports.dsrTable', { date: formatDate(vm.date) })}</h2>
                <span className="muted-chip">{formatNumber(vm.rows.length)} {t('common.dsr')}</span>
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
                    <th className="px-4 py-3">{t('reports.payable')}</th>
                    <th className="px-4 py-3 hidden md:table-cell">{t('reports.paid')}</th>
                    <th className="px-4 py-3 hidden lg:table-cell">{t('reports.due')}</th>
                    <th className="px-4 py-3 hidden md:table-cell">{t('dsr.status')}</th>
                    <th className="px-4 py-3 text-right">{t('reports.sheet')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vm.rows.map((row) => (
                    <tr key={row.dsrId} className="hover:bg-slate-50">
                      <td className="table-cell">
                        <p className="font-semibold text-slate-950">{row.dsrName}</p>
                        <p className="text-xs text-slate-500">{row.area}</p>
                      </td>
                      <td className="table-cell">{formatNumber(row.issuedPieces)} pcs</td>
                      <td className="table-cell hidden sm:table-cell">{formatNumber(row.returnedPieces)} pcs</td>
                      <td className="table-cell font-semibold">{formatNumber(row.soldPieces)} pcs</td>
                      <td className="table-cell font-bold">{formatCurrency(row.totalPayable)}</td>
                      <td className="table-cell hidden md:table-cell">{formatCurrency(row.amountPaid || 0)}</td>
                      <td className="table-cell hidden lg:table-cell">{formatCurrency(row.dueAmount || 0)}</td>
                      <td className="table-cell hidden md:table-cell">
                        <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                      </td>
                      <td className="table-cell text-right">
                        <button type="button" className="btn-secondary h-9 px-3" onClick={() => vm.viewSheet(row)} disabled={row.status === 'No Issue'}>
                          <Eye size={16} />
                          {t('reports.view')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {vm.selectedSheet ? (
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between gap-3 no-print">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">{t('reports.printableSheet')}</h2>
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
