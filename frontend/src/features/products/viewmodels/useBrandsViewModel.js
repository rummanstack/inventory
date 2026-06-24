import { useCallback, useEffect, useState } from 'react';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi';

export function useBrandsViewModel() {
  const { t, pushToast } = useInventoryApp();
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const result = await inventoryApi.listBrands();
      setBrands(result.brands || []);
    } catch (requestError) {
      setError(requestError.message || t('brands.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  async function createBrand(name) {
    try {
      await inventoryApi.createBrand({ name });
      await load();
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
      await inventoryApi.updateBrand(brandId, { name });
      await load();
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
      await inventoryApi.deleteBrand(brandId);
      await load();
      pushToast('success', t('common.delete'), t('alerts.deleted'));
      return { ok: true };
    } catch (requestError) {
      const message = requestError.message || t('brands.deleteFailed');
      pushToast('error', t('alerts.deleteFailed'), message);
      return { ok: false, message };
    }
  }

  return { brands, loading, error, createBrand, renameBrand, deleteBrand, reload: load };
}
