import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Alert, EmptyState, SectionHeader, TableSkeleton } from '../../../components/ui.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import TenantsTable from '../components/TenantsTable.jsx';
import TenantEditModal from '../components/TenantEditModal.jsx';
import TenantCreateModal from '../components/TenantCreateModal.jsx';
import TenantFeaturesModal from '../components/TenantFeaturesModal.jsx';

export default function PlatformAdminPage() {
  const { t, pushToast } = useInventoryApp();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [togglingId, setTogglingId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [featuresTenant, setFeaturesTenant] = useState(null);

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
      setTenants((current) => current.map((entry) => (entry.id === tenant.id ? result.tenant : entry)));
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
    setTenants((current) => current.map((entry) => (entry.id === editingTenant.id ? result.tenant : entry)));
    setEditingTenant(null);
    pushToast('success', t('organizations.editTitle'), `${result.tenant.name} ${t('alerts.updated')}`);
  }

  async function handleSaveFeatures(features) {
    await inventoryApi.updateTenantFeatures(featuresTenant.id, features);
    setFeaturesTenant(null);
    pushToast('success', t('organizations.featuresTitle'), t('organizations.featuresUpdated'));
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
        <TableSkeleton rows={6} columns={7} />
      ) : tenants.length === 0 ? (
        <EmptyState title={t('organizations.emptyTitle')} description={t('organizations.emptyDescription')} />
      ) : (
        <TenantsTable
          tenants={tenants}
          togglingId={togglingId}
          t={t}
          onEdit={setEditingTenant}
          onFeatures={setFeaturesTenant}
          onToggleStatus={toggleStatus}
        />
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

      {featuresTenant ? (
        <TenantFeaturesModal
          tenant={featuresTenant}
          onClose={() => setFeaturesTenant(null)}
          onSave={handleSaveFeatures}
        />
      ) : null}
    </div>
  );
}
