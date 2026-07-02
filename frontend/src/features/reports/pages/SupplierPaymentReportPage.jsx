import { CreditCard } from 'lucide-react';
import TableReportActions from '../../../components/TableReportActions.jsx';
import { Alert, EmptyState, SectionHeader, StatCard, StatCardSkeleton, TableSkeleton } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency, formatDate, formatNumber } from '../../../utils/calculations.js';
import { useSupplierPaymentReportViewModel } from '../viewmodels/useSupplierPaymentReportViewModel';

export default function SupplierPaymentReportPage() {
  const { t, language } = useInventoryApp();
  const vm = useSupplierPaymentReportViewModel();
  const printTargetId = 'supplier-payment-report-print';
  const rows = vm.report?.rows || [];

  const totals = rows.reduce(
    (acc, row) => {
      acc.paymentCount += Number(row.paymentCount || 0);
      acc.totalAmount += Number(row.totalAmount || 0);
      return acc;
    },
    { paymentCount: 0, totalAmount: 0 },
  );

  return (
    <div>
      <SectionHeader eyebrow={t('nav.reports')} title="Supplier Payment Report" description="Daily supplier payment summary." />

      {vm.loading ? (
        <>
          <div className="surface mb-6 grid gap-4 p-5 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200" />
                <div className="h-11 animate-pulse rounded-2xl bg-slate-100" />
              </div>
            ))}
          </div>
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => <StatCardSkeleton key={i} />)}
          </div>
          <TableSkeleton rows={6} columns={3} />
        </>
      ) : (
        <>
          {vm.error ? <div className="mb-6"><Alert type="error">{vm.error}</Alert></div> : null}

          <div className="surface mb-6 grid gap-4 p-5 sm:grid-cols-2">
            <div>
              <label className="label">{t('profit.dateFrom')}</label>
              <DatePickerField value={vm.dateFrom} onChange={vm.setDateFrom} />
            </div>
            <div>
              <label className="label">{t('profit.dateTo')}</label>
              <DatePickerField value={vm.dateTo} onChange={vm.setDateTo} min={vm.dateFrom} />
            </div>
          </div>

          <TableReportActions
            targetId={printTargetId}
            title="Supplier Payment Report"
            subtitle={`${vm.dateFrom} to ${vm.dateTo}`}
            fileName={`supplier-payment-report-${vm.dateFrom}-${vm.dateTo}`}
            entityType="supplier_payment_report"
            t={t}
            className="mb-4 flex flex-wrap gap-2 no-print"
          />

          <div id={printTargetId} className="print-target">
            <div className="mb-6 grid gap-4 sm:grid-cols-2">
              <StatCard title="Total Payments" value={formatNumber(totals.paymentCount, language)} icon={CreditCard} tone="slate" />
              <StatCard title="Total Amount Paid" value={formatCurrency(totals.totalAmount, language)} icon={CreditCard} tone="emerald" />
            </div>

            <div className="surface overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="section-title">Daily Supplier Payment Summary</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="table-head">
                    <tr>
                      <th className="px-4 py-3">{t('supplierStatement.when')}</th>
                      <th className="px-4 py-3 text-right">Payments</th>
                      <th className="px-4 py-3 text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row) => (
                      <tr key={row.date} className="hover:bg-slate-50">
                        <td className="table-cell font-semibold text-slate-950">{formatDate(row.date, language)}</td>
                        <td className="table-cell text-right">{formatNumber(row.paymentCount, language)}</td>
                        <td className="table-cell text-right font-bold text-emerald-700">{formatCurrency(row.totalAmount, language)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!rows.length ? (
                <div className="p-5">
                  <EmptyState title="No Payment Data" description="No supplier payments found for the selected date range." icon={CreditCard} />
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
