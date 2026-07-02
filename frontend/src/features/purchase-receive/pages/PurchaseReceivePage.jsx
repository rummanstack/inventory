import { useState } from 'react';
import { Download, Eye, FileSpreadsheet, Pencil, Plus, Printer, Search, ShoppingCart, Trash2 } from 'lucide-react';
import { Alert, Badge, EmptyState, Pagination, SectionHeader, TableSkeleton, Select } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi';
import { downloadSheetPdf } from '../../../services/printService.js';
import { formatCurrency, formatDate, formatDateTime, formatNumber } from '../../../utils/calculations.js';
import PurchaseReceiveFormModal from '../components/PurchaseReceiveFormModal';
import PurchaseReceiptViewModal from '../components/PurchaseReceiptViewModal';
import { usePurchaseReceiveViewModel } from '../viewmodels/usePurchaseReceiveViewModel';
import { paymentStatusOf, paymentStatusTone } from '../../../models/inventoryViewData.js';

const PURCHASE_RECEIVE_PRINT_ID = 'purchase-receive-list-print';

export default function PurchaseReceivePage() {
  const { savePurchaseReceipt, deletePurchaseReceipt, t, can, supplierDirectory } = useInventoryApp();
  const vm = usePurchaseReceiveViewModel();
  const [formModal, setFormModal] = useState(null);
  const [viewReceipt, setViewReceipt] = useState(null);
  const canManagePurchases = can('manage_purchases');

  async function handleExportExcel() {
    const result = await inventoryApi.listPurchaseReceipts({
      page: 1,
      pageSize: 10000,
      supplierId: vm.supplierId || undefined,
      purchaseNumber: vm.purchaseNumber || undefined,
      supplierInvoiceNo: vm.supplierInvoiceNo || undefined,
      dateFrom: vm.dateFrom || undefined,
      dateTo: vm.dateTo || undefined,
      paymentStatus: vm.paymentStatus || undefined,
    });
    const all = result.items || [];
    const { utils, writeFile } = await import('xlsx');
    const header = [t('purchaseReceive.purchaseNumber'), t('purchaseReceive.supplier'), t('purchaseReceive.date'), t('purchaseReceive.supplierInvoiceNo'), t('purchaseReceive.totalAmount'), t('purchaseReceive.dueAmount'), t('purchaseReceive.paymentStatus')];
    const data = all.map((receipt) => [
      receipt.purchaseNumber,
      receipt.supplierName || '',
      receipt.purchaseDate,
      receipt.supplierInvoiceNo || '',
      Number(receipt.totalAmount || 0),
      Number(receipt.dueAmount || 0),
      t(`purchaseReceive.paymentStatuses.${paymentStatusOf(receipt)}`),
    ]);
    const ws = utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [{ wch: 18 }, { wch: 24 }, { wch: 14 }, { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 14 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, t('purchaseReceive.sheetName'));
    writeFile(wb, 'purchase-receive.xlsx');
  }

  return (
    <div>
      <SectionHeader
        eyebrow={t('purchaseReceive.eyebrow')}
        title={t('purchaseReceive.title')}
        description={t('purchaseReceive.description')}
        action={canManagePurchases ? (
          <button type="button" className="btn-primary" onClick={() => setFormModal({ mode: 'add' })}>
            <Plus size={18} />
            {t('purchaseReceive.add')}
          </button>
        ) : null}
      />

      <div id={PURCHASE_RECEIVE_PRINT_ID} className={`surface overflow-hidden ${viewReceipt ? '' : 'print-target'}`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 no-print">
          <span className="text-sm font-bold text-slate-700">{t('purchaseReceive.title')}</span>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary py-1.5 text-xs"
              onClick={() => { inventoryApi.recordPrint({ entityType: 'purchase_receive_list', entityId: null, label: 'pdf' }).catch(() => {}); downloadSheetPdf(PURCHASE_RECEIVE_PRINT_ID, 'purchase-receive.pdf'); }}
            >
              <Download size={14} />
              {t('purchaseReceive.downloadPdf')}
            </button>
            <button type="button" className="btn-secondary py-1.5 text-xs" onClick={handleExportExcel}>
              <FileSpreadsheet size={14} />
              {t('common.exportExcel')}
            </button>
            <button
              type="button"
              className="btn-secondary py-1.5 text-xs"
              onClick={() => { inventoryApi.recordPrint({ entityType: 'purchase_receive_list', entityId: null, label: 'print' }).catch(() => {}); window.print(); }}
            >
              <Printer size={14} />
              {t('common.print')}
            </button>
          </div>
        </div>
        <div className="border-b border-slate-100 p-5 no-print">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{t('purchaseReceive.eyebrow')}</p>
            <div className="flex flex-wrap gap-2 text-sm font-bold">
              <span className="muted-chip">{formatNumber(vm.total)} {t('purchaseReceive.purchaseCount')}</span>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input className="input pl-10" value={vm.purchaseNumber} onChange={(event) => vm.setPurchaseNumber(event.target.value)} placeholder={t('purchaseReceive.purchaseNumberLabel')} />
            </div>
            <input className="input" value={vm.supplierInvoiceNo} onChange={(event) => vm.setSupplierInvoiceNo(event.target.value)} placeholder={t('purchaseReceive.supplierInvoiceNoFilterLabel')} />
            <Select className="input" value={vm.supplierId} onChange={(event) => vm.setSupplierId(event.target.value)}>
              <option value="">{t('purchaseReceive.allSuppliers')}</option>
              {supplierDirectory.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </Select>
            <Select className="input" value={vm.paymentStatus} onChange={(event) => vm.setPaymentStatus(event.target.value)}>
              <option value="">{t('purchaseReceive.allPaymentStatuses')}</option>
              <option value="PAID">{t('purchaseReceive.paymentStatuses.PAID')}</option>
              <option value="PARTIAL">{t('purchaseReceive.paymentStatuses.PARTIAL')}</option>
              <option value="DUE">{t('purchaseReceive.paymentStatuses.DUE')}</option>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <DatePickerField value={vm.dateFrom} onChange={vm.setDateFrom} placeholder={t('purchaseReceive.dateFrom')} />
              <DatePickerField value={vm.dateTo} onChange={vm.setDateTo} placeholder={t('purchaseReceive.dateTo')} min={vm.dateFrom} />
            </div>
          </div>
        </div>
        {vm.loading ? (
          <div className="p-5">
            <TableSkeleton columns={8} showHeader={false} />
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
                <th className="px-4 py-3">{t('purchaseReceive.purchaseNumber')}</th>
                <th className="px-4 py-3">{t('purchaseReceive.supplier')}</th>
                <th className="px-4 py-3">{t('purchaseReceive.date')}</th>
                <th className="px-4 py-3">{t('purchaseReceive.supplierInvoiceNo')}</th>
                <th className="px-4 py-3 text-right">{t('purchaseReceive.totalAmount')}</th>
                <th className="px-4 py-3 text-right">{t('purchaseReceive.dueAmount')}</th>
                <th className="px-4 py-3">{t('purchaseReceive.paymentStatus')}</th>
                <th className="px-4 py-3 text-right no-print">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vm.items.map((receipt, index) => (
                <tr key={receipt.id} className="hover:bg-slate-50">
                  <td className="table-cell font-semibold text-slate-400">{(vm.page - 1) * vm.pageSize + index + 1}</td>
                  <td className="table-cell font-semibold text-slate-950">{receipt.purchaseNumber}</td>
                  <td className="table-cell">{receipt.supplierName || '-'}</td>
                  <td className="table-cell">{formatDateTime(receipt.purchaseDate)}</td>
                  <td className="hidden table-cell lg:table-cell">{receipt.supplierInvoiceNo || '-'}</td>
                  <td className="table-cell text-right font-bold">{formatCurrency(receipt.totalAmount)}</td>
                  <td className="hidden table-cell text-right font-bold text-rose-700 sm:table-cell">{formatCurrency(receipt.dueAmount)}</td>
                  <td className="table-cell">
                    <Badge tone={paymentStatusTone(paymentStatusOf(receipt))}>
                      {t(`purchaseReceive.paymentStatuses.${paymentStatusOf(receipt)}`)}
                    </Badge>
                  </td>
                  <td className="table-cell no-print">
                    <div className="row-actions flex justify-end gap-2">
                      <button type="button" className="icon-btn" title={t('common.view')} onClick={() => setViewReceipt(receipt)}>
                        <Eye size={16} />
                      </button>
                      {canManagePurchases ? (
                        <>
                          <button type="button" className="icon-btn" title={t('common.edit')} onClick={() => setFormModal({ mode: 'edit', purchaseReceipt: receipt })}>
                            <Pencil size={16} />
                          </button>
                          <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" title={t('common.delete')} onClick={async () => { const r = await deletePurchaseReceipt(receipt); if (r.ok) vm.reload(); }}>
                            <Trash2 size={16} />
                          </button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
        {!vm.loading && !vm.error && !vm.items.length ? (
          <div className="p-5">
            <EmptyState title={t('purchaseReceive.noMatchTitle')} description={t('purchaseReceive.noMatchDescription')} icon={ShoppingCart} />
          </div>
        ) : null}
        {!vm.loading && !vm.error && vm.items.length ? (
          <div className="border-t border-slate-100 px-5 py-4 no-print">
            <Pagination page={vm.page} totalPages={vm.totalPages} onPageChange={vm.setPage} />
          </div>
        ) : null}
      </div>

      {formModal ? (
        <PurchaseReceiveFormModal
          purchaseReceipt={formModal.purchaseReceipt}
          onClose={() => setFormModal(null)}
          onSave={async (value) => {
            const result = await savePurchaseReceipt(value);
            if (result.ok) {
              setFormModal(null);
              vm.reload();
              if (!value.id && result.purchaseReceipt) {
                setViewReceipt(result.purchaseReceipt);
              }
            }
            return result;
          }}
        />
      ) : null}

      {viewReceipt ? <PurchaseReceiptViewModal purchaseReceipt={viewReceipt} onClose={() => setViewReceipt(null)} /> : null}
    </div>
  );
}

