import { useCallback, useEffect, useState } from 'react';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi';

export function useCategoriesViewModel() {
  const { t, pushToast } = useInventoryApp();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const result = await inventoryApi.listCategories();
      setCategories(result.categories || []);
    } catch (requestError) {
      setError(requestError.message || t('categories.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  async function createCategory(name) {
    try {
      await inventoryApi.createCategory({ name });
      await load();
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
      await inventoryApi.updateCategory(categoryId, { name });
      await load();
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
      await inventoryApi.deleteCategory(categoryId);
      await load();
      pushToast('success', t('common.delete'), t('alerts.deleted'));
      return { ok: true };
    } catch (requestError) {
      const message = requestError.message || t('categories.deleteFailed');
      pushToast('error', t('alerts.deleteFailed'), message);
      return { ok: false, message };
    }
  }

  return { categories, loading, error, createCategory, renameCategory, deleteCategory, reload: load };
}
