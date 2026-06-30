import { useEffect, useMemo, useState } from 'react';
import { CheckSquare, Save, Square } from 'lucide-react';
import { Alert, Modal } from '../../../components/ui.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { APP_ROUTES, SIDEBAR_SECTIONS } from '../../../app/routes.js';

// One-line description of what each feature enables for the tenant.
const FEATURE_DESCRIPTIONS = {
  // Overview
  dashboard: 'Real-time overview of sales, stock, dues, and profit across all channels.',

  // Point of Sale
  'retailer-quick-sale': 'Fast POS terminal for walk-in customers with barcode lookup and receipt printing.',
  'retailer-cash-sessions': 'Open and close daily cash drawers with reconciliation and variance tracking.',
  'retailer-sales-invoices': 'Create full retail and wholesale invoices with tax, discounts, and customer linkage.',
  'retailer-sales-return': 'Process product returns, adjust stock, and handle refunds or due credits.',
  quotations: 'Create price quotes, track status, and convert approved quotes to invoices.',
  'retailer-promotions': 'Configure date-bounded discount promotions by product or category.',
  'trade-ins': 'Accept customer trade-in items and record exchange transactions.',

  // Customers
  'retail-customers': 'Register and manage retail customers with loyalty point balances and due tracking.',
  'retail-customer-retention': 'Analytics on customer repeat purchase frequency and lifetime value.',
  'retailer-customer-due': 'View and manage credit balances owed by retail customers.',
  'retailer-due-collection': 'Record cash payments collected from retail customers against their dues.',

  // Inventory
  products: 'Full product catalogue with pricing, stock levels, categories, barcodes, and variants.',
  'stock-movement': 'Immutable ledger of every stock in/out movement with reference and audit trail.',
  'low-stock-alerts': 'Automatic alerts when products fall below their configured reorder level.',
  'product-serials': 'Track individual unit serial and IMEI numbers through their full lifecycle.',
  'damaged-stock': 'Record and manage damaged inventory separately from sellable stock.',

  // DSR Distribution
  dsrs: 'Manage delivery sales reps with area assignments and due balance tracking.',
  'morning-issue': 'Issue stock from warehouse to DSRs each morning for daily distribution.',
  settlements: 'Evening reconciliation of DSR sales, returns, damage, and cash collection.',
  'dsr-finance': 'Track DSR cash advances and outstanding due balances with payment history.',

  // Shops & SRs
  customers: 'Manage wholesale shop and dealer customer directory with DSR assignments.',
  'shop-due-ledger': 'Full credit ledger per shop tracking all sales, payments, and adjustments.',
  srs: 'Manage in-shop sales representatives with location and commission tracking.',
  'sr-due-ledger': 'Track commission and payment ledger per sales representative.',

  // Purchases
  suppliers: 'Supplier directory with contact details and outstanding due balance tracking.',
  'purchase-receive': 'Record goods received from suppliers, update stock, and log supplier dues.',
  'supplier-payments': 'Record and track payments made to suppliers against outstanding invoices.',
  'supplier-discounts': 'Track volume rebates and promotional discounts received from suppliers.',
  'supplier-statement': 'Full transaction statement per supplier with running balance and export.',

  // Warranty & Repair
  'warranty-claims': 'Log and track product warranty issues through to supplier resolution.',
  'repair-jobs': 'Manage service repair workflow with technician assignment and cost tracking.',

  // Finance
  'finance-dashboard': 'Overview of cash positions, receivables, payables, and net balance.',
  'finance-accounts': 'Manage cash and bank accounts with deposits, withdrawals, and transfers.',
  expenses: 'Record daily operating expenses by category for P&L calculation.',
  profit: 'Profit and loss report based on sales cost snapshots minus expenses.',

  // Reports
  'retailer-daily-sales-report': 'Daily retail POS summary with invoice count, revenue, and session data.',
  reports: 'DSR daily route summary with per-rep settlement sheets, charts, and print.',
  'purchase-report': 'Purchase history report filterable by supplier and date range.',
  'stock-movement-report': 'Filtered stock in/out movement report by product, type, or date.',
  'settlement-report': 'Aggregated DSR settlement data for a selected date range.',
  'supplier-payment-report': 'Supplier payment history by date and payment method.',
  'sales-return-report': 'Retail returns report by reason, condition, and refund method.',
  'customer-due-report': 'Retail customer due balances with aging buckets.',
  'cash-session-report': 'Retail cash session audit with open/close times and variance.',
  'damaged-stock-report': 'Damaged stock register with value impact by reason and date.',
  'batch-tracking': 'Pharmacy batch/lot tracking for sales by manufacturer and expiry date.',
  history: 'Combined chronological log of all morning issues and evening settlements.',
  'activity-logs': 'Full audit trail of all user actions with before/after data snapshots.',

  // HR & Payroll
  employees: 'Employee directory with department, designation, and salary structure.',
  'salary-payments': 'Record and track monthly salary payments to employees.',

  // System & Settings
  'user-management': 'Manage tenant user accounts, roles, and active/inactive status.',
  permissions: 'Customize role-based permissions per role for this specific tenant.',
  'org-settings': 'Organization name, logo, default tax rate, and loyalty program configuration.',
  security: 'Account security settings, login history, and active session management.',
  'issue-center': 'Monitor application errors and issues reported by users.',
  trash: 'View and restore soft-deleted records across all entity types.',
  'database-backup': 'Trigger and download database backups for disaster recovery.',
  'help-desk': 'Internal support ticket system for staff issue management.',
};

