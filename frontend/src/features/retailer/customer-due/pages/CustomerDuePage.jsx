import { Download, Printer, RefreshCw, Wallet } from 'lucide-react';
import { Badge, EmptyState, LoadingState, SectionHeader, StatCard } from '../../../../components/ui.jsx';
import { DatePickerField } from '../../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { downloadSheetPdf } from '../../../../services/printService.js';
import { inventoryApi } from '../../../../services/inventoryApi.js';
import { formatCurrency, formatDateTime, reverseEntries } from '../../../../utils/calculations.js';
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
  const { t, tenant, retailCustomerDirectory } = useInventoryApp();
  const vm = useCustomerStatementViewModel({ customers: retailCustomerDirectory });
  const entries = reverseEntries(vm.statement?.entries);
  const printTargetId = 'customer-due-statement-print';
  const businessName = tenant?.name || '';
  const selectedCustomer = retailCustomerDirectory.find((c) => c.id === vm.customerId);

  function recordDuePrint(label) {
    inventoryApi.recordPrint({ entityType: 'customer_due_statement', entityId: vm.customerId, label }).catch(() => {});
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
          <DatePickerField value={vm.dateFrom} onChange={vm.setDateFrom} placeholder={t('supplierStatement.dateFrom')} />
          <DatePickerField value={vm.dateTo} onChange={vm.setDateTo} placeholder={t('supplierStatement.dateTo')} />
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
              <button
                type="button"
                className="btn-secondary"
                onClick={() => { recordDuePrint('print'); window.print(); }}
              >
                <Printer size={18} />
                {t('purchaseReceive.printSheet')}
              </button>
            </>
          ) : null}
        </div>
      </div>

      {vm.loading ? (
        <div className="surface mt-6 p-5">
          <LoadingState />
        </div>
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
            <StatCard title={t('supplierStatement.openingBalance')} value={formatCurrency(vm.statement.openingBalance)} icon={Wallet} tone="slate" />
            <StatCard title={t('supplierStatement.totalDebit')} value={formatCurrency(vm.statement.totalDebit)} icon={Wallet} tone="rose" />
            <StatCard title={t('supplierStatement.totalCredit')} value={formatCurrency(vm.statement.totalCredit)} icon={Wallet} tone="emerald" />
            <StatCard title={t('supplierStatement.closingBalance')} value={formatCurrency(vm.statement.closingBalance)} icon={Wallet} tone="blue" />
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
                    <th className="hidden px-4 py-3 lg:table-cell">{t('supplierStatement.reference')}</th>
                    <th className="hidden px-4 py-3 xl:table-cell">{t('supplierStatement.createdBy')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className="table-cell whitespace-nowrap text-sm font-semibold text-slate-700">{formatDateTime(entry.createdAt)}</td>
                      <td className="table-cell">
                        <Badge tone={ledgerTone(entry.type)}>{t(`retailer.customerDue.types.${entry.type}`)}</Badge>
                        {entry.note ? <p className="mt-1 max-w-56 truncate text-xs text-slate-500">{entry.note}</p> : null}
                      </td>
                      <td className="table-cell text-right font-black text-rose-700">{entry.debit ? formatCurrency(entry.debit) : '-'}</td>
                      <td className="table-cell text-right font-black text-emerald-700">{entry.credit ? formatCurrency(entry.credit) : '-'}</td>
                      <td className="table-cell text-right font-black text-slate-950">{formatCurrency(entry.balanceAfter)}</td>
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
        <div className="hidden print:block">
          <CustomerDuePrintSheet
            statement={vm.statement}
            customerName={selectedCustomer?.name || ''}
            businessName={businessName}
            dateFrom={vm.dateFrom}
            dateTo={vm.dateTo}
            printTarget
            targetId={printTargetId}
          />
        </div>
      ) : null}
    </div>
  );
}
