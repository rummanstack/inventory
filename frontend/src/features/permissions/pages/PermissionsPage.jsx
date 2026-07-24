import { useEffect, useMemo, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { Alert, Select, SectionHeader } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { useMutation } from '@tanstack/react-query';
import { useTenantApiQuery } from '../../../queries/useTenantApiQuery.js';
import { APP_ROUTES } from '../../../app/routes.js';
import { PERMISSION_PRESETS } from '../permissionPresets.js';

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
    section: 'installment-sales',
    permissions: [
      'view_installment_plans',
      'manage_installment_plans',
      'collect_installment_payment',
      'reschedule_installment_plan',
      'cancel_installment_plan',
      'write_off_installment_plan',
      'override_installment_credit_limit',
      'manage_installment_credit_settings',
    ],
  },
  {
    section: 'inventory',
    permissions: ['view_products', 'manage_products', 'view_product_serials', 'manage_product_serials', 'view_expiry_alerts'],
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
    section: 'trade-promotions',
    permissions: [
      'view_trade_promotions',
      'manage_trade_promotion_rules',
      'manage_trade_promotion_settlements',
    ],
  },
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
      'journal.override',
      'fiscal_year.close',
      'fiscal_year.reopen',
      'period.lock',
      'period.unlock',
      'closing.execute',
      'opening_balance.generate',
      'accounting.admin',
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
  { section: 'hr', permissions: ['view_employees', 'manage_employees', 'manage_departments', 'manage_designations', 'attendance.view', 'attendance.manage', 'manage_payroll', 'leave.manage', 'leave.approve', 'payroll.view', 'payroll.generate', 'payroll.approve', 'advance.manage', 'loan.manage', 'hr.reports'] },
  { section: 'system', permissions: ['view_help_desk', 'manage_help_desk', 'manage_users', 'manage_org', 'permanent_delete', 'manage_backups'] },
];

const GROUPED_PERMISSIONS = new Set(PERMISSION_GROUPS.flatMap(({ permissions }) => permissions));

function sanitizePermissions(permissions, allowedPermissions) {
  const allowed = allowedPermissions instanceof Set ? allowedPermissions : new Set(allowedPermissions || []);
  return [...new Set((Array.isArray(permissions) ? permissions : []).filter((permission) => allowed.has(permission)))];
}

function normalizeDependencyMap(rawDependencies, allowedPermissions) {
  const allowed = new Set(allowedPermissions || []);
  if (!rawDependencies || typeof rawDependencies !== 'object' || Array.isArray(rawDependencies)) return {};

  return Object.fromEntries(
    Object.entries(rawDependencies)
      .filter(([permission]) => allowed.has(permission))
      .map(([permission, dependencies]) => [
        permission,
        [...new Set((Array.isArray(dependencies) ? dependencies : [dependencies]).filter((dependency) => allowed.has(dependency)))],
      ]),
  );
}

function addPermissionWithDependencies(permissions, permission, dependencyMap, allowedPermissions) {
  const next = new Set(sanitizePermissions(permissions, allowedPermissions));
  const visiting = new Set();

  function add(candidate) {
    if (!allowedPermissions.has(candidate) || visiting.has(candidate)) return;
    visiting.add(candidate);
    for (const dependency of dependencyMap[candidate] || []) add(dependency);
    next.add(candidate);
    visiting.delete(candidate);
  }

  add(permission);
  return [...next];
}

function removePermissionWithDependents(permissions, permission, dependencyMap, allowedPermissions) {
  const next = new Set(sanitizePermissions(permissions, allowedPermissions));
  next.delete(permission);

  let changed = true;
  while (changed) {
    changed = false;
    for (const grantedPermission of [...next]) {
      const hasMissingDependency = (dependencyMap[grantedPermission] || []).some((dependency) => !next.has(dependency));
      if (hasMissingDependency) {
        next.delete(grantedPermission);
        changed = true;
      }
    }
  }

  return [...next];
}

function arePermissionListsEqual(left, right) {
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return sortedLeft.length === sortedRight.length && sortedLeft.every((value, index) => value === sortedRight[index]);
}

