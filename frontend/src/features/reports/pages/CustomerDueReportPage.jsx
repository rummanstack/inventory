import { UserX } from 'lucide-react';
import TableReportActions from '../../../components/TableReportActions.jsx';
import { Alert, EmptyState, SectionHeader, StatCard, StatCardSkeleton, TableSkeleton } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency, formatNumber } from '../../../utils/calculations.js';
import { useCustomerDueReportViewModel } from '../viewmodels/useCustomerDueReportViewModel';

export default function CustomerDueReportPage() {
  const { t, language } = useInventoryApp();
  const vm = useCustomerDueReportViewModel();
  const printTargetId = 'customer-due-report-print';
  const rows = vm.report?.rows || [];

  const totalDue = rows.reduce((acc, row) => acc + Number(row.currentDue || 0), 0);

  return (
    <div>
      <SectionHeader eyebrow={t('nav.reports')} title="Customer Due Report" description="All retail customers with outstanding due balances." />

      {vm.loading ? (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => <StatCardSkeleton key={i} />)}
          </div>
          <TableSkeleton rows={6} columns={3} />
        </>
      ) : (
        <>
          {vm.error ? <div className="mb-6"><Alert type="error">{vm.error}</Alert></div> : null}

          <TableReportActions
            targetId={printTargetId}
            title="Customer Due Report"
            fileName="customer-due-report"
            entityType="customer_due_report"
            t={t}
            className="mb-4 flex flex-wrap gap-2 no-print"
          />

          <div id={printTargetId} className="print-target">
            <div className="mb-6 grid gap-4 sm:grid-cols-2">
              <StatCard title="Customers with Due" value={formatNumber(rows.length, language)} icon={UserX} tone="slate" />
              <StatCard title="Total Outstanding Due" value={formatCurrency(totalDue, language)} icon={UserX} tone="rose" />
            </div>

            <div className="surface overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="section-title">Outstanding Customer Balances</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="table-head">
                    <tr>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3 text-right">Outstanding Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row) => (
                      <tr key={row.customerId} className="hover:bg-slate-50">
                        <td className="table-cell font-semibold text-slate-950">{row.customerName}</td>
                        <td className="table-cell text-slate-600">{row.phone || '—'}</td>
                        <td className="table-cell text-right font-bold text-rose-700">{formatCurrency(row.currentDue, language)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!rows.length ? (
                <div className="p-5">
                  <EmptyState title="No Outstanding Dues" description="All customers have a zero balance — great!" icon={UserX} />
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
