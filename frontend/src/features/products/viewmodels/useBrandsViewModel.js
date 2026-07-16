import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi';
import { fetchBrands, productKeys } from '../queries/productQueries.js';

export function useBrandsViewModel() {
  const { t, pushToast, tenant, user } = useInventoryApp();
  const queryClient = useQueryClient();
  const tenantId = tenant?.id || user?.tenantId || '';
  const brandsQuery = useQuery({
    queryKey: productKeys.brands(tenantId),
    queryFn: fetchBrands,
    enabled: Boolean(tenantId),
    staleTime: 5 * 60_000,
  });
  const brandMutation = useMutation({
    mutationFn: ({ action, brandId, name }) => {
      if (action === 'create') return inventoryApi.createBrand({ name });
      if (action === 'rename') return inventoryApi.updateBrand(brandId, { name });
      return inventoryApi.deleteBrand(brandId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productKeys.brands(tenantId) }),
  });

  async function createBrand(name) {
    try {
      await brandMutation.mutateAsync({ action: 'create', name });
      pushToast('success', t('brands.title'), t('alerts.created'));
      return { ok: true };
    } catch (requestError) {
      const message = requestError.message || t('brands.saveFailed');
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function renameBrand(brandId, name) {
    try {
      await brandMutation.mutateAsync({ action: 'rename', brandId, name });
      pushToast('success', t('brands.title'), t('alerts.updated'));
      return { ok: true };
    } catch (requestError) {
      const message = requestError.message || t('brands.saveFailed');
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function deleteBrand(brandId) {
    try {
      await brandMutation.mutateAsync({ action: 'delete', brandId });
      pushToast('success', t('common.delete'), t('alerts.deleted'));
      return { ok: true };
    } catch (requestError) {
      const message = requestError.message || t('brands.deleteFailed');
      pushToast('error', t('alerts.deleteFailed'), message);
      return { ok: false, message };
    }
  }

  return {
    brands: brandsQuery.data || [],
    loading: brandsQuery.isPending,
    error: brandsQuery.error?.message || '',
    createBrand,
    renameBrand,
    deleteBrand,
    reload: brandsQuery.refetch,
  };
}
