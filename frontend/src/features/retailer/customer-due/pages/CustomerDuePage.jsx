import { useEffect } from 'react';
import { Download, FileSpreadsheet, Loader2, Printer, Wallet } from 'lucide-react';
import { Badge, CopyableText, EmptyState, MobileCardList, MobileListCard, SectionHeader, StatCard, TableSkeleton, Select } from '../../../../components/ui.jsx';
import { DateRangePickerField } from '../../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { downloadSheetPdf, printElementById } from '../../../../services/printService.js';
import { inventoryApi } from '../../../../services/inventoryApi.js';
import { formatCurrency, formatDateTime } from '../../../../utils/calculations.js';
import { useCustomerStatementViewModel } from '../viewmodels/useCustomerStatementViewModel';
import CustomerDuePrintSheet from '../components/CustomerDuePrintSheet.jsx';
import { useAsyncAction } from '../../../../hooks/useAsyncAction.js';

const CUSTOMER_DUE_SHORTCUTS = {
  pdf: { alt: true, key: 'd', label: 'Alt+D' },
  excel: { alt: true, key: 'e', label: 'Alt+E' },
  print: { alt: true, key: 'p', label: 'Alt+P' },
};

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
  const entries = vm.statement?.entries || [];
  const printTargetId = 'customer-due-statement-print';
  const businessName = tenant?.name || '';
  const selectedCustomer = retailCustomerDirectory.find((c) => c.id === vm.customerId);
  const [downloadingPdf, downloadPdf] = useAsyncAction();

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

  function handleDownloadPdf() {
    return downloadPdf(async () => {
      recordDuePrint('pdf');
      await downloadSheetPdf(printTargetId, `customer-due-${selectedCustomer?.name || vm.customerId}.pdf`);
    });
  }

  function handlePrint() {
    recordDuePrint('print');
    printElementById(printTargetId);
  }

  function shortcutBadge(shortcut) {
    return <kbd className="ml-1 rounded border border-slate-300 bg-white/70 px-1 py-0.5 font-mono text-[10px] text-slate-500">{shortcut.label}</kbd>;
  }

  function matchesShortcut(event, shortcut) {
    return (
      event.key.toLowerCase() === shortcut.key &&
      Boolean(event.altKey) === Boolean(shortcut.alt) &&
      Boolean(event.shiftKey) === Boolean(shortcut.shift) &&
      Boolean(event.ctrlKey || event.metaKey) === Boolean(shortcut.ctrlOrMeta)
    );
  }

  useEffect(() => {
    function handleKeyDown(event) {
      if (!vm.statement) return;
      if (matchesShortcut(event, CUSTOMER_DUE_SHORTCUTS.pdf) && !downloadingPdf) {
        event.preventDefault();
        handleDownloadPdf();
      } else if (matchesShortcut(event, CUSTOMER_DUE_SHORTCUTS.excel)) {
        event.preventDefault();
        handleExportExcel();
      } else if (matchesShortcut(event, CUSTOMER_DUE_SHORTCUTS.print)) {
        event.preventDefault();
        handlePrint();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [downloadingPdf, vm.statement, vm.customerId, entries, t]);

  return (
    <div>
      <SectionHeader title={t('retailer.customerDue.title')} compact />

      <div className="surface p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-72">
            <label className="label">{t('retailer.shared.customerLabel')}</label>
            <Select className="input" value={vm.customerId} onChange={(event) => vm.setCustomerId(event.target.value)}>
              <option value="">{t('retailer.shared.selectCustomer')}</option>
              {retailCustomerDirectory.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.name}</option>
              ))}
            </Select>
          </div>
          <div className="min-w-[320px]">
            <label className="label">{t('supplierStatement.dateRangeLabel')}</label>
            <DateRangePickerField
              from={vm.dateFrom}
              to={vm.dateTo}
              onChange={(from, to) => { vm.setDateFrom(from); vm.setDateTo(to); }}
              placeholder={`${t('supplierStatement.dateFrom')} - ${t('supplierStatement.dateTo')}`}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm font-bold sm:ml-auto">
            {vm.statement ? (
              <>
                <button
                  type="button"
                  className="btn-secondary h-10 gap-1.5 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                >
                  {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  {t('purchaseReceive.downloadPdf')}
                  {shortcutBadge(CUSTOMER_DUE_SHORTCUTS.pdf)}
                </button>
                <button type="button" className="btn-secondary h-10 gap-1.5 px-3 text-xs" onClick={handlePrint}>
                  <Printer size={14} />
                  {t('common.print')}
                  {shortcutBadge(CUSTOMER_DUE_SHORTCUTS.print)}
                </button>
                <button type="button" className="btn-secondary h-10 gap-1.5 px-3 text-xs" onClick={handleExportExcel}>
                  <FileSpreadsheet size={14} />
                  {t('common.exportExcel')}
                  {shortcutBadge(CUSTOMER_DUE_SHORTCUTS.excel)}
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {vm.loading ? (
        <div className="surface mt-6 p-5">
          <TableSkeleton columns={7} showHeader={false} />
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
            <StatCard title={t('supplierStatement.openingBalance')} value={formatCurrency(vm.statement.openingBalance, language)} icon={Wallet} tone="slate" />
            <StatCard title={t('supplierStatement.totalDebit')} value={formatCurrency(vm.statement.totalDebit, language)} icon={Wallet} tone="rose" />
            <StatCard title={t('supplierStatement.totalCredit')} value={formatCurrency(vm.statement.totalCredit, language)} icon={Wallet} tone="emerald" />
            <StatCard title={t('supplierStatement.closingBalance')} value={formatCurrency(vm.statement.closingBalance, language)} icon={Wallet} tone="blue" />
          </div>

          <div className="surface mt-6 overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="section-title">{t('supplierStatement.entriesTitle')}</h2>
            </div>
            <MobileCardList>
              {entries.map((entry) => (
                <MobileListCard
                  key={entry.id}
                  title={formatDateTime(entry.createdAt, language)}
                  badge={<Badge tone={ledgerTone(entry.type)}>{t(`retailer.customerDue.types.${entry.type}`)}</Badge>}
                  subtitle={entry.note || entry.createdByName || undefined}
                  value={formatCurrency(entry.balanceAfter, language)}
                  valueSub={entry.debit ? `-${formatCurrency(entry.debit, language)}` : entry.credit ? `+${formatCurrency(entry.credit, language)}` : null}
                  valueClass={entry.debit ? 'text-rose-700' : entry.credit ? 'text-emerald-700' : undefined}
                />
              ))}
            </MobileCardList>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-3">{t('supplierStatement.when')}</th>
                    <th className="px-4 py-3">{t('supplierStatement.type')}</th>
                    <th className="px-4 py-3 text-right">{t('supplierStatement.debit')}</th>
                    <th className="px-4 py-3 text-right">{t('supplierStatement.credit')}</th>
                    <th className="px-4 py-3 text-right">{t('supplierStatement.balanceAfter')}</th>
                    <th className="px-4 py-3">{t('supplierStatement.reference')}</th>
                    <th className="px-4 py-3">{t('supplierStatement.createdBy')}</th>
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
                      <td className="table-cell text-right font-semibold text-rose-700">{entry.debit ? formatCurrency(entry.debit, language) : '-'}</td>
                      <td className="table-cell text-right font-semibold text-emerald-700">{entry.credit ? formatCurrency(entry.credit, language) : '-'}</td>
                      <td className="table-cell text-right font-semibold text-slate-950">{formatCurrency(entry.balanceAfter, language)}</td>
                      <td className="table-cell">
                        <CopyableText value={entry.referenceId ? `${entry.referenceType || 'reference'} / ${entry.referenceId}` : ''} copyLabel={t('supplierStatement.reference')} displayValue={entry.referenceType ? `${entry.referenceType} / ${String(entry.referenceId || '').slice(0, 18)}` : '-'} textClassName="max-w-52 text-xs font-semibold text-slate-600" buttonClassName="h-5 w-5" />
                      </td>
                      <td className="table-cell">
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