export default function TenantFeaturesModal({ tenant, onClose, onSave }) {
  const { t } = useInventoryApp();
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadFeatures() {
      setLoading(true);
      setError('');
      try {
        const result = await inventoryApi.getTenantFeatures(tenant.id);
        if (!cancelled) setSelected(result.features || []);
      } catch (err) {
        if (!cancelled) setError(err?.message || t('organizations.featuresSaveFailed'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadFeatures();
    return () => { cancelled = true; };
  }, [tenant.id]);

  const featureMeta = useMemo(() => {
    const meta = {};
    for (const route of APP_ROUTES) {
      if (route.feature && !meta[route.feature] && route.group !== 'developer' && route.group !== 'hidden') {
        meta[route.feature] = { labelKey: route.labelKey, icon: route.icon };
      }
    }
    return meta;
  }, []);

  const featureGroups = useMemo(() => {
    const seen = new Set();
    return SIDEBAR_SECTIONS.filter((s) => s !== 'developer').map((section) => {
      const features = [];
      for (const route of APP_ROUTES) {
        if (route.group !== section || !route.feature || !featureMeta[route.feature]) continue;
        if (seen.has(route.feature)) continue;
        seen.add(route.feature);
        features.push(route.feature);
      }
      return { section, features };
    }).filter((g) => g.features.length > 0);
  }, [featureMeta]);

  const totalEnabled = selected.length;
  const totalFeatures = Object.keys(featureMeta).length;

  function toggleFeature(feature) {
    setSelected((cur) =>
      cur.includes(feature) ? cur.filter((f) => f !== feature) : [...cur, feature],
    );
  }

  function toggleSection(features, allEnabled) {
    if (allEnabled) {
      setSelected((cur) => cur.filter((f) => !features.includes(f)));
    } else {
      setSelected((cur) => [...new Set([...cur, ...features])]);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave(selected);
    } catch (err) {
      setError(err?.message || t('organizations.featuresSaveFailed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={t('organizations.featuresTitle')} description={tenant.name} onClose={onClose} width="max-w-3xl">
      {loading ? (
        <div className="space-y-5">
          {Array.from({ length: 3 }).map((_, gi) => (
            <div key={gi}>
              <div className="mb-3 h-3.5 w-32 animate-pulse rounded-full bg-slate-200" />
              <div className="grid gap-2 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-xl border border-slate-100 p-3">
                    <div className="mt-0.5 h-4 w-4 animate-pulse rounded bg-slate-200" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-28 animate-pulse rounded-full bg-slate-200" />
                      <div className="h-3 w-44 animate-pulse rounded-full bg-slate-100" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit}>
          {error ? <Alert type="error">{error}</Alert> : null}

          {/* Summary bar */}
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5">
            <p className="text-sm text-slate-500">{t('organizations.featuresDescription')}</p>
            <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-200">
              {totalEnabled} / {totalFeatures} {t('organizations.featuresEnabled') || 'enabled'}
            </span>
          </div>

          <div className="max-h-[62vh] space-y-6 overflow-y-auto pr-1">
            {featureGroups.map(({ section, features }) => {
              const enabledInSection = features.filter((f) => selected.includes(f)).length;
              const allEnabled = enabledInSection === features.length;
              const someEnabled = enabledInSection > 0 && !allEnabled;

              return (
                <div key={section}>
                  {/* Section header */}
                  <div className="mb-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                        {t(`navGroups.${section}`)}
                      </p>
                      {enabledInSection > 0 && (
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-600">
                          {enabledInSection}/{features.length}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleSection(features, allEnabled)}
                      className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                    >
                      {allEnabled ? (
                        <><CheckSquare size={13} className="text-indigo-500" /> Deselect all</>
                      ) : someEnabled ? (
                        <><Square size={13} className="text-slate-400" /> Select all</>
                      ) : (
                        <><Square size={13} className="text-slate-300" /> Select all</>
                      )}
                    </button>
                  </div>

                  {/* Feature cards */}
                  <div className="grid gap-2 sm:grid-cols-2">
                    {features.map((feature) => {
                      const meta = featureMeta[feature];
                      const Icon = meta?.icon;
                      const isOn = selected.includes(feature);
                      const description = FEATURE_DESCRIPTIONS[feature];

                      return (
                        <label
                          key={feature}
                          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                            isOn
                              ? 'border-indigo-200 bg-indigo-50/60'
                              : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-indigo-600"
                            checked={isOn}
                            onChange={() => toggleFeature(feature)}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              {Icon ? <Icon size={13} className={isOn ? 'text-indigo-500' : 'text-slate-400'} /> : null}
                              <span className={`text-sm font-semibold leading-tight ${isOn ? 'text-indigo-800' : 'text-slate-700'}`}>
                                {t(meta?.labelKey || feature)}
                              </span>
                            </div>
                            {description ? (
                              <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{description}</p>
                            ) : null}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-400">
              {totalEnabled} module{totalEnabled !== 1 ? 's' : ''} enabled for <span className="font-semibold text-slate-600">{tenant.name}</span>
            </p>
            <div className="flex items-center gap-2">
              <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                <Save size={18} />
                {saving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}
