import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Download, FileSpreadsheet, Loader2, Pencil, Phone, Plus, Printer, Search, Trash2, Users } from 'lucide-react';
import { Alert, Badge, EmptyState, MobileCardList, MobileListCard, Pagination, SectionHeader, TableSkeleton, Select } from '../../../components/ui.jsx';
import { statusTone } from '../../../models/inventoryViewData.js';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { downloadSheetPdf } from '../../../services/printService.js';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { formatCurrency } from '../../../utils/calculations.js';
import RetailCustomerFormModal from '../components/RetailCustomerFormModal.jsx';
import CreditSettingsModal from '../../installment-sales/components/CreditSettingsModal.jsx';
import { useRetailCustomersViewModel } from '../viewmodels/useRetailCustomersViewModel';
import { useAsyncAction } from '../../../hooks/useAsyncAction.js';

const RETAIL_CUSTOMERS_PRINT_ID = 'retail-customers-print';

export default function RetailCustomersPage() {
  const { t, can, hasFeature, pushToast, confirm } = useInventoryApp();
  const navigate = useNavigate();
  const vm = useRetailCustomersViewModel();
  const [formModal, setFormModal] = useState(null);
  const [creditSettingsCustomer, setCreditSettingsCustomer] = useState(null);
  const canManage = can('manage_retail_customers_write');
  const canManageInstallmentCredit = hasFeature('installment-sales') && can('manage_installment_credit_settings');
  const [downloadingPdf, downloadPdf] = useAsyncAction();

  async function handleExportExcel() {
    const result = await inventoryApi.listRetailCustomers({ search: vm.search || undefined, status: vm.status || undefined, page: 1, pageSize: 10000 });
    const all = result.items || [];
    const { utils, writeFile } = await import('xlsx');
    const header = ['#', t('retailCustomers.name'), t('retailCustomers.phone'), t('retailCustomers.address'), t('retailCustomers.currentDue'), t('retailCustomers.loyaltyPoints'), t('retailCustomers.status')];
    const data = all.map((customer, i) => [
      i + 1,
      customer.name,
      customer.phone || '',
      customer.address || '',
      Number(customer.currentDue || 0),
      Number(customer.loyaltyPointsBalance || 0),
      customer.status === 'ACTIVE' ? t('retailCustomers.statusActive') : t('retailCustomers.statusInactive'),
    ]);
    const ws = utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [{ wch: 6 }, { wch: 24 }, { wch: 16 }, { wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 12 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, t('retailCustomers.sheetName'));
    writeFile(wb, 'retail-customers.xlsx');
  }

  async function saveRetailCustomer(payload) {
    try {
      const result = payload.id
        ? await inventoryApi.updateRetailCustomer(payload)
        : await inventoryApi.createRetailCustomer(payload);
      pushToast('success', payload.id ? t('retailCustomers.editTitle') : t('retailCustomers.addTitle'), `${payload.name} ${payload.id ? t('alerts.updated') : t('alerts.created')}`);
      setFormModal(null);
      vm.reload();
      return { ok: true, retailCustomer: result.retailCustomer };
    } catch (error) {
      const message = error?.message || t('retailCustomers.saveFailed');
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function deleteRetailCustomer(customer) {
    const { confirmed, reason } = await confirm({
      title: t('retailCustomers.deleteTitle'),
      description: t('retailCustomers.deleteConfirm', { name: customer.name }),
      requireReason: false,
    });
    if (!confirmed) return { ok: false };

    try {
      await inventoryApi.deleteRetailCustomer(customer.id, reason);
      pushToast('success', t('common.delete'), `${customer.name} ${t('alerts.deleted')}`);
      vm.reload();
      return { ok: true };
    } catch (error) {
      pushToast('error', t('alerts.deleteFailed'), error?.message || t('alerts.requestFailed'));
      return { ok: false };
    }
  }

  return (
    <div>
      <SectionHeader
        eyebrow={t('retailCustomers.eyebrow')}
        title={t('retailCustomers.title')}
        description={t('retailCustomers.description')}
        action={(
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={() => navigate('/retail-customers/retention')}>
              {t('retailCustomers.viewRetention')}
            </button>
            {canManage ? (
              <button type="button" className="btn-primary" onClick={() => setFormModal({ mode: 'add' })}>
                <Plus size={18} />
                {t('retailCustomers.add')}
              </button>
            ) : null}
          </div>
        )}
      />

      <div id={RETAIL_CUSTOMERS_PRINT_ID} className="surface overflow-hidden print-target">
        <div className="border-b border-slate-100 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{t('retailCustomers.eyebrow')}</p>
            <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
              <span className="muted-chip">{vm.total} {t('retailCustomers.count')}</span>
              <button
                type="button"
                className="btn-secondary no-print py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => downloadPdf(async () => { await inventoryApi.recordPrint({ entityType: 'retail_customers', entityId: null, label: 'pdf' }).catch(() => {}); await downloadSheetPdf(RETAIL_CUSTOMERS_PRINT_ID, 'retail-customers.pdf'); })}
                disabled={downloadingPdf}
              >
                {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                {t('purchaseReceive.downloadPdf')}
              </button>
              <button type="button" className="btn-secondary no-print py-1.5 text-xs" onClick={handleExportExcel}>
                <FileSpreadsheet size={14} />
                {t('common.exportExcel')}
              </button>
              <button
                type="button"
                className="btn-secondary no-print py-1.5 text-xs"
                onClick={() => { inventoryApi.recordPrint({ entityType: 'retail_customers', entityId: null, label: 'print' }).catch(() => {}); window.print(); }}
              >
                <Printer size={14} />
                {t('common.print')}
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input className="input pl-10" value={vm.search} onChange={(event) => vm.setSearch(event.target.value)} placeholder={t('retailCustomers.searchPlaceholder')} />
            </div>
            <Select className="input sm:w-48" value={vm.status} onChange={(event) => vm.setStatus(event.target.value)}>
              <option value="">{t('retailCustomers.allStatuses')}</option>
              <option value="ACTIVE">{t('retailCustomers.statusActive')}</option>
              <option value="INACTIVE">{t('retailCustomers.statusInactive')}</option>
            </Select>
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
            {vm.items.map((customer) => (
              <MobileListCard
                key={customer.id}
                onClick={canManage ? () => setFormModal({ mode: 'edit', retailCustomer: customer }) : undefined}
                title={customer.name}
                badge={customer.status !== 'ACTIVE' ? (
                  <Badge tone={statusTone('Inactive')}>{t('retailCustomers.statusInactive')}</Badge>
                ) : null}
                subtitle={customer.phone || customer.address || '-'}
                value={formatCurrency(customer.currentDue || 0)}
                valueClass={Number(customer.currentDue) > 0 ? 'text-rose-700' : 'text-slate-500'}
                valueSub={Number(customer.loyaltyPointsBalance || 0) > 0 ? `${Number(customer.loyaltyPointsBalance)} pts` : null}
              />
            ))}
          </MobileCardList>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">{t('retailCustomers.name')}</th>
                  <th className="px-4 py-3">{t('retailCustomers.phone')}</th>
                  <th className="px-4 py-3">{t('retailCustomers.address')}</th>
                  <th className="px-4 py-3 text-right">{t('retailCustomers.currentDue')}</th>
                  <th className="px-4 py-3">{t('retailCustomers.loyaltyPoints')}</th>
                  <th className="px-4 py-3">{t('retailCustomers.status')}</th>
                  {canManage || canManageInstallmentCredit ? <th className="px-4 py-3 text-right no-print">{t('common.actions')}</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vm.items.map((customer, index) => (
                  <tr key={customer.id} className="hover:bg-slate-50">
                    <td className="table-cell font-semibold text-slate-400">{(vm.page - 1) * vm.pageSize + index + 1}</td>
                    <td className="table-cell font-semibold text-slate-950">{customer.name}</td>
                    <td className="hidden table-cell sm:table-cell">
                      <span className="inline-flex items-center gap-2">
                        <Phone size={15} className="text-slate-400" />
                        {customer.phone || '-'}
                      </span>
                    </td>
                    <td className="hidden table-cell md:table-cell">{customer.address || '-'}</td>
                    <td className="table-cell text-right">
                      <span className={`font-bold ${customer.currentDue > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
                        {formatCurrency(customer.currentDue || 0)}
                      </span>
                    </td>
                    <td className="hidden table-cell lg:table-cell font-bold text-slate-950">{Number(customer.loyaltyPointsBalance || 0)}</td>
                    <td className="table-cell">
                      <Badge tone={statusTone(customer.status === 'ACTIVE' ? 'Active' : 'Inactive')}>
                        {customer.status === 'ACTIVE' ? t('retailCustomers.statusActive') : t('retailCustomers.statusInactive')}
                      </Badge>
                    </td>
                    {canManage || canManageInstallmentCredit ? (
                      <td className="table-cell no-print">
                        <div className="row-actions flex justify-end gap-2">
                          {canManageInstallmentCredit ? (
                            <button type="button" className="icon-btn" title={t('installments.creditSettings.title')} onClick={() => setCreditSettingsCustomer(customer)}>
                              <CreditCard size={16} />
                            </button>
                          ) : null}
                          {canManage ? (
                            <>
                              <button type="button" className="icon-btn" title={t('common.edit')} onClick={() => setFormModal({ mode: 'edit', retailCustomer: customer })}>
                                <Pencil size={16} />
                              </button>
                              <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" title={t('common.delete')} onClick={() => deleteRetailCustomer(customer)}>
                                <Trash2 size={16} />
                              </button>
                            </>
                          ) : null}
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
            <EmptyState title={t('retailCustomers.noMatchTitle')} description={t('retailCustomers.noMatchDescription')} icon={Users} />
          </div>
        ) : null}
        {!vm.loading && !vm.error && vm.items.length ? (
          <div className="border-t border-slate-100 px-5 py-4">
            <Pagination page={vm.page} totalPages={vm.totalPages} onPageChange={vm.setPage} />
          </div>
        ) : null}
      </div>

      {formModal ? (
        <RetailCustomerFormModal
          retailCustomer={formModal.retailCustomer}
          onClose={() => setFormModal(null)}
          onSave={saveRetailCustomer}
        />
      ) : null}

      {creditSettingsCustomer ? (
        <CreditSettingsModal
          customerId={creditSettingsCustomer.id}
          onClose={() => setCreditSettingsCustomer(null)}
          onSaved={() => setCreditSettingsCustomer(null)}
        />
      ) : null}
    </div>
  );
}

