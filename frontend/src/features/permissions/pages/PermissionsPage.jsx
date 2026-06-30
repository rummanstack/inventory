import { useEffect, useMemo, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { Alert, SectionHeader } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { APP_ROUTES } from '../../../app/routes.js';

// Maps a permission to the tenant feature that must be enabled before it can
// be granted — mirrors PERMISSION_REQUIRED_FEATURES in backend/services/permissionService.js.
const PERMISSION_REQUIRED_FEATURES = {
  manage_suppliers: 'suppliers',
  manage_purchases: 'purchase-receive',
  manage_supplier_payments: 'supplier-payments',
  view_supplier_statement: 'supplier-statement',
  manage_retail_quick_sale: 'retailer-quick-sale',
  manage_retail_sales_invoices: 'retailer-sales-invoices',
  manage_retail_sales_returns: 'retailer-sales-return',
  manage_retail_customer_due: 'retailer-customer-due',
  manage_retail_due_collection: 'retailer-due-collection',
  manage_retail_promotions: 'retailer-promotions',
  manage_retail_daily_sales_report: 'retailer-daily-sales-report',
  manage_retail_customers_write: 'retail-customers',
  view_retail_customer_retention: 'retail-customer-retention',
  manage_profit_report: 'profit',
  view_product_serials: 'product-serials',
  manage_product_serials: 'product-serials',
  view_warranty_claims: 'warranty-claims',
  manage_warranty_claims: 'warranty-claims',
  view_repair_jobs: 'repair-jobs',
  manage_repair_jobs: 'repair-jobs',
  view_quotations: 'quotations',
  manage_quotations: 'quotations',
  view_trade_ins: 'trade-ins',
  manage_trade_ins: 'trade-ins',
  manage_srs: 'srs',
  view_employees: 'employees',
  manage_employees: 'employees',
  manage_payroll: 'payroll',
};

// Curated mapping of permissions → sidebar section, in sidebar order.
// Each permission appears exactly once. Mirrors the sidebar groups (no developer items).
const PERMISSION_GROUPS = [
  { section: 'overview', permissions: ['view_state'] },
  {
    section: 'pos',
    permissions: [
      'manage_retail_quick_sale',
      'manage_retail_sales_invoices',
      'manage_retail_sales_returns',
      'manage_retail_promotions',
      'manage_retail_daily_sales_report',
      'view_quotations',
      'manage_quotations',
      'view_trade_ins',
      'manage_trade_ins',
    ],
  },
  {
    section: 'customers',
    permissions: [
      'manage_retail_customer_due',
      'manage_retail_due_collection',
      'manage_retail_customers_write',
      'view_retail_customer_retention',
    ],
  },
  { section: 'inventory', permissions: ['manage_products', 'view_product_serials', 'manage_product_serials'] },
  {
    section: 'purchases',
    permissions: ['manage_suppliers', 'manage_purchases', 'manage_supplier_payments', 'view_supplier_statement'],
  },
  {
    section: 'dsr',
    permissions: [
      'manage_dsrs',
      'create_issues',
      'update_issues',
      'create_settlements',
      'update_settlements',
      'manage_dsr_finance',
    ],
  },
  { section: 'shops', permissions: ['manage_customers', 'manage_srs'] },
  {
    section: 'warranty',
    permissions: ['view_warranty_claims', 'manage_warranty_claims', 'view_repair_jobs', 'manage_repair_jobs'],
  },
  {
    section: 'finance',
    permissions: ['view_finance_dashboard', 'manage_finance_accounts', 'manage_expenses', 'manage_profit_report'],
  },
  { section: 'reports', permissions: ['view_activity_logs'] },
  { section: 'hr', permissions: ['view_employees', 'manage_employees', 'manage_payroll'] },
  { section: 'system', permissions: ['manage_users', 'manage_org', 'permanent_delete', 'manage_backups'] },
];

export default function PermissionsPage() {
  const { t, pushToast, hasFeature } = useInventoryApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [allPermissions, setAllPermissions] = useState([]);
  const [rolePermissions, setRolePermissions] = useState([]);
  const [originalPermissions, setOriginalPermissions] = useState({});
  const [savingRole, setSavingRole] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const result = await inventoryApi.getRolePermissions();
        if (cancelled) return;
        setAllPermissions(result.allPermissions || []);
        setRolePermissions(result.roles || []);
        setOriginalPermissions(
          Object.fromEntries((result.roles || []).map((entry) => [entry.role, [...entry.permissions].sort()])),
        );
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Failed to load permissions.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  function togglePermission(role, permission) {
    setRolePermissions((current) =>
      current.map((entry) => {
        if (entry.role !== role) return entry;
        const has = entry.permissions.includes(permission);
        return {
          ...entry,
          permissions: has ? entry.permissions.filter((item) => item !== permission) : [...entry.permissions, permission],
        };
      }),
    );
  }

  async function handleSave(role) {
    const entry = rolePermissions.find((item) => item.role === role);
    if (!entry) return;

    const current = [...entry.permissions].sort();
    const original = originalPermissions[role] || [];
    const unchanged = current.length === original.length && current.every((value, index) => value === original[index]);
    if (unchanged) {
      pushToast('info', t(`permissions.roles.${role}`), t('alerts.noChanges'));
      return;
    }

    setSavingRole(role);
    try {
      const result = await inventoryApi.updateRolePermissions(role, entry.permissions);
      setRolePermissions(result.roles || []);
      setOriginalPermissions(
        Object.fromEntries((result.roles || []).map((item) => [item.role, [...item.permissions].sort()])),
      );
      pushToast('success', t(`permissions.roles.${role}`), t('permissions.saved'));
    } catch (err) {
      const message = err?.message || 'Failed to save permissions.';
      pushToast('error', t('alerts.requestFailed'), message);
    } finally {
      setSavingRole('');
    }
  }

  // Icon for each permission — first route in APP_ROUTES that uses the permission, in sidebar order.
  const iconByPermission = useMemo(() => {
    const map = {};
    for (const route of APP_ROUTES) {
      if (route.permission && !map[route.permission] && route.group !== 'developer' && route.group !== 'hidden') {
        map[route.permission] = route.icon;
      }
    }
    return map;
  }, []);

  const visiblePermissions = useMemo(
    () =>
      allPermissions.filter((permission) => {
        const requiredFeature = PERMISSION_REQUIRED_FEATURES[permission];
        return !requiredFeature || hasFeature(requiredFeature);
      }),
    [allPermissions, hasFeature],
  );

  const permissionGroups = useMemo(
    () =>
      PERMISSION_GROUPS.map(({ section, permissions }) => ({
        section,
        permissions: permissions.filter((p) => visiblePermissions.includes(p)),
      })).filter((g) => g.permissions.length > 0),
    [visiblePermissions],
  );

  if (loading) {
    return (
      <div>
        <SectionHeader eyebrow={t('nav.permissions')} title={t('permissions.title')} description={t('permissions.description')} />
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, cardIndex) => (
            <div key={cardIndex} className="panel-strong space-y-4 p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="h-5 w-32 animate-pulse rounded-full bg-slate-200" />
                <div className="h-9 w-20 animate-pulse rounded-lg bg-slate-100" />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {Array.from({ length: 8 }).map((__, itemIndex) => (
                  <div key={itemIndex} className="h-10 animate-pulse rounded-lg border border-slate-200 bg-slate-100" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow={t('nav.permissions')} title={t('permissions.title')} description={t('permissions.description')} />

      {error ? <Alert type="error">{error}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {rolePermissions.map((entry) => (
          <div key={entry.role} className="panel-strong space-y-4 p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="section-title">{t(`permissions.roles.${entry.role}`)}</h2>
              <button type="button" className="btn-primary h-9 px-3" onClick={() => handleSave(entry.role)} disabled={savingRole === entry.role}>
                {savingRole === entry.role ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {t('common.save')}
              </button>
            </div>

            <div className="space-y-4">
              {permissionGroups.map(({ section, permissions }) => (
                <div key={section}>
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-400">{t(`navGroups.${section}`)}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {permissions.map((permission) => {
                      const Icon = iconByPermission[permission];
                      return (
                        <label
                          key={permission}
                          className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 shrink-0 rounded border-slate-300"
                            checked={entry.permissions.includes(permission)}
                            onChange={() => togglePermission(entry.role, permission)}
                          />
                          {Icon ? <Icon size={14} className="shrink-0 text-slate-400" /> : null}
                          {t(`permissions.items.${permission}`)}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
