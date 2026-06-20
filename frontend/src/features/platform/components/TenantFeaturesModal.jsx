import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Alert, Modal } from '../../../components/ui.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { TENANT_FEATURE_ROUTES } from '../../../app/tenantFeatures.js';

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
        if (!cancelled) {
          setSelected(result.features || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || t('organizations.featuresSaveFailed'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    loadFeatures();
    return () => {
      cancelled = true;
    };
  }, [tenant.id]);

  function toggleFeature(feature) {
    setSelected((current) =>
      current.includes(feature) ? current.filter((entry) => entry !== feature) : [...current, feature],
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
    <Modal title={t('organizations.featuresTitle')} description={tenant.name} onClose={onClose} width="max-w-xl">
      {loading ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="h-4 w-44 animate-pulse rounded-full bg-slate-200" />
            <div className="h-3 w-64 animate-pulse rounded-full bg-slate-100" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                <div className="h-4 w-4 animate-pulse rounded bg-slate-200" />
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
          <div className="grid gap-2 sm:grid-cols-2">
            {TENANT_FEATURE_ROUTES.map((route) => (
              <label
                key={route.feature}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={selected.includes(route.feature)}
                  onChange={() => toggleFeature(route.feature)}
                />
                {t(route.labelKey)}
              </label>
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
