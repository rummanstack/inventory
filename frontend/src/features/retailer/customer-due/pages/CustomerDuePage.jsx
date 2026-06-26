import { Download, FileSpreadsheet, Printer, RefreshCw, Wallet } from 'lucide-react';
import { Badge, EmptyState, SectionHeader, StatCard, StatCardSkeleton, TableSkeleton } from '../../../../components/ui.jsx';
import { DatePickerField } from '../../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { downloadSheetPdf } from '../../../../services/printService.js';
import { inventoryApi } from '../../../../services/inventoryApi.js';
import { formatCurrency, formatDateTime, formatNumber, reverseEntries } from '../../../../utils/calculations.js';
import { useCustomerStatementViewModel } from '../viewmodels/useCustomerStatementViewModel';
import CustomerDuePrintSheet from '../components/CustomerDuePrintSheet.jsx';

function ledgerTone(type) {
  if (type === 'COLLECTION') return 'emerald';
  if (type === 'SALE_DUE') return 'rose';
  if (type === 'RETURN_ADJUSTMENT') return 'blue';
  if (type === 'MANUAL_ADJUSTMENT') return 'amber';
  return 'slate';
}

export default function CustomerDuePage() {
  const { t, tenant, retailCustomerDirectory, language } = useInventoryApp();
  const vm = useCustomerStatementViewModel({ customers: retailCustomerDirectory });
  const entries = reverseEntries(vm.statement?.entries);
  const printTargetId = 'customer-due-statement-print';
  const businessName = tenant?.name || '';
  const selectedCustomer = retailCustomerDirectory.find((c) => c.id === vm.customerId);

  function recordDuePrint(label) {
    inventoryApi.recordPrint({ entityType: 'customer_due_statement', entityId: vm.customerId, label }).catch(() => {});
  }

  async function handleExportExcel() {
    const { utils, writeFile } = await import('xlsx');
    const header = [
      t('retailer.customerDue.tableDate'),
      t('retailer.customerDue.tableType'),
      t('retailer.customerDue.tableDebit'),
      t('retailer.customerDue.tableCredit'),
      t('retailer.customerDue.tableBalance'),
      t('retailer.customerDue.tableNote'),
      t('supplierStatement.createdBy'),
    ];
    const data = entries.map((e) => [e.createdAt, e.type, Number(e.debit || 0), Number(e.credit || 0), Number(e.balanceAfter), e.note || '', e.createdByName || '']);
    const ws = utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [{ wch: 20 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 24 }, { wch: 18 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, t('retailer.customerDue.sheetName'));
    writeFile(wb, `customer-due-${selectedCustomer?.name || vm.customerId}.xlsx`);
  }

  return (
    <div>
      <SectionHeader
        eyebrow={t('retailer.customerDue.eyebrow')}
        title={t('retailer.customerDue.title')}
        description={t('retailer.customerDue.description')}
      />

      <div className="surface p-5">
        <div className="grid gap-3 sm:grid-cols-4">
          <select className="input sm:col-span-2" value={vm.customerId} onChange={(event) => vm.setCustomerId(event.target.value)}>
            <option value="">{t('retailer.shared.selectCustomer')}</option>
            {retailCustomerDirectory.map((customer) => (
              <option key={customer.id} value={customer.id}>{customer.name}</option>
            ))}
          </select>
          {selectedCustomer ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
              {t('retailCustomers.loyaltyPoints')}: <span className="font-black text-slate-950">{formatNumber(selectedCustomer.loyaltyPointsBalance || 0, language)}</span>
            </div>
          ) : null}
          <DatePickerField value={vm.dateFrom} onChange={vm.setDateFrom} placeholder={t('supplierStatement.dateFrom')} />
          <DatePickerField value={vm.dateTo} onChange={vm.setDateTo} placeholder={t('supplierStatement.dateTo')} min={vm.dateFrom} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={vm.refresh}>
            <RefreshCw size={18} />
            {t('supplierStatement.refresh')}
          </button>
          {vm.statement ? (
            <>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => { recordDuePrint('pdf'); downloadSheetPdf(printTargetId, `customer-due-${selectedCustomer?.name || vm.customerId}.pdf`); }}
              >
                <Download size={18} />
                {t('purchaseReceive.downloadPdf')}
              </button>
              <button type="button" className="btn-secondary" onClick={handleExportExcel}>
                <FileSpreadsheet size={18} />
                {t('common.exportExcel')}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => { recordDuePrint('print'); window.print(); }}
              >
                <Printer size={18} />
                {t('common.print')}
              </button>
            </>
          ) : null}
        </div>
      </div>

      {vm.loading ? (
        <>
          <div className="surface mt-6 p-5">
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="sm:col-span-2">
                <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200" />
                <div className="mt-2 h-11 animate-pulse rounded-2xl bg-slate-100" />
              </div>
              <div className="h-11 animate-pulse rounded-2xl bg-slate-100 sm:mt-6" />
              <div className="h-11 animate-pulse rounded-2xl bg-slate-100 sm:mt-6" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <div className="h-10 w-28 animate-pulse rounded-2xl bg-slate-100" />
              <div className="h-10 w-32 animate-pulse rounded-2xl bg-slate-100" />
              <div className="h-10 w-32 animate-pulse rounded-2xl bg-slate-100" />
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
          </div>

          <div className="surface mt-6 overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="h-4 w-40 animate-pulse rounded-full bg-slate-200" />
            </div>
            <TableSkeleton rows={6} columns={7} />
          </div>
        </>
      ) : vm.error ? (
        <div className="surface mt-6 p-5">
          <EmptyState title={t('supplierStatement.emptyTitle')} description={vm.error} icon={Wallet} />
        </div>
      ) : !vm.statement ? (
        <div className="surface mt-6 p-5">
          <EmptyState title={t('supplierStatement.emptyTitle')} description={t('supplierStatement.emptyDescription')} icon={Wallet} />
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title={t('supplierStatement.openingBalance')} value={formatCurrency(vm.statement.openingBalance, language)} icon={Wallet} tone="slate" />
            <StatCard title={t('supplierStatement.totalDebit')} value={formatCurrency(vm.statement.totalDebit, language)} icon={Wallet} tone="rose" />
            <StatCard title={t('supplierStatement.totalCredit')} value={formatCurrency(vm.statement.totalCredit, language)} icon={Wallet} tone="emerald" />
            <StatCard title={t('supplierStatement.closingBalance')} value={formatCurrency(vm.statement.closingBalance, language)} icon={Wallet} tone="blue" />
          </div>

          <div className="surface mt-6 overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-bold text-slate-950">{t('supplierStatement.entriesTitle')}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-3">{t('supplierStatement.when')}</th>
                    <th className="px-4 py-3">{t('supplierStatement.type')}</th>
                    <th className="px-4 py-3 text-right">{t('supplierStatement.debit')}</th>
                    <th className="px-4 py-3 text-right">{t('supplierStatement.credit')}</th>
                    <th className="px-4 py-3 text-right">{t('supplierStatement.balanceAfter')}</th>
                    <th className="px-4 py-3">{t('supplierStatement.reference')}</th>
                    <th className="hidden px-4 py-3 xl:table-cell">{t('supplierStatement.createdBy')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className="table-cell whitespace-nowrap text-sm font-semibold text-slate-700">{formatDateTime(entry.createdAt, language)}</td>
                      <td className="table-cell">
                        <Badge tone={ledgerTone(entry.type)}>{t(`retailer.customerDue.types.${entry.type}`)}</Badge>
                        {entry.note ? <p className="mt-1 max-w-56 truncate text-xs text-slate-500">{entry.note}</p> : null}
                      </td>
                      <td className="table-cell text-right font-black text-rose-700">{entry.debit ? formatCurrency(entry.debit, language) : '-'}</td>
                      <td className="table-cell text-right font-black text-emerald-700">{entry.credit ? formatCurrency(entry.credit, language) : '-'}</td>
                      <td className="table-cell text-right font-black text-slate-950">{formatCurrency(entry.balanceAfter, language)}</td>
                      <td className="hidden table-cell lg:table-cell">
                        <p className="max-w-52 truncate text-xs font-semibold text-slate-600">{entry.referenceType ? `${entry.referenceType} / ${String(entry.referenceId || '').slice(0, 18)}` : '-'}</p>
                      </td>
                      <td className="hidden table-cell xl:table-cell">
                        <p className="font-semibold text-slate-950">{entry.createdByName || '-'}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!entries.length ? (
              <div className="p-5">
                <EmptyState title={t('supplierStatement.emptyTitle')} description={t('supplierStatement.emptyDescription')} icon={Wallet} />
              </div>
            ) : null}
          </div>
        </>
      )}

      {vm.statement ? (
        <div className="absolute -left-[10000px] top-0">
          <CustomerDuePrintSheet
            statement={vm.statement}
            customerName={selectedCustomer?.name || ''}
            businessName={businessName}
            dateFrom={vm.dateFrom}
            dateTo={vm.dateTo}
            printTarget
            targetId={printTargetId}
            t={t}
            language={language}
          />
        </div>
      ) : null}
    </div>
  );
}
