import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi';
import { fetchCategoryAttributes, productKeys } from '../queries/productQueries.js';

export function useCategoryAttributesViewModel(categoryId) {
  const { t, pushToast, tenant, user } = useInventoryApp();
  const queryClient = useQueryClient();
  const tenantId = tenant?.id || user?.tenantId || '';
  const attributesQuery = useQuery({
    queryKey: productKeys.categoryAttributes(tenantId, categoryId),
    queryFn: () => fetchCategoryAttributes(categoryId),
    enabled: Boolean(tenantId && categoryId),
    staleTime: 60_000,
  });

  function invalidate() {
    return queryClient.invalidateQueries({ queryKey: productKeys.categoryAttributes(tenantId, categoryId) });
  }

  const createMutation = useMutation({
    mutationFn: (attribute) => inventoryApi.createCategoryAttribute(categoryId, attribute),
    onSuccess: invalidate,
  });
  const updateMutation = useMutation({
    mutationFn: ({ attributeId, attribute }) => inventoryApi.updateCategoryAttribute(categoryId, attributeId, attribute),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({
    mutationFn: (attributeId) => inventoryApi.deleteCategoryAttribute(categoryId, attributeId),
    onSuccess: invalidate,
  });

  async function createAttribute(attribute) {
    try {
      await createMutation.mutateAsync(attribute);
      pushToast('success', t('categoryAttributes.title'), t('alerts.created'));
      return { ok: true };
    } catch (requestError) {
      const message = requestError.message || t('categoryAttributes.saveFailed');
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function updateAttribute(attributeId, attribute) {
    try {
      await updateMutation.mutateAsync({ attributeId, attribute });
      pushToast('success', t('categoryAttributes.title'), t('alerts.updated'));
      return { ok: true };
    } catch (requestError) {
      const message = requestError.message || t('categoryAttributes.saveFailed');
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function deleteAttribute(attributeId) {
    try {
      await deleteMutation.mutateAsync(attributeId);
      pushToast('success', t('common.delete'), t('alerts.deleted'));
      return { ok: true };
    } catch (requestError) {
      const message = requestError.message || t('categoryAttributes.deleteFailed');
      pushToast('error', t('alerts.deleteFailed'), message);
      return { ok: false, message };
    }
  }

  return {
    attributes: attributesQuery.data || [],
    loading: attributesQuery.isPending,
    error: attributesQuery.error?.message || '',
    createAttribute,
    updateAttribute,
    deleteAttribute,
  };
}
