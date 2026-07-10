import { useEffect, useMemo, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { Alert, Select, SectionHeader } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { APP_ROUTES } from '../../../app/routes.js';

// Mirrors the sidebar structure so the permission matrix reads like the app.
// (Just grouping/labels for display — the permission-to-feature ceiling map
// itself comes from the API now, not a second hardcoded copy here.)
const PERMISSION_GROUPS = [
  { section: 'overview', permissions: ['view_state'] },
  {
    section: 'pos',
    permissions: [
      'manage_retail_quick_sale',
      'view_retail_sales_invoices',
      'manage_retail_sales_invoices',
      'view_retail_sales_returns',
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
      'view_retail_customers',
      'manage_retail_customers_write',
      'view_retail_customer_retention',
      'view_retail_customer_due',
      'manage_retail_customer_due',
      'view_retail_due_collection',
      'manage_retail_due_collection',
    ],
  },
  {
    section: 'inventory',
    permissions: ['view_products', 'manage_products', 'view_product_serials', 'manage_product_serials', 'view_expiry_alerts'],
  },
  {
    section: 'purchases',
    permissions: [
      'view_suppliers',
      'manage_suppliers',
      'view_purchases',
      'manage_purchases',
      'view_supplier_payments',
      'manage_supplier_payments',
      'view_supplier_statement',
      'view_purchase_returns',
      'manage_purchase_returns',
    ],
  },
  {
    section: 'dsr',
    permissions: [
      'view_dsrs',
      'manage_dsrs',
      'create_issues',
      'update_issues',
      'create_settlements',
      'update_settlements',
      'manage_dsr_finance',
    ],
  },
  { section: 'shops', permissions: ['view_customers', 'manage_customers', 'view_srs', 'manage_srs'] },
  {
    section: 'warranty',
    permissions: ['view_warranty_claims', 'manage_warranty_claims', 'view_repair_jobs', 'manage_repair_jobs'],
  },
  {
    section: 'finance',
    permissions: ['view_finance_dashboard', 'manage_finance_accounts', 'manage_expenses', 'manage_profit_report'],
  },
  {
    section: 'accounting',
    permissions: [
      'view_chart_of_accounts',
      'manage_chart_of_accounts',
      'view_accounting_dashboard',
      'manage_accounting_settings',
      'manage_fiscal_years',
      'manage_accounting_periods',
      'view_opening_balances',
      'manage_opening_balances',
      'voucher.view',
      'journal.create',
      'journal.edit',
      'journal.approve',
      'journal.post',
      'journal.reverse',
      'voucher.receipt',
      'voucher.payment',
      'voucher.contra',
      'view_general_ledger',
      'view_trial_balance',
      'view_balance_sheet',
      'view_profit_and_loss',
      'report.trial_balance',
      'report.general_ledger',
      'report.account_ledger',
      'report.customer_ledger',
      'report.supplier_ledger',
      'report.cash_book',
      'report.bank_book',
      'report.balance_sheet',
      'report.profit_loss',
      'report.cash_flow',
    ],
  },
  { section: 'reports', permissions: ['view_activity_logs', 'manage_batch_tracking'] },
  { section: 'hr', permissions: ['view_employees', 'manage_employees', 'attendance.view', 'attendance.manage', 'manage_payroll', 'leave.manage', 'leave.approve', 'payroll.view', 'payroll.generate', 'payroll.approve', 'advance.manage', 'loan.manage', 'hr.reports'] },
  { section: 'system', permissions: ['manage_users', 'manage_org', 'permanent_delete', 'manage_backups'] },
];

const GROUPED_PERMISSIONS = new Set(PERMISSION_GROUPS.flatMap(({ permissions }) => permissions));

export default function PermissionsPage() {
  const { t, pushToast, hasFeature, user, tenantOptions } = useInventoryApp();
  // system_developer has no tenant of its own and must pick one before any
  // permissions can load; super_admin is always implicitly scoped to their
  // own tenant on the backend, so no picker is needed for them.
  const needsTenantPicker = Boolean(user?.isPlatformUser);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [loading, setLoading] = useState(!needsTenantPicker);
  const [error, setError] = useState('');
  const [allPermissions, setAllPermissions] = useState([]);
  const [requiredFeatures, setRequiredFeatures] = useState({});
  const [rolePermissions, setRolePermissions] = useState([]);
  const [originalPermissions, setOriginalPermissions] = useState({});
  const [savingRole, setSavingRole] = useState('');

  useEffect(() => {
    if (needsTenantPicker && !selectedTenantId) {
      setRolePermissions([]);
      setAllPermissions([]);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError('');
        const result = await inventoryApi.getRolePermissions(needsTenantPicker ? selectedTenantId : undefined);
        if (cancelled) return;
        setAllPermissions(result.allPermissions || []);
        setRequiredFeatures(result.permissionRequiredFeatures || {});
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
    return () => {
      cancelled = true;
    };
  }, [needsTenantPicker, selectedTenantId]);

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

  // Selects every permission in the group if any are still unchecked, otherwise
  // clears the whole group — same "select all / clear all" convention as a
  // table header checkbox.
  function toggleGroupPermissions(role, groupPermissions) {
    setRolePermissions((current) =>
      current.map((entry) => {
        if (entry.role !== role) return entry;
        const allSelected = groupPermissions.every((permission) => entry.permissions.includes(permission));
        const permissions = allSelected
          ? entry.permissions.filter((permission) => !groupPermissions.includes(permission))
          : [...new Set([...entry.permissions, ...groupPermissions])];
        return { ...entry, permissions };
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
      const result = await inventoryApi.updateRolePermissions(role, entry.permissions, needsTenantPicker ? selectedTenantId : undefined);
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
        const requiredFeature = requiredFeatures[permission];
        return !requiredFeature || hasFeature(requiredFeature);
      }),
    [allPermissions, requiredFeatures, hasFeature],
  );

  const permissionGroups = useMemo(() => {
    const groups = PERMISSION_GROUPS.map(({ section, permissions }) => ({
      section,
      permissions: permissions.filter((permission) => visiblePermissions.includes(permission)),
    })).filter((group) => group.permissions.length > 0);

    const ungrouped = visiblePermissions.filter((permission) => !GROUPED_PERMISSIONS.has(permission));
    if (ungrouped.length > 0) {
      groups.push({ section: 'misc', permissions: ungrouped });
    }

    return groups;
  }, [visiblePermissions]);

  const tenantPicker = needsTenantPicker ? (
    <label className="block max-w-xs">
      <span className="label">{t('permissions.selectTenant')}</span>
      <Select value={selectedTenantId} onChange={(event) => setSelectedTenantId(event.target.value)}>
        <option value="">{t('permissions.selectTenantPlaceholder')}</option>
        {(tenantOptions || []).map((option) => (
          <option key={option.id} value={option.id}>{option.name}</option>
        ))}
      </Select>
    </label>
  ) : null;

  if (needsTenantPicker && !selectedTenantId) {
    return (
      <div className="space-y-6">
        <SectionHeader eyebrow={t('nav.permissions')} title={t('permissions.title')} description={t('permissions.description')} />
        {tenantPicker}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <SectionHeader eyebrow={t('nav.permissions')} title={t('permissions.title')} description={t('permissions.description')} />
        {tenantPicker}
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

      {tenantPicker}

      {error ? <Alert type="error">{error}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {rolePermissions.map((entry) => (
          <div key={entry.role} className="panel-strong space-y-4 p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="section-title">{t(`permissions.roles.${entry.role}`)}</h2>
              <button
                type="button"
                className="btn-primary h-9 px-3"
                onClick={() => handleSave(entry.role)}
                disabled={savingRole === entry.role}
              >
                {savingRole === entry.role ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {t('common.save')}
              </button>
            </div>

            <div className="space-y-4">
              {permissionGroups.map(({ section, permissions }) => {
                const allSelected = permissions.every((permission) => entry.permissions.includes(permission));
                const someSelected = !allSelected && permissions.some((permission) => entry.permissions.includes(permission));
                return (
                <div key={section}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{t(`navGroups.${section}`)}</p>
                    <label className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-brand hover:text-brand-strong">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 shrink-0 rounded border-slate-300"
                        checked={allSelected}
                        ref={(node) => {
                          if (node) node.indeterminate = someSelected;
                        }}
                        onChange={() => toggleGroupPermissions(entry.role, permissions)}
                      />
                      {allSelected ? t('common.clearAll') : t('common.selectAll')}
                    </label>
                  </div>
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
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


