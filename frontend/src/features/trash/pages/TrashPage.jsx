import { useEffect, useMemo, useState } from 'react';
import { Boxes, Building2, CircleDollarSign, RotateCcw, ShoppingCart, Store, Trash2, UserCog, Users, Wallet } from 'lucide-react';
import { Alert, EmptyState, MobileCardList, MobileListCard, Pagination, SectionHeader, TableSkeleton, cx } from '../../../components/ui.jsx';
import TableReportActions from '../../../components/TableReportActions.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { formatDateTime } from '../../../utils/calculations.js';
import { useTenantApiQuery } from '../../../queries/useTenantApiQuery.js';

const TRASH_REPORT_ID = 'trash-report';
const TAB_SHORTCUTS = ['Alt+1', 'Alt+2', 'Alt+3', 'Alt+4', 'Alt+5', 'Alt+6', 'Alt+7', 'Alt+8'];
const TRASH_REPORT_SHORTCUTS = {
  pdf: { alt: true, key: 'd', label: 'Alt+D' },
  excel: { alt: true, key: 'e', label: 'Alt+E' },
  csv: { alt: true, key: 'c', label: 'Alt+C' },
  print: { alt: true, key: 'p', label: 'Alt+P' },
};

export default function TrashPage() {
  const {
    t,
    can,
    restoreProduct,
    permanentlyDeleteProduct,
    restoreShop,
    permanentlyDeleteShop,
    restoreDsr,
    permanentlyDeleteDsr,
    restoreExpense,
    permanentlyDeleteExpense,
    restoreUser,
    permanentlyDeleteUser,
    restoreSupplier,
    permanentlyDeleteSupplier,
    restorePurchaseReceipt,
    restoreSupplierPayment,
  } = useInventoryApp();

  const tabs = useMemo(
    () => [
      {
        key: 'products',
        labelKey: 'nav.products',
        icon: Boxes,
        permission: 'manage_products',
        list: inventoryApi.listProductsTrash,
        restore: restoreProduct,
        permanentlyDelete: permanentlyDeleteProduct,
        getName: (item) => item.name,
      },
      {
        key: 'shops',
        labelKey: 'nav.shops',
        icon: Store,
        permission: 'manage_customers',
        list: inventoryApi.listCustomersTrash,
        restore: restoreShop,
        permanentlyDelete: permanentlyDeleteShop,
        getName: (item) => item.shopName,
      },
      {
        key: 'dsrs',
        labelKey: 'nav.dsrs',
        icon: Users,
        permission: 'manage_dsrs',
        list: inventoryApi.listDsrsTrash,
        restore: restoreDsr,
        permanentlyDelete: permanentlyDeleteDsr,
        getName: (item) => item.name,
      },
      {
        key: 'expenses',
        labelKey: 'nav.expenses',
        icon: CircleDollarSign,
        permission: 'manage_expenses',
        list: inventoryApi.listExpensesTrash,
        restore: restoreExpense,
        permanentlyDelete: permanentlyDeleteExpense,
        getName: (item) => item.category,
      },
      {
        key: 'users',
        labelKey: 'nav.users',
        icon: UserCog,
        permission: 'manage_users',
        list: inventoryApi.listUsersTrash,
        restore: restoreUser,
        permanentlyDelete: permanentlyDeleteUser,
        getName: (item) => item.name,
      },
      {
        key: 'suppliers',
        labelKey: 'nav.suppliers',
        icon: Building2,
        permission: 'manage_suppliers',
        list: inventoryApi.listSuppliersTrash,
        restore: restoreSupplier,
        permanentlyDelete: permanentlyDeleteSupplier,
        getName: (item) => item.name,
      },
      {
        key: 'purchase-receive',
        labelKey: 'nav.purchaseReceive',
        icon: ShoppingCart,
        permission: 'manage_purchases',
        list: inventoryApi.listPurchaseReceiptsTrash,
        restore: restorePurchaseReceipt,
        getName: (item) => item.purchaseNumber,
      },
      {
        key: 'supplier-payments',
        labelKey: 'nav.supplierPayments',
        icon: Wallet,
        permission: 'manage_supplier_payments',
        list: inventoryApi.listSupplierPaymentsTrash,
        restore: restoreSupplierPayment,
        getName: (item) => item.supplierName || item.id,
      },
    ],
    [
      restoreProduct,
      permanentlyDeleteProduct,
      restoreShop,
      permanentlyDeleteShop,
      restoreDsr,
      permanentlyDeleteDsr,
      restoreExpense,
      permanentlyDeleteExpense,
      restoreUser,
      permanentlyDeleteUser,
      restoreSupplier,
      permanentlyDeleteSupplier,
      restorePurchaseReceipt,
      restoreSupplierPayment,
    ],
  );

  const visibleTabs = tabs.filter((tab) => can(tab.permission));
  const [activeKey, setActiveKey] = useState(visibleTabs[0]?.key || null);
  const activeTab = visibleTabs.find((tab) => tab.key === activeKey) || visibleTabs[0] || null;

  const canPermanentDelete = can('permanent_delete');

  useEffect(() => {
    function handleKeyDown(event) {
      const isShortcut = event.altKey && !event.ctrlKey && !event.metaKey;
      if (!isShortcut) return;
      const index = Number(event.key) - 1;
      if (index >= 0 && index < visibleTabs.length) {
        event.preventDefault();
        setActiveKey(visibleTabs[index].key);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleTabs.map((tab) => tab.key).join(',')]);

  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [activeKey]);

  const trashQuery = useTenantApiQuery({
    scope: 'trash',
    params: { activeKey, page, pageSize: 20 },
    queryFn: () => activeTab.list({ page, pageSize: 20 }),
    enabled: Boolean(activeTab),
    keepPrevious: true,
  });
  const items = trashQuery.data?.items || [];
  const totalPages = trashQuery.data?.totalPages || 0;
  const loading = trashQuery.isLoading || trashQuery.isFetching;
  const error = trashQuery.error?.message || '';
  const reload = () => trashQuery.refetch();

  async function handleRestore(item) {
    const result = await activeTab.restore(item);
    if (result.ok) {
      reload();
    }
  }

  async function handlePermanentDelete(item) {
    const result = await activeTab.permanentlyDelete(item);
    if (result.ok) {
      reload();
    }
  }

  if (!visibleTabs.length) {
    return (
      <div>
        <SectionHeader eyebrow={t('trash.eyebrow')} description={t('trash.description')} />
        <EmptyState title={t('trash.noAccessTitle')} description={t('trash.noAccessDescription')} icon={Trash2} />
      </div>
    );
  }

  return (
    <div>
      <SectionHeader eyebrow={t('trash.eyebrow')} description={t('trash.description')} />

      <div className="no-print mb-4">
        <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
          {visibleTabs.map((tab, index) => {
            const Icon = tab.icon;
            const selected = activeKey === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                className={cx(
                  'flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 text-sm font-bold transition',
                  selected ? 'border border-indigo-200 bg-indigo-50 text-indigo-800 shadow-sm ring-2 ring-indigo-100' : 'border border-transparent text-slate-500 hover:bg-white/70 hover:text-slate-800',
                )}
                aria-pressed={selected}
                onClick={() => setActiveKey(tab.key)}
              >
                <Icon size={16} />
                {t(tab.labelKey)}
                <kbd className={cx('rounded border px-1.5 py-0.5 text-[10px] font-black', selected ? 'border-indigo-200 bg-white text-indigo-700' : 'border-slate-200 bg-white text-slate-400')}>{TAB_SHORTCUTS[index]}</kbd>
              </button>
            );
          })}
        </div>
      </div>

      <div id={TRASH_REPORT_ID} className="surface overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 no-print">
          <span className="text-sm font-bold text-slate-700">{activeTab ? t(activeTab.labelKey) : t('nav.trash')}</span>
          <TableReportActions targetId={TRASH_REPORT_ID} title={activeTab ? `${t('nav.trash')} - ${t(activeTab.labelKey)}` : t('nav.trash')} fileName={`trash-${activeKey || 'items'}`} entityType="trash" t={t} shortcuts={TRASH_REPORT_SHORTCUTS} />
        </div>
        {loading ? (
          <div className="p-5">
            <TableSkeleton columns={5} showHeader={false} />
          </div>
        ) : error ? (
          <div className="p-5">
            <Alert type="error">{error}</Alert>
          </div>
        ) : !items.length ? (
          <div className="p-5">
            <EmptyState title={t('trash.emptyTitle')} description={t('trash.emptyDescription')} icon={Trash2} />
          </div>
        ) : (
          <>
          <MobileCardList>
            {items.map((item) => (
              <MobileListCard
                key={item.id}
                title={activeTab.getName(item) || '-'}
                subtitle={`${item.deletedByName || '-'} · ${formatDateTime(item.deletedAt)}`}
                action={(
                  <div className="flex items-center gap-1">
                    <button type="button" className="icon-btn text-emerald-600 hover:text-emerald-700" title={t('trash.restore')} onClick={() => handleRestore(item)}>
                      <RotateCcw size={16} />
                    </button>
                    {canPermanentDelete && activeTab.permanentlyDelete ? (
                      <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" title={t('trash.permanentDelete')} onClick={() => handlePermanentDelete(item)}>
                        <Trash2 size={16} />
                      </button>
                    ) : null}
                  </div>
                )}
              />
            ))}
          </MobileCardList>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">{t('trash.name')}</th>
                  <th className="px-4 py-3">{t('trash.deletedAt')}</th>
                  <th className="px-4 py-3">{t('trash.deletedBy')}</th>
                  <th className="px-4 py-3">{t('trash.reason')}</th>
                  <th className="px-4 py-3 text-right no-print">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="table-cell font-semibold text-slate-950">{activeTab.getName(item) || '-'}</td>
                    <td className="table-cell">{formatDateTime(item.deletedAt)}</td>
                    <td className="table-cell">{item.deletedByName || '-'}</td>
                    <td className="table-cell">{item.deleteReason || '-'}</td>
                    <td className="table-cell no-print">
                      <div className="row-actions flex justify-end gap-2">
                        <button type="button" className="icon-btn text-emerald-600 hover:text-emerald-700" title={t('trash.restore')} onClick={() => handleRestore(item)}>
                          <RotateCcw size={16} />
                        </button>
                        {canPermanentDelete && activeTab.permanentlyDelete ? (
                          <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" title={t('trash.permanentDelete')} onClick={() => handlePermanentDelete(item)}>
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
        {!loading && !error && items.length ? (
          <div className="border-t border-slate-100 px-5 py-4">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
