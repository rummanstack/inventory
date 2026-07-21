import { HandCoins, Tag } from 'lucide-react';
import { Alert, EmptyState, MobileCardList, MobileListCard, Pagination, SectionHeader, Select, TableSkeleton } from '../../../components/ui.jsx';
import TableReportActions from '../../../components/TableReportActions.jsx';
import { DateRangePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { formatCurrency, formatDateTime } from '../../../utils/calculations.js';
import { useSupplierDiscountsViewModel } from '../viewmodels/useSupplierDiscountsViewModel.js';
import { useMutation } from '@tanstack/react-query';
import { getActiveTenantId } from '../../../services/api/client.js';
import { transactionKeys } from '../../transactions/queries/transactionQueries.js';

const SUPPLIER_DISCOUNTS_REPORT_ID = 'supplier-discounts-report';
const SUPPLIER_DISCOUNTS_SHORTCUTS = {
  pdf: { alt: true, key: 'd', label: 'Alt+D' },
  excel: { alt: true, key: 'e', label: 'Alt+E' },
  csv: { alt: true, key: 'c', label: 'Alt+C' },
  print: { alt: true, key: 'p', label: 'Alt+P' },
};

export default function SupplierDiscountsPage() {
  const { confirm, pushToast, can, t, supplierDirectory } = useInventoryApp();
  const vm = useSupplierDiscountsViewModel();
  const canManagePayments = can('manage_supplier_payments');
  const clearDiscountMutation = useMutation({
    mutationKey: transactionKeys.mutation(getActiveTenantId(), 'clear-supplier-discount'),
    mutationFn: (id) => inventoryApi.deleteSupplierDiscount(id),
  });

  async function handleClear(discount) {
    const { confirmed } = await confirm({
      title: t('supplierDiscounts.clearConfirmTitle'),
      description: t('supplierDiscounts.clearConfirmDescription', {
        amount: formatCurrency(discount.amount),
        dsrName: discount.dsrName,
        date: formatDateTime(discount.discountDate),
      }),
      confirmLabel: t('supplierDiscounts.clearConfirmLabel'),
      danger: false,
    });
    if (!confirmed) return;
    try {
      await clearDiscountMutation.mutateAsync(discount.id);
      pushToast('success', t('supplierDiscounts.cleared'));
      vm.reload();
    } catch (err) {
      pushToast('error', err.message || t('supplierDiscounts.clearFailed'));
    }
  }

  return (
    <div>
      <SectionHeader title={t('supplierDiscounts.title')} compact />

      <div id={SUPPLIER_DISCOUNTS_REPORT_ID} className="surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-end">
          <div className="w-full sm:w-64">
            <label className="label" htmlFor="supplier-discounts-supplier">{t('supplierDiscounts.supplier')}</label>
            <Select id="supplier-discounts-supplier" className="input" value={vm.supplierId} onChange={(event) => vm.setSupplierId(event.target.value)}>
              <option value="">{t('supplierPayments.allSuppliers')}</option>
              {supplierDirectory.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </Select>
          </div>
          <div className="w-full sm:w-72">
            <label className="label">{t('supplierDiscounts.dateRangeLabel')}</label>
            <DateRangePickerField
              from={vm.dateFrom}
              to={vm.dateTo}
              onChange={(from, to) => { vm.setDateFrom(from); vm.setDateTo(to); }}
              placeholder={`${t('supplierDiscounts.dateFromPlaceholder')} - ${t('supplierDiscounts.dateToPlaceholder')}`}
            />
          </div>
          <div className="sm:ml-auto">
            <TableReportActions targetId={SUPPLIER_DISCOUNTS_REPORT_ID} title={t('supplierDiscounts.tableTitle')} fileName="supplier-discounts" entityType="supplier_discounts" t={t} shortcuts={SUPPLIER_DISCOUNTS_SHORTCUTS} />
          </div>
        </div>

        {vm.loading ? (
          <div className="p-5"><TableSkeleton columns={6} showHeader={false} /></div>
        ) : vm.error ? (
          <div className="p-5"><Alert type="error">{vm.error}</Alert></div>
        ) : (
          <>
          <MobileCardList>
            {vm.items.map((discount) => (
              <MobileListCard
                key={discount.id}
                title={discount.dsrName || '-'}
                subtitle={`${discount.supplierName || '-'} · ${formatDateTime(discount.discountDate)}`}
                value={formatCurrency(discount.amount)}
                valueClass="text-emerald-700"
                action={canManagePayments ? (
                  <button
                    type="button"
                    className="icon-btn text-emerald-600 hover:text-emerald-700"
                    title={t('supplierDiscounts.clearDiscountTitle')}
                    onClick={() => handleClear(discount)}
                  >
                    <HandCoins size={16} />
                  </button>
                ) : null}
              />
            ))}
          </MobileCardList>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">{t('supplierDiscounts.date')}</th>
                  <th className="px-4 py-3">{t('supplierDiscounts.dsr')}</th>
                  <th className="px-4 py-3">{t('supplierDiscounts.supplier')}</th>
                  <th className="px-4 py-3 text-right">{t('supplierDiscounts.amount')}</th>
                  <th className="px-4 py-3">{t('supplierDiscounts.note')}</th>
                  {canManagePayments ? <th className="px-4 py-3 text-right no-print">{t('supplierDiscounts.actions')}</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vm.items.map((discount, index) => (
                  <tr key={discount.id} className="hover:bg-slate-50">
                    <td className="table-cell font-semibold text-slate-400">{(vm.page - 1) * vm.pageSize + index + 1}</td>
                    <td className="table-cell">{formatDateTime(discount.discountDate)}</td>
                    <td className="table-cell font-semibold text-slate-950">{discount.dsrName || '-'}</td>
                    <td className="table-cell text-slate-700">{discount.supplierName || <span className="text-slate-300">-</span>}</td>
                    <td className="table-cell text-right font-bold text-emerald-700">{formatCurrency(discount.amount)}</td>
                    <td className="table-cell">{discount.note || '-'}</td>
                    {canManagePayments ? (
                      <td className="table-cell no-print">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            className="icon-btn text-emerald-600 hover:text-emerald-700"
                            title={t('supplierDiscounts.clearDiscountTitle')}
                            onClick={() => handleClear(discount)}
                          >
                            <HandCoins size={16} />
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}

        {!vm.loading && !vm.error && !vm.items.length ? (
          <div className="p-5">
            <EmptyState title={t('supplierDiscounts.noneTitle')} description={t('supplierDiscounts.noneDescription')} icon={Tag} />
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
