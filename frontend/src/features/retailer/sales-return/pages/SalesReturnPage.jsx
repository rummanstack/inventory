import { useEffect, useState } from 'react';
import { Download, FileSpreadsheet, Loader2, Plus, Printer, RotateCcw } from 'lucide-react';
import { Alert, CopyableText, EmptyState, MobileCardList, MobileListCard, Pagination, SectionHeader, TableSkeleton, Select } from '../../../../components/ui.jsx';
import { DateRangePickerField } from '../../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { downloadSheetPdf } from '../../../../services/printService.js';
import { inventoryApi } from '../../../../services/inventoryApi.js';
import { formatCurrency, formatDateTime, formatNumber } from '../../../../utils/calculations.js';
import SalesReturnFormModal from '../components/SalesReturnFormModal';
import { useSalesReturnsViewModel } from '../viewmodels/useSalesReturnsViewModel';
import { useAsyncAction } from '../../../../hooks/useAsyncAction.js';

const SALES_RETURN_PRINT_ID = 'sales-return-print';
const SALES_RETURN_SHORTCUTS = {
  add: { alt: true, key: 'a', label: 'Alt+A' },
  pdf: { alt: true, key: 'd', label: 'Alt+D' },
  excel: { alt: true, key: 'e', label: 'Alt+E' },
  print: { alt: true, key: 'p', label: 'Alt+P' },
};

