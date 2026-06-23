import { useState } from 'react';
import { Download, FileSpreadsheet, Plus, Printer, RotateCcw } from 'lucide-react';
import { Alert, EmptyState, Pagination, SectionHeader, TableSkeleton } from '../../../../components/ui.jsx';
import { DatePickerField } from '../../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { downloadSheetPdf } from '../../../../services/printService.js';
import { inventoryApi } from '../../../../services/inventoryApi.js';
import { formatCurrency, formatDate, formatNumber } from '../../../../utils/calculations.js';
import SalesReturnFormModal from '../components/SalesReturnFormModal';
import { useSalesReturnsViewModel } from '../viewmodels/useSalesReturnsViewModel';

export default function SalesReturnPage() {
  const { saveSalesReturn, t, can, retailCustomerDirectory, language } = useInventoryApp();
  const vm = useSalesReturnsViewModel();
  const [showFormModal, setShowFormModal] = useState(false);
  const canManageRetailers = can('manage_retail_sales_returns');

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

  return (
    <div>
      <SectionHeader
        eyebrow={t('retailer.salesReturn.eyebrow')}
        title={t('retailer.salesReturn.title')}
        description={t('retailer.salesReturn.description')}
        action={canManageRetailers ? (
          <button type="button" className="btn-primary" onClick={() => setShowFormModal(true)}>
            <Plus size={18} />
            {t('retailer.salesReturn.add')}
          </button>
        ) : null}
      />

      <div id="sales-return-print" className="surface overflow-hidden print-target">
        <div className="border-b border-slate-100 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">{t('retailer.salesReturn.eyebrow')}</p>
              <p className="text-sm font-medium text-slate-500">{t('retailer.salesReturn.description')}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
              <span className="muted-chip">{formatNumber(vm.total, language)} {t('retailer.salesReturn.returnCount')}</span>
              <button
                type="button"
                className="btn-secondary no-print py-1.5 text-xs"
                onClick={() => { inventoryApi.recordPrint({ entityType: 'sales_return', entityId: null, label: 'pdf' }).catch(() => {}); downloadSheetPdf('sales-return-print', `sales-return-report.pdf`); }}
              >
                <Download size={14} />
                {t('purchaseReceive.downloadPdf')}
              </button>
              <button type="button" className="btn-secondary no-print py-1.5 text-xs" onClick={handleExportExcel}>
                <FileSpreadsheet size={14} />
                {t('common.exportExcel')}
              </button>
              <button
                type="button"
                className="btn-secondary no-print py-1.5 text-xs"
                onClick={() => { inventoryApi.recordPrint({ entityType: 'sales_return', entityId: null, label: 'print' }).catch(() => {}); window.print(); }}
              >
                <Printer size={14} />
                {t('common.print')}
              </button>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <select className="input" value={vm.customerId} onChange={(event) => vm.setCustomerId(event.target.value)}>
              <option value="">{t('retailer.shared.allCustomers')}</option>
              {retailCustomerDirectory.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.name}</option>
              ))}
            </select>
            <DatePickerField value={vm.dateFrom} onChange={vm.setDateFrom} placeholder={t('purchaseReceive.dateFrom')} />
            <DatePickerField value={vm.dateTo} onChange={vm.setDateTo} placeholder={t('purchaseReceive.dateTo')} />
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
        <div className="overflow-x-auto">
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
                  <td className="table-cell font-black text-slate-400">{formatNumber((vm.page - 1) * vm.pageSize + index + 1, language)}</td>
                  <td className="table-cell font-semibold text-slate-950">{salesReturn.returnNumber}</td>
                  <td className="table-cell">{formatDate(salesReturn.returnDate, language)}</td>
                  <td className="table-cell">{salesReturn.invoiceNumber || '-'}</td>
                  <td className="table-cell">{salesReturn.customerName || t('retailer.shared.customerTypes.WALK_IN')}</td>
                  <td className="table-cell text-right font-bold">{formatCurrency(salesReturn.totalAmount, language)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
        {!vm.loading && !vm.error && !vm.items.length ? (
          <div className="p-5">
            <EmptyState title={t('retailer.salesReturn.noMatchTitle')} description={t('retailer.salesReturn.noMatchDescription')} icon={RotateCcw} />
          </div>
        ) : null}
        {!vm.loading && !vm.error && vm.items.length ? (
          <div className="border-t border-slate-100 px-5 py-4">
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
