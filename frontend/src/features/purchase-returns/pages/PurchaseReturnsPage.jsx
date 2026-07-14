import { useState } from 'react';
import { Plus, Trash2, Undo2 } from 'lucide-react';
import { Alert, CopyableText, EmptyState, Pagination, SectionHeader, TableSkeleton, Select } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency, formatDateTime, formatNumber } from '../../../utils/calculations.js';
import PurchaseReturnFormModal from '../components/PurchaseReturnFormModal';
import { usePurchaseReturnsViewModel } from '../viewmodels/usePurchaseReturnsViewModel';

export default function PurchaseReturnsPage() {
  const { savePurchaseReturn, deletePurchaseReturn, t, can, supplierDirectory } = useInventoryApp();
  const vm = usePurchaseReturnsViewModel();
  const [formOpen, setFormOpen] = useState(false);
  const canManage = can('manage_purchase_returns');

  return (
    <div>
      <SectionHeader
        eyebrow={t('purchaseReturns.eyebrow')}
        title={t('purchaseReturns.title')}
        description={t('purchaseReturns.description')}
        action={canManage ? (
          <button type="button" className="btn-primary" onClick={() => setFormOpen(true)}>
            <Plus size={18} />
            {t('purchaseReturns.add')}
          </button>
        ) : null}
      />

      <div className="surface overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{t('purchaseReturns.eyebrow')}</p>
            <div className="flex flex-wrap gap-2 text-sm font-bold">
              <span className="muted-chip">{formatNumber(vm.total)} {t('purchaseReturns.returnCount')}</span>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Select className="input" value={vm.supplierId} onChange={(event) => vm.setSupplierId(event.target.value)}>
              <option value="">{t('purchaseReturns.allSuppliers')}</option>
              {supplierDirectory.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </Select>
            <DatePickerField value={vm.dateFrom} onChange={vm.setDateFrom} placeholder={t('purchaseReturns.dateFrom')} />
            <DatePickerField value={vm.dateTo} onChange={vm.setDateTo} placeholder={t('purchaseReturns.dateTo')} min={vm.dateFrom} />
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
                <th className="px-4 py-3">{t('purchaseReturns.number')}</th>
                <th className="px-4 py-3">{t('purchaseReturns.date')}</th>
                <th className="px-4 py-3">{t('purchaseReturns.supplier')}</th>
                <th className="px-4 py-3">{t('purchaseReturns.items')}</th>
                <th className="px-4 py-3 text-right">{t('purchaseReturns.total')}</th>
                <th className="px-4 py-3">{t('purchaseReturns.note')}</th>
                <th className="px-4 py-3 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vm.items.map((purchaseReturn) => (
                <tr key={purchaseReturn.id} className="hover:bg-slate-50">
                  <td className="table-cell"><CopyableText value={purchaseReturn.returnNumber} copyLabel={t('purchaseReturns.number')} displayValue={purchaseReturn.returnNumber} textClassName="font-semibold text-slate-950" /></td>
                  <td className="table-cell">{formatDateTime(purchaseReturn.returnDate)}</td>
                  <td className="table-cell font-semibold text-slate-950">{purchaseReturn.supplierName || '-'}</td>
                  <td className="table-cell">
                    {purchaseReturn.items.map((item) => (
                      <div key={item.id} className="text-sm">
                        {item.productName} × {formatNumber(item.quantityPieces)}
                      </div>
                    ))}
                  </td>
                  <td className="table-cell text-right font-bold text-rose-700">{formatCurrency(purchaseReturn.totalAmount)}</td>
                  <td className="table-cell">{purchaseReturn.note || '-'}</td>
                  <td className="table-cell">
                    {canManage ? (
                      <div className="row-actions flex justify-end gap-2">
                        <button
                          type="button"
                          className="icon-btn text-rose-600 hover:text-rose-700"
                          title={t('common.delete')}
                          onClick={async () => { const r = await deletePurchaseReturn(purchaseReturn); if (r.ok) vm.reload(); }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
        {!vm.loading && !vm.error && !vm.items.length ? (
          <div className="p-5">
            <EmptyState title={t('purchaseReturns.noMatchTitle')} description={t('purchaseReturns.noMatchDescription')} icon={Undo2} />
          </div>
        ) : null}
        {!vm.loading && !vm.error && vm.items.length ? (
          <div className="border-t border-slate-100 px-5 py-4">
            <Pagination page={vm.page} totalPages={vm.totalPages} onPageChange={vm.setPage} />
          </div>
        ) : null}
      </div>

      {formOpen ? (
        <PurchaseReturnFormModal
          onClose={() => setFormOpen(false)}
          onSave={async (value) => {
            const result = await savePurchaseReturn(value);
            if (result.ok) {
              setFormOpen(false);
              vm.reload();
            }
            return result;
          }}
        />
      ) : null}
    </div>
  );
}
