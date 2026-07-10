import { useEffect, useState } from 'react';
import TableReportActions from '../../../components/TableReportActions.jsx';
import { Alert, CopyableText, EmptyState, SectionHeader, TableSkeleton } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency, formatDate } from '../../../utils/calculations.js';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { useReportReferenceData } from '../hooks/useReportReferenceData.js';
import { Users } from 'lucide-react';

function PartyLedgerPage({ title, partyKey, loader, reportId }) {
  const { language } = useInventoryApp();
  const { customers, suppliers, loading: refLoading, error: refError } = useReportReferenceData();
  const options = partyKey === 'customerId' ? customers : suppliers;
  const [filters, setFilters] = useState({ [partyKey]: '', dateFrom: '', dateTo: '' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!filters[partyKey]) {
      setData(null);
      return;
    }
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const result = await loader({ ...filters });
        if (!cancelled) {
          setData(result);
          setError('');
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError?.message || 'Failed to load ledger.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [filters, loader, partyKey]);

  return (
    <div>
      <SectionHeader eyebrow="Accounting" title={title} description="Party ledger generated from journal activity affecting receivable or payable accounts." />
      <div className="surface overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 p-5 no-print">
          <div className="grid flex-1 gap-3 md:grid-cols-3">
            <select className="input" value={filters[partyKey]} onChange={(event) => setFilters((current) => ({ ...current, [partyKey]: event.target.value }))}>
              <option value="">Select {partyKey === 'customerId' ? 'customer' : 'supplier'}</option>
              {options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <DatePickerField value={filters.dateFrom} onChange={(value) => setFilters((current) => ({ ...current, dateFrom: value }))} placeholder="Date from" />
            <DatePickerField value={filters.dateTo} onChange={(value) => setFilters((current) => ({ ...current, dateTo: value }))} placeholder="Date to" min={filters.dateFrom || null} />
          </div>
          <TableReportActions targetId={reportId} title={title} fileName={reportId} entityType={reportId} t={(key) => key} />
        </div>
        {refError ? <div className="p-5"><Alert type="error">{refError}</Alert></div> : null}
        {error ? <div className="p-5"><Alert type="error">{error}</Alert></div> : null}
        {loading || refLoading ? <div className="p-5"><TableSkeleton columns={7} /></div> : null}
        {!loading && !refLoading && !data ? <div className="p-10"><EmptyState icon={Users} title={`Select a ${partyKey === 'customerId' ? 'customer' : 'supplier'}`} description="The ledger will load once a party is selected." /></div> : null}
        {!loading && !refLoading && data ? (
          <div id={reportId} className="overflow-x-auto">
            <div className="grid gap-4 border-b border-slate-100 bg-slate-50 px-5 py-4 md:grid-cols-3">
              <div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Opening Balance</div><div className="mt-1 text-lg font-semibold text-slate-950">{formatCurrency(data.openingBalance || 0, language)}</div></div>
              <div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Outstanding</div><div className="mt-1 text-lg font-semibold text-slate-950">{formatCurrency(data.outstanding || 0, language)}</div></div>
            </div>
            <table className="w-full min-w-[1120px]">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Voucher</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Reference</th>
                  <th className="px-4 py-3 text-right">Debit</th>
                  <th className="px-4 py-3 text-right">Credit</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.lines.map((line) => (
                  <tr key={line.id} className="hover:bg-slate-50">
                    <td className="table-cell">{formatDate(line.entryDate, language)}</td>
                    <td className="table-cell"><CopyableText value={line.voucherNumber || line.documentNumber || line.sourceId} displayValue={line.voucherNumber || line.documentNumber || String(line.sourceId).slice(0, 12)} copyLabel="voucher number" textClassName="font-semibold text-slate-950" /></td>
                    <td className="table-cell text-slate-500">{line.voucherType}</td>
                    <td className="table-cell text-sm text-slate-600">{line.referenceNumber || line.memo || '-'}</td>
                    <td className="table-cell text-right">{line.debit ? formatCurrency(line.debit, language) : '-'}</td>
                    <td className="table-cell text-right">{line.credit ? formatCurrency(line.credit, language) : '-'}</td>
                    <td className="table-cell text-right font-semibold text-slate-950">{formatCurrency(line.runningBalance, language)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function CustomerLedgerPage() {
  return <PartyLedgerPage title="Customer Ledger" partyKey="customerId" loader={inventoryApi.getCustomerLedger} reportId="customer-ledger-report" />;
}

export function SupplierLedgerPage() {
  return <PartyLedgerPage title="Supplier Ledger" partyKey="supplierId" loader={inventoryApi.getSupplierLedger} reportId="supplier-ledger-report" />;
}
