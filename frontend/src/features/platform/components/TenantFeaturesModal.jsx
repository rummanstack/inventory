import { useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { Alert, Modal } from '../../../components/ui.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { APP_ROUTES, SIDEBAR_SECTIONS } from '../../../app/routes.js';

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

  // Build { labelKey, icon } per feature directly from APP_ROUTES.
  // First matching non-developer, non-hidden route per feature wins.
  const featureMeta = useMemo(() => {
    const meta = {};
    for (const route of APP_ROUTES) {
      if (route.feature && !meta[route.feature] && route.group !== 'developer' && route.group !== 'hidden') {
        meta[route.feature] = { labelKey: route.labelKey, icon: route.icon };
      }
    }
    return meta;
  }, []);

  // Mirror the sidebar: same section order (minus developer), same feature order within each section.
  // Features that appear in multiple sections are shown only on their first occurrence.
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

  function toggleFeature(feature) {
    setSelected((cur) =>
      cur.includes(feature) ? cur.filter((f) => f !== feature) : [...cur, feature],
    );
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
    <Modal title={t('organizations.featuresTitle')} description={tenant.name} onClose={onClose} width="max-w-2xl">
      {loading ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="h-4 w-44 animate-pulse rounded-full bg-slate-200" />
            <div className="h-3 w-64 animate-pulse rounded-full bg-slate-100" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                <div className="h-4 w-4 animate-pulse rounded bg-slate-200" />
                <div className="h-4 w-4 animate-pulse rounded bg-slate-100" />
                <div className="h-3.5 flex-1 animate-pulse rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <div className="h-10 w-24 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-10 w-24 animate-pulse rounded-2xl bg-slate-200" />
          </div>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          {error ? <Alert type="error">{error}</Alert> : null}
          <p className="text-sm text-slate-500">{t('organizations.featuresDescription')}</p>

          <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-1">
            {featureGroups.map(({ section, features }) => (
              <div key={section}>
                <p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                  {t(`navGroups.${section}`)}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {features.map((feature) => {
                    const meta = featureMeta[feature];
                    const Icon = meta?.icon;
                    return (
                      <label
                        key={feature}
                        className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 shrink-0 rounded border-slate-300"
                          checked={selected.includes(feature)}
                          onChange={() => toggleFeature(feature)}
                        />
                        {Icon ? <Icon size={14} className="shrink-0 text-slate-400" /> : null}
                        {t(meta?.labelKey || feature)}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              <Save size={18} />
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
