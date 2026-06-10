import { useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Save } from 'lucide-react';
import { Alert, Badge, EmptyState, LoadingState, Modal, SectionHeader, cx } from '../../../components/ui.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';

function TenantEditModal({ tenant, onClose, onSave }) {
  const { t } = useInventoryApp();
  const [form, setForm] = useState({
    name: tenant.name || '',
    email: tenant.email || '',
    plan: tenant.plan || 'starter',
    address: tenant.address || '',
    logoUrl: tenant.logoUrl || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave(form);
    } catch (err) {
      setError(err?.message || t('organizations.updateFailed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={t('organizations.editTitle')} description={tenant.name} onClose={onClose} width="max-w-xl">
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <label className="block">
          <span className="label">{t('organizations.name')}</span>
          <input className="input" type="text" value={form.name} onChange={(e) => updateField('name', e.target.value)} required />
        </label>
        <label className="block">
          <span className="label">{t('organizations.email')}</span>
          <input className="input" type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} required />
        </label>
        <label className="block">
          <span className="label">{t('organizations.plan')}</span>
          <select className="input" value={form.plan} onChange={(e) => updateField('plan', e.target.value)}>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </label>
        <label className="block">
          <span className="label">{t('orgSettings.logoUrl')}</span>
          <input className="input" type="text" value={form.logoUrl} onChange={(e) => updateField('logoUrl', e.target.value)} placeholder="https://example.com/logo.png" />
          {form.logoUrl ? (
            <img src={form.logoUrl} alt="" className="mt-3 h-12 w-12 rounded-lg border border-slate-200 object-contain p-1" />
          ) : null}
        </label>
        <label className="block">
          <span className="label">{t('organizations.address')}</span>
          <textarea className="input min-h-[80px] resize-y" value={form.address} onChange={(e) => updateField('address', e.target.value)} />
        </label>
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
    </Modal>
  );
}

function TenantCreateModal({ onClose, onSave }) {
  const { t } = useInventoryApp();
  const [form, setForm] = useState({ name: '', slug: '', email: '', plan: 'starter' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setCreating(true);
    setError('');
    try {
      await onSave(form);
    } catch (err) {
      setError(err?.message || t('organizations.createFailed'));
    } finally {
      setCreating(false);
    }
  }

  return (
    <Modal title={t('organizations.createTitle')} onClose={onClose} width="max-w-xl">
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <label className="block">
          <span className="label">{t('organizations.name')}</span>
          <input className="input" type="text" value={form.name} onChange={(e) => updateField('name', e.target.value)} required />
        </label>
        <label className="block">
          <span className="label">{t('organizations.code')}</span>
          <input className="input font-mono" type="text" value={form.slug} onChange={(e) => updateField('slug', e.target.value.toLowerCase())} placeholder={t('organizations.codePlaceholder')} required />
        </label>
        <label className="block">
          <span className="label">{t('organizations.adminEmail')}</span>
          <input className="input" type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} required />
        </label>
        <label className="block">
          <span className="label">{t('organizations.plan')}</span>
          <select className="input" value={form.plan} onChange={(e) => updateField('plan', e.target.value)}>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={creating}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn-primary" disabled={creating}>
            {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {creating ? t('organizations.creating') : t('organizations.create')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function PlatformAdminPage() {
  const { t, pushToast } = useInventoryApp();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [togglingId, setTogglingId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);

  useEffect(() => {
    loadTenants();
  }, []);

  async function loadTenants() {
    setLoading(true);
    setError('');
    try {
      const result = await inventoryApi.listTenants();
      setTenants(result.tenants || []);
    } catch (err) {
      setError(err?.message || t('organizations.loadFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function toggleStatus(tenant) {
    const next = tenant.status === 'active' ? 'inactive' : 'active';
    setTogglingId(tenant.id);
    try {
      const result = await inventoryApi.setTenantStatus(tenant.id, next);
      setTenants((current) => current.map((t) => (t.id === tenant.id ? result.tenant : t)));
      pushToast('success', result.tenant.name, next === 'active' ? t('organizations.activate') : t('organizations.deactivate'));
    } catch (err) {
      const message = err?.message || t('organizations.statusFailed');
      setError(message);
      pushToast('error', t('alerts.updateFailed'), message);
    } finally {
      setTogglingId(null);
    }
  }

  async function handleEditTenant(fields) {
    const result = await inventoryApi.updateTenant(editingTenant.id, fields);
    setTenants((current) => current.map((t) => (t.id === editingTenant.id ? result.tenant : t)));
    setEditingTenant(null);
    pushToast('success', t('organizations.editTitle'), `${result.tenant.name} ${t('alerts.updated')}`);
  }

  async function handleCreate(fields) {
    const result = await inventoryApi.createTenant(fields);
    setTenants((current) => [...current, result.tenant]);
    setShowCreate(false);
    pushToast('success', t('organizations.createTitle'), `${result.tenant.name} ${t('alerts.created')}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <SectionHeader eyebrow={t('nav.platform')} title={t('nav.platform')} description={t('organizations.description')} />
        <button type="button" className="btn-primary shrink-0" onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          {t('organizations.newOrganization')}
        </button>
      </div>

      {error ? <Alert type="error">{error}</Alert> : null}

      {loading ? (
        <LoadingState />
      ) : tenants.length === 0 ? (
        <EmptyState title={t('organizations.emptyTitle')} description={t('organizations.emptyDescription')} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">{t('organizations.table.organization')}</th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">{t('organizations.table.code')}</th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">{t('organizations.table.plan')}</th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">{t('organizations.table.status')}</th>
                <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wider text-slate-500">{t('organizations.table.edit')}</th>
                <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wider text-slate-500">{t('organizations.table.toggle')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-950">{tenant.name}</p>
                    <p className="text-xs text-slate-500">{tenant.email}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-700">{tenant.slug}</td>
                  <td className="px-4 py-3">
                    <Badge tone="blue">{tenant.plan}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={tenant.status === 'active' ? 'emerald' : 'rose'}>{tenant.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" className="icon-btn" title={t('common.edit')} onClick={() => setEditingTenant(tenant)}>
                      <Pencil size={16} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={tenant.status === 'active'}
                      title={tenant.status === 'active' ? t('organizations.deactivate') : t('organizations.activate')}
                      disabled={togglingId === tenant.id}
                      onClick={() => toggleStatus(tenant)}
                      className={cx(
                        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60',
                        tenant.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300',
                      )}
                    >
                      <span
                        className={cx(
                          'inline-flex h-4 w-4 items-center justify-center rounded-full bg-white shadow transition-transform',
                          tenant.status === 'active' ? 'translate-x-6' : 'translate-x-1',
                        )}
                      >
                        {togglingId === tenant.id ? <Loader2 size={12} className="animate-spin text-slate-400" /> : null}
                      </span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingTenant ? (
        <TenantEditModal
          tenant={editingTenant}
          onClose={() => setEditingTenant(null)}
          onSave={handleEditTenant}
        />
      ) : null}

      {showCreate ? (
        <TenantCreateModal onClose={() => setShowCreate(false)} onSave={handleCreate} />
      ) : null}
    </div>
  );
}
