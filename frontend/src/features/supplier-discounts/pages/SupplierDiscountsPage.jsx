import { Tag, Trash2 } from 'lucide-react';
import { Alert, EmptyState, Pagination, SectionHeader, TableSkeleton } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { formatCurrency, formatDate, formatDateTime } from '../../../utils/calculations.js';
import { useSupplierDiscountsViewModel } from '../viewmodels/useSupplierDiscountsViewModel.js';

export default function SupplierDiscountsPage() {
  const { can, confirm, pushToast } = useInventoryApp();
  const vm = useSupplierDiscountsViewModel();
  const canManage = can('manage_supplier_payments');

  async function handleClear(discount) {
    const ok = await confirm({
      title: 'Clear Discount',
      description: `Remove the ${formatCurrency(discount.amount)} discount from ${discount.dsrName} settlement (${formatDateTime(discount.discountDate)})? This will reverse the cash addition.`,
      confirmLabel: 'Clear',
      danger: true,
    });
    if (!ok) return;
    try {
      await inventoryApi.deleteSupplierDiscount(discount.id);
      pushToast('success', 'Discount cleared');
      vm.reload();
    } catch (err) {
      pushToast('error', err.message || 'Failed to clear discount');
    }
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Purchases"
        title="Supplier Discounts"
        description="Discounts received from suppliers via DSR settlements — automatically added to cash when a settlement discount is recorded."
      />

      <div className="surface overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <DatePickerField value={vm.dateFrom} onChange={vm.setDateFrom} placeholder="From date" />
            <DatePickerField value={vm.dateTo} onChange={vm.setDateTo} placeholder="To date" min={vm.dateFrom} />
          </div>
        </div>

        {vm.loading ? (
          <div className="p-5"><TableSkeleton columns={6} showHeader={false} /></div>
        ) : vm.error ? (
          <div className="p-5"><Alert type="error">{vm.error}</Alert></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">DSR</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Note</th>
                  {canManage ? <th className="px-4 py-3 text-right">Actions</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vm.items.map((discount, index) => (
                  <tr key={discount.id} className="hover:bg-slate-50">
                    <td className="table-cell font-black text-slate-400">{(vm.page - 1) * vm.pageSize + index + 1}</td>
                    <td className="table-cell">{formatDateTime(discount.discountDate)}</td>
                    <td className="table-cell font-semibold text-slate-950">{discount.dsrName || '-'}</td>
                    <td className="table-cell text-slate-700">{discount.supplierName || <span className="text-slate-300">—</span>}</td>
                    <td className="table-cell text-right font-bold text-emerald-700">{formatCurrency(discount.amount)}</td>
                    <td className="hidden table-cell lg:table-cell">{discount.note || '-'}</td>
                    {canManage ? (
                      <td className="table-cell">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            className="icon-btn text-rose-600 hover:text-rose-700"
                            title="Clear Discount"
                            onClick={() => handleClear(discount)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!vm.loading && !vm.error && !vm.items.length ? (
          <div className="p-5">
            <EmptyState title="No discounts yet" description="Discounts appear here automatically when a settlement is saved with a discount amount." icon={Tag} />
          </div>
        ) : null}

        {!vm.loading && !vm.error && vm.items.length ? (
          <div className="border-t border-slate-100 px-5 py-4">
            <Pagination page={vm.page} totalPages={vm.totalPages} onPageChange={vm.setPage} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