export default function SalesReturnPage() {
  const { saveSalesReturn, t, can, retailCustomerDirectory, language } = useInventoryApp();
  const vm = useSalesReturnsViewModel();
  const [showFormModal, setShowFormModal] = useState(false);
  const canManageRetailers = can('manage_retail_sales_returns');
  const [downloadingPdf, downloadPdf] = useAsyncAction();

  async function handleExportExcel() {
    const result = await inventoryApi.listSalesReturns({
      customerId: vm.customerId || undefined,
      dateFrom: vm.dateFrom || undefined,
      dateTo: vm.dateTo || undefined,
      page: 1,
      pageSize: 10000,
    });
    const all = result.items || [];
    const { utils, writeFile } = await import('xlsx');
    const header = ['#', t('retailer.salesReturn.returnNumber'), t('retailer.shared.invoiceDateLabel'), t('retailer.salesReturn.invoiceNumberLabel'), t('retailer.shared.customerLabel'), t('retailer.shared.totalAmount')];
    const data = all.map((r, i) => [i + 1, r.returnNumber, r.returnDate, r.invoiceNumber || '', r.customerName || '', Number(r.totalAmount)]);
    const ws = utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [{ wch: 6 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 22 }, { wch: 14 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, t('retailer.salesReturn.sheetName'));
    writeFile(wb, `sales-return-report.xlsx`);
  }

  async function handleDownloadPdf() {
    await downloadPdf(async () => {
      await inventoryApi.recordPrint({ entityType: 'sales_return', entityId: null, label: 'pdf' }).catch(() => {});
      await downloadSheetPdf(SALES_RETURN_PRINT_ID, `sales-return-report.pdf`);
    });
  }

  function handlePrint() {
    inventoryApi.recordPrint({ entityType: 'sales_return', entityId: null, label: 'print' }).catch(() => {});
    window.print();
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
      if (matchesShortcut(event, SALES_RETURN_SHORTCUTS.add) && canManageRetailers && !showFormModal) {
        event.preventDefault();
        setShowFormModal(true);
      } else if (matchesShortcut(event, SALES_RETURN_SHORTCUTS.pdf) && !downloadingPdf) {
        event.preventDefault();
        handleDownloadPdf();
      } else if (matchesShortcut(event, SALES_RETURN_SHORTCUTS.excel)) {
        event.preventDefault();
        handleExportExcel();
      } else if (matchesShortcut(event, SALES_RETURN_SHORTCUTS.print)) {
        event.preventDefault();
        handlePrint();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [downloadingPdf, canManageRetailers, showFormModal, vm.customerId, vm.dateFrom, vm.dateTo, t]);

  return (
    <div>
      <SectionHeader
        title={t('retailer.salesReturn.title')}
        compact
        action={canManageRetailers ? (
          <button type="button" className="btn-primary" onClick={() => setShowFormModal(true)}>
            <Plus size={18} />
            {t('retailer.salesReturn.add')}
            <kbd className="ml-1 rounded border border-indigo-400/40 bg-indigo-500/20 px-1 py-0.5 font-mono text-[10px] text-indigo-200">Alt+A</kbd>
          </button>
        ) : null}
      />

      <div id={SALES_RETURN_PRINT_ID} className="surface overflow-hidden print-target">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:flex-wrap sm:items-center">
          <Select className="input w-full sm:w-56" value={vm.customerId} onChange={(event) => vm.setCustomerId(event.target.value)}>
            <option value="">{t('retailer.shared.allCustomers')}</option>
            {retailCustomerDirectory.map((customer) => (
              <option key={customer.id} value={customer.id}>{customer.name}</option>
            ))}
          </Select>
          <DateRangePickerField
            from={vm.dateFrom}
            to={vm.dateTo}
            onChange={(from, to) => { vm.setDateFrom(from); vm.setDateTo(to); }}
            placeholder={`${t('purchaseReceive.dateFrom')} - ${t('purchaseReceive.dateTo')}`}
            className="w-full min-w-[260px] sm:w-auto"
          />
          <div className="flex flex-wrap items-center gap-2 text-sm font-bold sm:ml-auto">
            <button
              type="button"
              className="btn-secondary no-print h-10 gap-1.5 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
            >
              {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {t('purchaseReceive.downloadPdf')}
              {shortcutBadge(SALES_RETURN_SHORTCUTS.pdf)}
            </button>
            <button type="button" className="btn-secondary no-print h-10 gap-1.5 px-3 text-xs" onClick={handleExportExcel}>
              <FileSpreadsheet size={14} />
              {t('common.exportExcel')}
              {shortcutBadge(SALES_RETURN_SHORTCUTS.excel)}
            </button>
            <button type="button" className="btn-secondary no-print h-10 gap-1.5 px-3 text-xs" onClick={handlePrint}>
              <Printer size={14} />
              {t('common.print')}
              {shortcutBadge(SALES_RETURN_SHORTCUTS.print)}
            </button>
          </div>
        </div>
        {vm.loading ? (
          <div className="p-5">
            <TableSkeleton columns={6} showHeader={false} />
          </div>
        ) : vm.error ? (
          <div className="p-5">
            <Alert type="error">{vm.error}</Alert>
          </div>
        ) : (
        <>
        <MobileCardList>
          {vm.items.map((salesReturn) => (
            <MobileListCard
              key={salesReturn.id}
              title={salesReturn.returnNumber}
              subtitle={`${salesReturn.customerName || t('retailer.shared.customerTypes.WALK_IN')} · ${formatDateTime(salesReturn.returnDate, language)}`}
              value={formatCurrency(salesReturn.totalAmount, language)}
            />
          ))}
        </MobileCardList>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">{t('retailer.salesReturn.returnNumber')}</th>
                <th className="px-4 py-3">{t('retailer.shared.invoiceDateLabel')}</th>
                <th className="px-4 py-3">{t('retailer.shared.invoiceNumberLabel')}</th>
                <th className="px-4 py-3">{t('retailer.shared.customerLabel')}</th>
                <th className="px-4 py-3 text-right">{t('retailer.shared.totalAmount')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vm.items.map((salesReturn, index) => (
                <tr key={salesReturn.id} className="hover:bg-slate-50">
                  <td className="table-cell font-semibold text-slate-400">{formatNumber((vm.page - 1) * vm.pageSize + index + 1, language)}</td>
                  <td className="table-cell"><CopyableText value={salesReturn.returnNumber} copyLabel={t('retailer.salesReturn.returnNumber')} displayValue={salesReturn.returnNumber} textClassName="font-semibold text-slate-950" /></td>
                  <td className="table-cell">{formatDateTime(salesReturn.returnDate, language)}</td>
                  <td className="table-cell"><CopyableText value={salesReturn.invoiceNumber} copyLabel={t('retailer.salesReturn.invoiceNumberLabel')} displayValue={salesReturn.invoiceNumber} /></td>
                  <td className="table-cell">{salesReturn.customerName || t('retailer.shared.customerTypes.WALK_IN')}</td>
                  <td className="table-cell text-right font-bold">{formatCurrency(salesReturn.totalAmount, language)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
        )}
        {!vm.loading && !vm.error && !vm.items.length ? (
          <div className="p-5">
            <EmptyState title={t('retailer.salesReturn.noMatchTitle')} description={t('retailer.salesReturn.noMatchDescription')} icon={RotateCcw} />
          </div>
        ) : null}
        {!vm.loading && !vm.error && vm.items.length ? (
          <div className="border-t border-slate-100 px-5 py-4 no-print">
            <Pagination page={vm.page} totalPages={vm.totalPages} onPageChange={vm.setPage} />
          </div>
        ) : null}
      </div>

      {showFormModal ? (
        <SalesReturnFormModal
          onClose={() => setShowFormModal(false)}
          onSave={async (value) => {
            const result = await saveSalesReturn(value);
            if (result.ok) {
              setShowFormModal(false);
              vm.reload();
            }
            return result;
          }}
        />
      ) : null}
    </div>
  );
}