export default function PermissionsPage() {
  const { t, pushToast, hasFeature, user, tenantOptions } = useInventoryApp();
  // system_developer has no tenant of its own and must pick one before any
  // permissions can load; super_admin is always implicitly scoped to their
  // own tenant on the backend, so no picker is needed for them.
  const needsTenantPicker = Boolean(user?.isPlatformUser);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [allPermissions, setAllPermissions] = useState([]);
  const [requiredFeatures, setRequiredFeatures] = useState({});
  const [permissionDependencies, setPermissionDependencies] = useState({});
  const [rolePermissions, setRolePermissions] = useState([]);
  const [originalPermissions, setOriginalPermissions] = useState({});
  const [savingRole, setSavingRole] = useState('');
  const permissionsQuery = useTenantApiQuery({
    scope: 'role-permissions',
    params: { selectedTenantId: needsTenantPicker ? selectedTenantId : undefined },
    queryFn: () => inventoryApi.getRolePermissions(needsTenantPicker ? selectedTenantId : undefined),
    enabled: !needsTenantPicker || Boolean(selectedTenantId),
    requireTenant: !needsTenantPicker,
  });
  const saveMutation = useMutation({
    mutationFn: ({ role, permissions }) =>
      inventoryApi.updateRolePermissions(role, permissions, needsTenantPicker ? selectedTenantId : undefined),
  });
  const loading = permissionsQuery.isLoading;
  const error = permissionsQuery.error?.message || '';

  useEffect(() => {
    if (needsTenantPicker && !selectedTenantId) {
      setRolePermissions([]);
      setAllPermissions([]);
      return;
    }

    const result = permissionsQuery.data;
    if (result) {
        const knownPermissions = [...new Set(result.allPermissions || [])];
        const knownPermissionSet = new Set(knownPermissions);
        const sanitizedRoles = (result.roles || []).map((entry) => ({
          ...entry,
          permissions: sanitizePermissions(entry.permissions, knownPermissionSet),
        }));

        setAllPermissions(knownPermissions);
        setRequiredFeatures(result.permissionRequiredFeatures || {});
        setPermissionDependencies(normalizeDependencyMap(result.permissionDependencies, knownPermissions));
        setRolePermissions(sanitizedRoles);
        setOriginalPermissions(
          Object.fromEntries(sanitizedRoles.map((entry) => [entry.role, [...entry.permissions].sort()])),
        );
    }
  }, [needsTenantPicker, selectedTenantId, permissionsQuery.data]);

  const knownPermissionSet = useMemo(() => new Set(allPermissions), [allPermissions]);

  const hasUnsavedChanges = useMemo(
    () => rolePermissions.some((entry) => !arePermissionListsEqual(entry.permissions, originalPermissions[entry.role] || [])),
    [originalPermissions, rolePermissions],
  );

  useEffect(() => {
    if (!hasUnsavedChanges) return undefined;

    function warnBeforeUnload(event) {
      event.preventDefault();
      event.returnValue = '';
    }

    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [hasUnsavedChanges]);

  function togglePermission(role, permission) {
    setRolePermissions((current) =>
      current.map((entry) => {
        if (entry.role !== role) return entry;
        const has = entry.permissions.includes(permission);
        return {
          ...entry,
          permissions: has
            ? removePermissionWithDependents(entry.permissions, permission, permissionDependencies, knownPermissionSet)
            : addPermissionWithDependencies(entry.permissions, permission, permissionDependencies, knownPermissionSet),
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
        let permissions = entry.permissions;
        for (const permission of groupPermissions) {
          permissions = allSelected
            ? removePermissionWithDependents(permissions, permission, permissionDependencies, knownPermissionSet)
            : addPermissionWithDependencies(permissions, permission, permissionDependencies, knownPermissionSet);
        }
        return { ...entry, permissions };
      }),
    );
  }

  async function handleSave(role) {
    const entry = rolePermissions.find((item) => item.role === role);
    if (!entry) return;

    let sanitizedPermissions = sanitizePermissions(entry.permissions, knownPermissionSet);
    for (const permission of [...sanitizedPermissions]) {
      sanitizedPermissions = addPermissionWithDependencies(
        sanitizedPermissions,
        permission,
        permissionDependencies,
        knownPermissionSet,
      );
    }

    const current = [...sanitizedPermissions].sort();
    const original = originalPermissions[role] || [];
    const unchanged = arePermissionListsEqual(current, original);
    if (unchanged) {
      pushToast('info', t(`permissions.roles.${role}`), t('alerts.noChanges'));
      return;
    }

    setSavingRole(role);
    try {
      const result = await saveMutation.mutateAsync({ role, permissions: sanitizedPermissions });
      const savedRole = (result.roles || []).find((item) => item.role === role);
      const savedPermissions = sanitizePermissions(savedRole?.permissions || sanitizedPermissions, knownPermissionSet);

      setRolePermissions((roles) => roles.map((item) => (
        item.role === role
          ? { ...item, ...(savedRole || {}), role, permissions: savedPermissions }
          : item
      )));
      setOriginalPermissions((permissions) => ({
        ...permissions,
        [role]: [...savedPermissions].sort(),
      }));
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
        const rawRequiredFeatures = requiredFeatures[permission];
        const permissionFeatures = (Array.isArray(rawRequiredFeatures) ? rawRequiredFeatures : [rawRequiredFeatures]).filter(Boolean);
        return permissionFeatures.length === 0 || permissionFeatures.some((feature) => hasFeature(feature));
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

  function resolvePresetPermissions(preset) {
    let permissions = [];
    for (const permission of preset.permissions) {
      if (!visiblePermissions.includes(permission)) continue;
      permissions = addPermissionWithDependencies(permissions, permission, permissionDependencies, knownPermissionSet);
    }
    return permissions;
  }

  // Replaces (not merges) a role's unsaved checkbox state with a preset's
  // permission list. Preset entries whose feature isn't enabled for this
  // tenant are dropped silently rather than left to fail validation on save.
  function applyPreset(role, presetId) {
    const preset = PERMISSION_PRESETS.find((entry) => entry.id === presetId);
    if (!preset) return;

    const permissions = resolvePresetPermissions(preset);

    setRolePermissions((current) =>
      current.map((entry) => (entry.role === role ? { ...entry, permissions } : entry)),
    );
    pushToast('info', t(`permissions.roles.${role}`), t('permissions.presetApplied'));
  }

  function handleTenantChange(event) {
    const nextTenantId = event.target.value;
    if (nextTenantId === selectedTenantId) return;
    if (hasUnsavedChanges && !window.confirm(t('permissions.unsavedTenantSwitch'))) return;
    setSelectedTenantId(nextTenantId);
  }

  const tenantPicker = needsTenantPicker ? (
    <label className="block max-w-xs">
      <span className="label">{t('permissions.selectTenant')}</span>
      <Select value={selectedTenantId} onChange={handleTenantChange} disabled={Boolean(savingRole)}>
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
        <SectionHeader title={t('permissions.title')} compact />
        {tenantPicker}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <SectionHeader title={t('permissions.title')} compact />
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
      <SectionHeader title={t('permissions.title')} compact />

      {tenantPicker}

      {error ? <Alert type="error">{error}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {rolePermissions.map((entry) => {
          const presetsForRole = PERMISSION_PRESETS.filter((preset) => preset.role === entry.role);
          const selectedPresetId = presetsForRole.find((preset) => (
            arePermissionListsEqual(entry.permissions, resolvePresetPermissions(preset))
          ))?.id || '';
          return (
          <div key={entry.role} className="panel-strong space-y-4 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="section-title">{t(`permissions.roles.${entry.role}`)}</h2>
              <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap">
                {presetsForRole.length > 0 ? (
                  <Select
                    className="h-9 w-full text-sm sm:w-64"
                    value={selectedPresetId}
                    onChange={(event) => applyPreset(entry.role, event.target.value)}
                    disabled={savingRole === entry.role}
                    aria-label={t('permissions.applyPreset')}
                  >
                    <option value="">{t('permissions.selectPresetPlaceholder')}</option>
                    {presetsForRole.map((preset) => (
                      <option key={preset.id} value={preset.id}>{t(preset.labelKey)}</option>
                    ))}
                  </Select>
                ) : null}
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
          );
        })}
      </div>
    </div>
  );
}
