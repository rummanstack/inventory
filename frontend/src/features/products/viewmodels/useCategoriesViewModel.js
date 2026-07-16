import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi';
import { fetchCategories, productKeys } from '../queries/productQueries.js';

export function useCategoriesViewModel() {
  const { t, pushToast, tenant, user } = useInventoryApp();
  const queryClient = useQueryClient();
  const tenantId = tenant?.id || user?.tenantId || '';
  const categoriesQuery = useQuery({
    queryKey: productKeys.categories(tenantId),
    queryFn: fetchCategories,
    enabled: Boolean(tenantId),
    staleTime: 5 * 60_000,
  });
  const categoryMutation = useMutation({
    mutationFn: ({ action, categoryId, name }) => {
      if (action === 'create') return inventoryApi.createCategory({ name });
      if (action === 'rename') return inventoryApi.updateCategory(categoryId, { name });
      return inventoryApi.deleteCategory(categoryId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productKeys.categories(tenantId) }),
  });

  async function createCategory(name) {
    try {
      await categoryMutation.mutateAsync({ action: 'create', name });
      pushToast('success', t('categories.title'), t('alerts.created'));
      return { ok: true };
    } catch (requestError) {
      const message = requestError.message || t('categories.saveFailed');
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function renameCategory(categoryId, name) {
    try {
      await categoryMutation.mutateAsync({ action: 'rename', categoryId, name });
      pushToast('success', t('categories.title'), t('alerts.updated'));
      return { ok: true };
    } catch (requestError) {
      const message = requestError.message || t('categories.saveFailed');
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function deleteCategory(categoryId) {
    try {
      await categoryMutation.mutateAsync({ action: 'delete', categoryId });
      pushToast('success', t('common.delete'), t('alerts.deleted'));
      return { ok: true };
    } catch (requestError) {
      const message = requestError.message || t('categories.deleteFailed');
      pushToast('error', t('alerts.deleteFailed'), message);
      return { ok: false, message };
    }
  }

  return {
    categories: categoriesQuery.data || [],
    loading: categoriesQuery.isPending,
    error: categoriesQuery.error?.message || '',
    createCategory,
    renameCategory,
    deleteCategory,
    reload: categoriesQuery.refetch,
  };
}
