import { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import TableReportActions from '../../../components/TableReportActions.jsx';
import { Alert, Badge, CopyableText, EmptyState, MobileCardList, MobileListCard, SectionHeader, TableSkeleton } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { formatCurrency, formatDate, formatDateTime } from '../../../utils/calculations.js';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { useTenantReportQuery } from '../../reports/queries/useTenantReportQuery.js';

function toneForStatus(status) {
  if (status === 'POSTED') return 'emerald';
  if (status === 'APPROVED') return 'blue';
  if (status === 'SUBMITTED') return 'amber';
  if (status === 'REVERSED') return 'rose';
  return 'slate';
}

export default function VoucherRegisterPage() {
  const { language } = useInventoryApp();
  const [filters, setFilters] = useState({ voucherNumber: '', voucherType: '', status: '', dateFrom: '', dateTo: '' });
  const registerQuery = useTenantReportQuery({
    scope: 'voucher-register',
    params: filters,
    queryFn: () => inventoryApi.listVouchers(filters),
    keepPrevious: true,
  });
  const rows = registerQuery.data?.vouchers || [];
  const loading = registerQuery.isPending;
  const error = registerQuery.error?.message || '';

  return (
    <div>
      <SectionHeader eyebrow="Accounting" title="Voucher Register" description="Chronological list of all voucher types created through the accounting voucher workflow." />
      <div className="surface overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 no-print">
          <div className="grid flex-1 gap-3 md:grid-cols-5">
            <input className="input" placeholder="Voucher number" value={filters.voucherNumber} onChange={(event) => setFilters((current) => ({ ...current, voucherNumber: event.target.value }))} />
            <select className="input" value={filters.voucherType} onChange={(event) => setFilters((current) => ({ ...current, voucherType: event.target.value }))}>
              <option value="">All types</option>
              <option value="JOURNAL">Journal</option>
              <option value="RECEIPT">Receipt</option>
              <option value="PAYMENT">Payment</option>
              <option value="CONTRA">Contra</option>
            </select>
            <select className="input" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
              <option value="">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="APPROVED">Approved</option>
              <option value="POSTED">Posted</option>
              <option value="REVERSED">Reversed</option>
            </select>
            <DatePickerField value={filters.dateFrom} onChange={(value) => setFilters((current) => ({ ...current, dateFrom: value }))} placeholder="Date from" />
            <DatePickerField value={filters.dateTo} onChange={(value) => setFilters((current) => ({ ...current, dateTo: value }))} placeholder="Date to" min={filters.dateFrom || null} />
          </div>
          <TableReportActions targetId="voucher-register-report" title="Voucher Register" fileName="voucher-register" entityType="voucher_register" t={(key) => key} />
        </div>
        {loading ? <div className="p-5"><TableSkeleton columns={7} /></div> : null}
        {error ? <div className="p-5"><Alert type="error">{error}</Alert></div> : null}
        {!loading && !error ? (
          rows.length ? (
            <div id="voucher-register-report">
              <MobileCardList>
                {rows.map((row) => (
                  <MobileListCard
                    key={row.id}
                    title={row.voucherNumber}
                    badge={<Badge tone={toneForStatus(row.status)}>{row.status}</Badge>}
                    subtitle={`${row.voucherType} · ${formatDate(row.voucherDate, language)}`}
                    value={formatCurrency(row.totalDebit, language)}
                  />
                ))}
              </MobileCardList>
              <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[980px]">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-3 text-left">Voucher</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Reference</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="table-cell"><CopyableText value={row.voucherNumber} displayValue={row.voucherNumber} copyLabel="voucher number" textClassName="font-semibold text-slate-950" /></td>
                      <td className="table-cell">{row.voucherType}</td>
                      <td className="table-cell">{formatDate(row.voucherDate, language)}</td>
                      <td className="table-cell text-sm text-slate-600">{row.referenceNumber || '-'}</td>
                      <td className="table-cell text-right font-semibold text-slate-950">{formatCurrency(row.totalDebit, language)}</td>
                      <td className="table-cell"><Badge tone={toneForStatus(row.status)}>{row.status}</Badge></td>
                      <td className="table-cell text-sm text-slate-500">{formatDateTime(row.createdAt, language)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          ) : (
            <div className="p-10"><EmptyState icon={BookOpen} title="No vouchers found" description="The register will populate once vouchers are created." /></div>
          )
        ) : null}
      </div>
    </div>
  );
}
