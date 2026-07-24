import { useEffect, useState } from 'react';
import { Download, Eye, FileSpreadsheet, Loader2, Plus, Printer, Receipt, Search, Trash2 } from 'lucide-react';
import { Alert, Badge, CopyableText, EmptyState, MobileCardList, MobileListCard, Pagination, SectionHeader, TableSkeleton, Select } from '../../../../components/ui.jsx';
import { DateRangePickerField } from '../../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { downloadSheetPdf } from '../../../../services/printService.js';
import { inventoryApi } from '../../../../services/inventoryApi.js';
import { formatCurrency, formatDateTime } from '../../../../utils/calculations.js';
import SalesInvoiceFormModal from '../components/SalesInvoiceFormModal';
import SalesInvoiceViewModal from '../components/SalesInvoiceViewModal';
import { useSalesInvoicesViewModel } from '../viewmodels/useSalesInvoicesViewModel';
import { paymentStatusOf, paymentStatusTone } from '../../../../models/inventoryViewData.js';
import { useAsyncAction } from '../../../../hooks/useAsyncAction.js';

const SALES_INVOICES_PRINT_ID = 'sales-invoices-print';
const SALES_INVOICES_SHORTCUTS = {
  add: { alt: true, key: 'a', label: 'Alt+A' },
  pdf: { alt: true, key: 'd', label: 'Alt+D' },
  excel: { alt: true, key: 'e', label: 'Alt+E' },
  print: { alt: true, key: 'p', label: 'Alt+P' },
};

