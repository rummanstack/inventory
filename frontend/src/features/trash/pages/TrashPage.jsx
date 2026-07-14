import { useEffect, useMemo, useState } from 'react';
import { Boxes, Building2, CircleDollarSign, RotateCcw, ShoppingCart, Store, Trash2, UserCog, Users, Wallet } from 'lucide-react';
import { Alert, EmptyState, Pagination, SectionHeader, TableSkeleton } from '../../../components/ui.jsx';
import TableReportActions from '../../../components/TableReportActions.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { formatDateTime } from '../../../utils/calculations.js';

const TRASH_REPORT_ID = 'trash-report';

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

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setPage(1);
  }, [activeKey]);

  useEffect(() => {
    if (!activeTab) {
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const result = await activeTab.list({ page, pageSize: 20 });
        if (cancelled) return;
        setItems(result.items || []);
        setTotalPages(result.totalPages || 0);
      } catch (err) {
        if (cancelled) return;
        setError(err?.message || t('alerts.requestFailed'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [activeTab, page, t]);

  async function reload() {
    if (!activeTab) return;
    setLoading(true);
    try {
      const result = await activeTab.list({ page, pageSize: 20 });
      setItems(result.items || []);
      setTotalPages(result.totalPages || 0);
    } catch (err) {
      setError(err?.message || t('alerts.requestFailed'));
    } finally {
      setLoading(false);
    }
  }

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

      <div className="mb-4 flex flex-wrap gap-2">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeKey === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              className={isActive ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setActiveKey(tab.key)}
            >
              <Icon size={16} />
              {t(tab.labelKey)}
            </button>
          );
        })}
      </div>

      <div id={TRASH_REPORT_ID} className="surface overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 no-print">
          <span className="text-sm font-bold text-slate-700">{activeTab ? t(activeTab.labelKey) : t('nav.trash')}</span>
          <TableReportActions targetId={TRASH_REPORT_ID} title={activeTab ? `${t('nav.trash')} - ${t(activeTab.labelKey)}` : t('nav.trash')} fileName={`trash-${activeKey || 'items'}`} entityType="trash" t={t} />
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
          <div className="overflow-x-auto">
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
