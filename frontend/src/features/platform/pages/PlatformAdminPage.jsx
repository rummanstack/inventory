import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Alert, EmptyState, SectionHeader, TableSkeleton } from '../../../components/ui.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import TenantsTable from '../components/TenantsTable.jsx';
import TenantEditModal from '../components/TenantEditModal.jsx';
import TenantCreateModal from '../components/TenantCreateModal.jsx';
import TenantFeaturesModal from '../components/TenantFeaturesModal.jsx';
import { useMutation } from '@tanstack/react-query';
import { useTenantApiQuery } from '../../../queries/useTenantApiQuery.js';

export default function PlatformAdminPage() {
  const { t, pushToast } = useInventoryApp();
  const [showCreate, setShowCreate] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [featuresTenant, setFeaturesTenant] = useState(null);

  const tenantsQuery = useTenantApiQuery({
    scope: 'platform-tenants',
    queryFn: () => inventoryApi.listTenants(),
    requireTenant: false,
  });
  const tenantMutation = useMutation({
    mutationFn: ({ action, id, payload }) => {
      if (action === 'status') return inventoryApi.setTenantStatus(id, payload);
      if (action === 'update') return inventoryApi.updateTenant(id, payload);
      if (action === 'features') return inventoryApi.updateTenantFeatures(id, payload);
      return inventoryApi.createTenant(payload);
    },
  });
  const tenants = tenantsQuery.data?.tenants || [];
  const loading = tenantsQuery.isLoading;
  const error = tenantsQuery.error?.message || '';
  const togglingId = tenantMutation.isPending && tenantMutation.variables?.action === 'status'
    ? tenantMutation.variables.id
    : null;

  async function toggleStatus(tenant) {
    const next = tenant.status === 'active' ? 'inactive' : 'active';
    try {
      const result = await tenantMutation.mutateAsync({ action: 'status', id: tenant.id, payload: next });
      await tenantsQuery.refetch();
      pushToast('success', result.tenant.name, next === 'active' ? t('organizations.activate') : t('organizations.deactivate'));
    } catch (err) {
      const message = err?.message || t('organizations.statusFailed');
      pushToast('error', t('alerts.updateFailed'), message);
    }
  }

  async function handleEditTenant(fields) {
    const result = await tenantMutation.mutateAsync({ action: 'update', id: editingTenant.id, payload: fields });
    await tenantsQuery.refetch();
    setEditingTenant(null);
    pushToast('success', t('organizations.editTitle'), `${result.tenant.name} ${t('alerts.updated')}`);
  }

  async function handleSaveFeatures(features) {
    await tenantMutation.mutateAsync({ action: 'features', id: featuresTenant.id, payload: features });
    await tenantsQuery.refetch();
    setFeaturesTenant(null);
    pushToast('success', t('organizations.featuresTitle'), t('organizations.featuresUpdated'));
  }

  async function handleCreate(fields) {
    const result = await tenantMutation.mutateAsync({ action: 'create', payload: fields });
    await tenantsQuery.refetch();
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