export default function SalesInvoicesPage() {
  const { saveSalesInvoice, deleteSalesInvoice, t, can, retailCustomerDirectory } = useInventoryApp();
  const vm = useSalesInvoicesViewModel();
  const [showFormModal, setShowFormModal] = useState(false);
  const [viewInvoice, setViewInvoice] = useState(null);
  const canManageRetailers = can('manage_retail_sales_invoices');
  const [downloadingPdf, downloadPdf] = useAsyncAction();

  async function handleExportExcel() {
    const result = await inventoryApi.listSalesInvoices({
      customerId: vm.customerId || undefined,
      invoiceNumber: vm.invoiceNumber || undefined,
      saleType: vm.saleType || undefined,
      paymentStatus: vm.paymentStatus || undefined,
      dateFrom: vm.dateFrom || undefined,
      dateTo: vm.dateTo || undefined,
      page: 1,
      pageSize: 10000,
    });
    const all = result.items || [];
    const { utils, writeFile } = await import('xlsx');
    const header = ['#', t('retailer.shared.invoiceNumberLabel'), t('retailer.shared.invoiceDateLabel'), t('retailer.shared.customerLabel'), t('retailer.shared.saleTypeLabel'), t('retailer.shared.totalAmount'), t('retailer.shared.dueAmount'), t('purchaseReceive.paymentStatus')];
    const data = all.map((invoice, i) => [
      i + 1,
      invoice.invoiceNumber,
      invoice.invoiceDate,
      invoice.customerName || t('retailer.shared.customerTypes.WALK_IN'),
      t(`retailer.shared.saleTypes.${invoice.saleType}`),
      Number(invoice.totalAmount),
      Number(invoice.dueAmount),
      t(`purchaseReceive.paymentStatuses.${paymentStatusOf(invoice)}`),
    ]);
    const ws = utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [{ wch: 6 }, { wch: 16 }, { wch: 14 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, t('retailer.salesInvoices.sheetName'));
    writeFile(wb, 'sales-invoices-report.xlsx');
  }

  async function handleDownloadPdf() {
    await downloadPdf(async () => {
      await inventoryApi.recordPrint({ entityType: 'sales_invoices', entityId: null, label: 'pdf' }).catch(() => {});
      await downloadSheetPdf(SALES_INVOICES_PRINT_ID, 'sales-invoices-report.pdf');
    });
  }

  function handlePrint() {
    inventoryApi.recordPrint({ entityType: 'sales_invoices', entityId: null, label: 'print' }).catch(() => {});
    window.print();
  }

  function shortcutBadge(shortcut) {
    return <kbd className="ml-1 hidden rounded border border-slate-300 bg-white/70 px-1 py-0.5 font-mono text-[10px] text-slate-500 2xl:inline-flex">{shortcut.label}</kbd>;
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
      if (matchesShortcut(event, SALES_INVOICES_SHORTCUTS.add) && canManageRetailers && !showFormModal && !viewInvoice) {
        event.preventDefault();
        setShowFormModal(true);
      } else if (matchesShortcut(event, SALES_INVOICES_SHORTCUTS.pdf) && !downloadingPdf) {
        event.preventDefault();
        handleDownloadPdf();
      } else if (matchesShortcut(event, SALES_INVOICES_SHORTCUTS.excel)) {
        event.preventDefault();
        handleExportExcel();
      } else if (matchesShortcut(event, SALES_INVOICES_SHORTCUTS.print)) {
        event.preventDefault();
        handlePrint();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [downloadingPdf, canManageRetailers, showFormModal, viewInvoice, vm.invoiceNumber, vm.customerId, vm.saleType, vm.paymentStatus, vm.dateFrom, vm.dateTo, t]);

  return (
    <div>
      <SectionHeader
        title={t('retailer.salesInvoices.title')}
        compact
        action={canManageRetailers ? (
          <button type="button" className="btn-primary" onClick={() => setShowFormModal(true)}>
            <Plus size={18} />
            {t('retailer.salesInvoices.add')}
            <kbd className="ml-1 hidden rounded border border-indigo-400/40 bg-indigo-500/20 px-1 py-0.5 font-mono text-[10px] text-indigo-200 sm:inline-flex">Alt+A</kbd>
          </button>
        ) : null}
      />

      <div id={SALES_INVOICES_PRINT_ID} className="surface overflow-hidden print-target">
        <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 xl:grid-cols-12">
          <div className="relative w-full sm:col-span-2 xl:col-span-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input className="input pl-10" value={vm.invoiceNumber} onChange={(event) => vm.setInvoiceNumber(event.target.value)} placeholder={t('retailer.shared.invoiceNumberLabel')} />
          </div>
          <div className="xl:col-span-2">
            <Select className="input w-full" value={vm.customerId} onChange={(event) => vm.setCustomerId(event.target.value)}>
              <option value="">{t('retailer.shared.allCustomers')}</option>
              {retailCustomerDirectory.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.name}</option>
              ))}
            </Select>
          </div>
          <div className="xl:col-span-2">
            <Select className="input w-full" value={vm.saleType} onChange={(event) => vm.setSaleType(event.target.value)}>
              <option value="">{t('retailer.shared.allSaleTypes')}</option>
              <option value="RETAIL">{t('retailer.shared.saleTypes.RETAIL')}</option>
              <option value="WHOLESALE">{t('retailer.shared.saleTypes.WHOLESALE')}</option>
              <option value="QUICK_SALE">{t('retailer.shared.saleTypes.QUICK_SALE')}</option>
            </Select>
          </div>
          <div className="xl:col-span-2">
            <Select className="input w-full" value={vm.paymentStatus} onChange={(event) => vm.setPaymentStatus(event.target.value)}>
              <option value="">{t('purchaseReceive.allPaymentStatuses')}</option>
              <option value="PAID">{t('purchaseReceive.paymentStatuses.PAID')}</option>
              <option value="PARTIAL">{t('purchaseReceive.paymentStatuses.PARTIAL')}</option>
              <option value="DUE">{t('purchaseReceive.paymentStatuses.DUE')}</option>
            </Select>
          </div>
          <DateRangePickerField
            from={vm.dateFrom}
            to={vm.dateTo}
            onChange={(from, to) => { vm.setDateFrom(from); vm.setDateTo(to); }}
            placeholder={`${t('purchaseReceive.dateFrom')} - ${t('purchaseReceive.dateTo')}`}
            className="w-full sm:col-span-2 xl:col-span-2"
          />
          <div className="grid grid-cols-1 gap-2 sm:col-span-2 sm:grid-cols-3 xl:col-span-12 xl:justify-self-end">
            <button
              type="button"
              className="btn-secondary no-print h-10 w-full justify-center gap-1.5 px-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
            >
              {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {t('purchaseReceive.downloadPdf')}
              {shortcutBadge(SALES_INVOICES_SHORTCUTS.pdf)}
            </button>
            <button type="button" className="btn-secondary no-print h-10 w-full justify-center gap-1.5 px-2 text-xs" onClick={handleExportExcel}>
              <FileSpreadsheet size={14} />
              {t('common.exportExcel')}
              {shortcutBadge(SALES_INVOICES_SHORTCUTS.excel)}
            </button>
            <button type="button" className="btn-secondary no-print h-10 w-full justify-center gap-1.5 px-2 text-xs" onClick={handlePrint}>
              <Printer size={14} />
              {t('common.print')}
              {shortcutBadge(SALES_INVOICES_SHORTCUTS.print)}
            </button>
          </div>
        </div>
        {vm.loading ? (
          <div className="p-5">
            <TableSkeleton columns={9} showHeader={false} />
          </div>
        ) : vm.error ? (
          <div className="p-5">
            <Alert type="error">{vm.error}</Alert>
          </div>
        ) : (
        <>
        <MobileCardList>
          {vm.items.map((invoice) => (
            <MobileListCard
              key={invoice.id}
              onClick={() => setViewInvoice(invoice)}
              title={invoice.invoiceNumber}
              badge={
                <Badge tone={paymentStatusTone(paymentStatusOf(invoice))}>
                  {t(`purchaseReceive.paymentStatuses.${paymentStatusOf(invoice)}`)}
                </Badge>
              }
              subtitle={`${invoice.customerName || t('retailer.shared.customerTypes.WALK_IN')} - ${formatDateTime(invoice.invoiceDate)}`}
              value={formatCurrency(invoice.totalAmount)}
              valueSub={Number(invoice.dueAmount) > 0 ? formatCurrency(invoice.dueAmount) : null}
            />
          ))}
        </MobileCardList>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">{t('retailer.shared.invoiceNumberLabel')}</th>
                <th className="px-4 py-3">{t('retailer.shared.invoiceDateLabel')}</th>
                <th className="px-4 py-3">{t('retailer.shared.customerLabel')}</th>
                <th className="px-4 py-3">{t('retailer.shared.saleTypeLabel')}</th>
                <th className="px-4 py-3 text-right">{t('retailer.shared.totalAmount')}</th>
                <th className="px-4 py-3 text-right">{t('retailer.shared.dueAmount')}</th>
                <th className="px-4 py-3">{t('purchaseReceive.paymentStatus')}</th>
                <th className="px-4 py-3 text-right no-print">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vm.items.map((invoice, index) => (
                <tr key={invoice.id} className="hover:bg-slate-50">
                  <td className="table-cell font-medium text-slate-400">{(vm.page - 1) * vm.pageSize + index + 1}</td>
                  <td className="table-cell"><CopyableText value={invoice.invoiceNumber} copyLabel={t('retailer.shared.invoiceNumberLabel')} displayValue={invoice.invoiceNumber} textClassName="font-semibold text-slate-950" /></td>
                  <td className="table-cell">{formatDateTime(invoice.invoiceDate)}</td>
                  <td className="table-cell">{invoice.customerName || t('retailer.shared.customerTypes.WALK_IN')}</td>
                  <td className="table-cell">{t(`retailer.shared.saleTypes.${invoice.saleType}`)}</td>
                  <td className="table-cell text-right font-semibold">{formatCurrency(invoice.totalAmount)}</td>
                  <td className="table-cell text-right font-semibold text-rose-700">{formatCurrency(invoice.dueAmount)}</td>
                  <td className="table-cell">
                    <Badge tone={paymentStatusTone(paymentStatusOf(invoice))}>
                      {t(`purchaseReceive.paymentStatuses.${paymentStatusOf(invoice)}`)}
                    </Badge>
                  </td>
                  <td className="table-cell no-print">
                    <div className="row-actions flex justify-end gap-2">
                      <button type="button" className="icon-btn" title={t('common.view')} onClick={() => setViewInvoice(invoice)}>
                        <Eye size={16} />
                      </button>
                      {canManageRetailers ? (
                        <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" title={t('common.delete')} onClick={async () => { const r = await deleteSalesInvoice(invoice); if (r.ok) vm.reload(); }}>
                          <Trash2 size={16} />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
        )}
        {!vm.loading && !vm.error && !vm.items.length ? (
          <div className="p-5">
            <EmptyState title={t('retailer.salesInvoices.noMatchTitle')} description={t('retailer.salesInvoices.noMatchDescription')} icon={Receipt} />
          </div>
        ) : null}
        {!vm.loading && !vm.error && vm.items.length ? (
          <div className="border-t border-slate-100 px-5 py-4 no-print">
            <Pagination page={vm.page} totalPages={vm.totalPages} onPageChange={vm.setPage} />
          </div>
        ) : null}
      </div>

      {showFormModal ? (
        <SalesInvoiceFormModal
          onClose={() => setShowFormModal(false)}
          onSave={async (value) => {
            const result = await saveSalesInvoice(value);
            if (result.ok) {
              setShowFormModal(false);
              vm.reload();
            }
            return result;
          }}
        />
      ) : null}

      {viewInvoice ? <SalesInvoiceViewModal salesInvoice={viewInvoice} onClose={() => setViewInvoice(null)} /> : null}
    </div>
  );
}

