import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { inventoryApi } from '../services/inventoryApi';
import { formatCurrency, formatDate, todayISO } from '../utils/calculations';
import { useLanguage } from './hooks/useLanguage';
import { useToasts } from './hooks/useToasts';
import { useConfirmation } from './hooks/useConfirmation';
import { useDirectories } from './hooks/useDirectories';

const InventoryAppContext = createContext(null);

function interpolateConfirm(template, values) {
  return template.replace(/\{(\w+)\}/g, (_, name) => {
    const value = values[name];
    return value === undefined || value === null ? '' : String(value);
  });
}

function getFriendlyError(error, t) {
  if (error?.status === 403) {
    return t('alerts.forbidden');
  }

  return error?.message || t('alerts.requestFailed');
}

export function InventoryAppProvider({ children }) {
  const today = todayISO();
  const { language, setLanguage, t } = useLanguage();
  const { toasts, pushToast, dismissToast } = useToasts();
  const { confirmation, confirm, closeConfirmation } = useConfirmation(t);
  const {
    productDirectory,
    dsrDirectory,
    setProductDirectory,
    setDsrDirectory,
    upsertProductDirectory,
    removeFromProductDirectory,
    upsertDsrDirectory,
    removeFromDsrDirectory,
    refreshProductDirectory,
    refreshDsrDirectory,
    resetDirectories,
  } = useDirectories();
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  function handleUnauthorized() {
    setUser(null);
    setTenant(null);
    setPermissions([]);
    resetDirectories();
    setLoadError('');
    setLoading(false);
  }

  async function refreshState() {
    try {
      setLoading(true);
      setLoadError('');
      const [productsResult, dsrsResult] = await Promise.all([
        inventoryApi.getProductsDirectory(),
        inventoryApi.getDsrsDirectory(),
      ]);
      setProductDirectory(productsResult.products || []);
      setDsrDirectory(dsrsResult.dsrs || []);
    } catch (error) {
      if (error.status === 401) {
        handleUnauthorized();
        return;
      }

      const message = getFriendlyError(error, t);
      setLoadError(message);
      pushToast('error', t('alerts.unableToLoad'), message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadAuthenticatedSession() {
      try {
        setAuthLoading(true);
        const result = await inventoryApi.getCurrentUser();
        if (cancelled) {
          return;
        }

        setUser(result.user);
        setTenant(result.tenant || null);
        setPermissions(result.permissions || []);
        if (result.user.role !== 'platform_admin') {
          await refreshState();
        } else {
          setLoading(false);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (error.status !== 401) {
          const message = getFriendlyError(error, t);
          setLoadError(message);
          pushToast('error', t('alerts.unableToVerify'), message);
        }
        handleUnauthorized();
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
        }
      }
    }

    loadAuthenticatedSession();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handleWheel(event) {
      const activeElement = document.activeElement;
      if (activeElement instanceof HTMLInputElement && activeElement.type === 'number') {
        event.preventDefault();
      }
    }

    document.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      document.removeEventListener('wheel', handleWheel);
    };
  }, []);

  async function saveProduct(product) {
    try {
      const result = product.id ? await inventoryApi.updateProduct(product) : await inventoryApi.createProduct(product);
      upsertProductDirectory(result.product);
      pushToast('success', product.id ? t('products.editTitle') : t('products.addTitle'), `${product.name} ${product.id ? t('alerts.updated') : t('alerts.created')}`);
      return { ok: true };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function deleteProduct(product) {
    const confirmMessage = t('products.deleteConfirm', { name: product.name });
    const { confirmed, reason } = await confirm({
      title: t('products.deleteTitle'),
      description: interpolateConfirm(confirmMessage, { name: product.name }),
      confirmLabel: t('common.delete'),
      tone: 'rose',
      requireReason: true,
      reasonLabel: t('common.deleteReasonLabel'),
      reasonPlaceholder: t('common.deleteReasonPlaceholder'),
    });
    if (!confirmed) {
      return { ok: false };
    }

    try {
      await inventoryApi.deleteProduct(product.id, reason);
      removeFromProductDirectory(product.id);
      pushToast('success', t('common.delete'), `${product.name} ${t('alerts.deleted')}`);
      return { ok: true };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.deleteFailed'), message);
      return { ok: false, message };
    }
  }

  async function addStock(productId, addPieces, reason) {
    try {
      const result = await inventoryApi.addProductStock(productId, addPieces, reason);
      upsertProductDirectory(result.product);
      pushToast('success', t('products.updateStock'), t('products.stockUpdateSuccess'));
      return { ok: true };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.updateFailed'), message);
      return { ok: false, message };
    }
  }

  async function clearDamagedStock(productId, quantity, note) {
    try {
      const result = await inventoryApi.clearDamagedStock(productId, quantity, note);
      upsertProductDirectory(result.product);
      pushToast('success', t('damagedStock.clearTitle'), t('damagedStock.clearSuccess'));
      return { ok: true };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('damagedStock.clearFailed'), message);
      return { ok: false, message };
    }
  }

  async function saveDsr(dsr) {
    try {
      const result = dsr.id ? await inventoryApi.updateDsr(dsr) : await inventoryApi.createDsr(dsr);
      upsertDsrDirectory(result.dsr);
      pushToast('success', dsr.id ? t('dsr.editTitle') : t('dsr.addTitle'), `${dsr.name} ${dsr.id ? t('alerts.updated') : t('alerts.created')}`);
      return { ok: true };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function deleteDsr(dsr) {
    const confirmMessage = t('dsr.deleteConfirm', { name: dsr.name });
    const { confirmed, reason } = await confirm({
      title: t('dsr.deleteTitle'),
      description: interpolateConfirm(confirmMessage, { name: dsr.name }),
      confirmLabel: t('common.delete'),
      tone: 'rose',
      requireReason: true,
      reasonLabel: t('common.deleteReasonLabel'),
      reasonPlaceholder: t('common.deleteReasonPlaceholder'),
    });
    if (!confirmed) {
      return { ok: false };
    }

    try {
      await inventoryApi.deleteDsr(dsr.id, reason);
      removeFromDsrDirectory(dsr.id);
      pushToast('success', t('common.delete'), `${dsr.name} ${t('alerts.deleted')}`);
      return { ok: true };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.deleteFailed'), message);
      return { ok: false, message };
    }
  }

  async function saveCustomer(customer) {
    try {
      const result = customer.id ? await inventoryApi.updateCustomer(customer) : await inventoryApi.createCustomer(customer);
      pushToast('success', customer.id ? t('customers.editTitle') : t('customers.addTitle'), `${customer.shopName} ${customer.id ? t('alerts.updated') : t('alerts.created')}`);
      return { ok: true, customer: result.customer };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function deleteCustomer(customer) {
    const confirmMessage = t('customers.deleteConfirm', { name: customer.shopName });
    const { confirmed, reason } = await confirm({
      title: t('customers.deleteTitle'),
      description: interpolateConfirm(confirmMessage, { name: customer.shopName }),
      confirmLabel: t('common.delete'),
      tone: 'rose',
      requireReason: true,
      reasonLabel: t('common.deleteReasonLabel'),
      reasonPlaceholder: t('common.deleteReasonPlaceholder'),
    });
    if (!confirmed) {
      return { ok: false };
    }

    try {
      await inventoryApi.deleteCustomer(customer.id, reason);
      pushToast('success', t('common.delete'), `${customer.shopName} ${t('alerts.deleted')}`);
      return { ok: true };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.deleteFailed'), message);
      return { ok: false, message };
    }
  }

  async function restoreTrashedItem({ name, restoreFn, onRestored }) {
    const { confirmed } = await confirm({
      title: t('trash.restoreTitle'),
      description: interpolateConfirm(t('trash.restoreConfirm'), { name }),
      confirmLabel: t('trash.restore'),
      tone: 'emerald',
    });
    if (!confirmed) {
      return { ok: false };
    }

    try {
      await restoreFn();
      await onRestored?.();
      pushToast('success', t('trash.restore'), `${name} ${t('trash.restoreSuccess')}`);
      return { ok: true };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('trash.restoreFailed'), message);
      return { ok: false, message };
    }
  }

  async function permanentlyDeleteTrashedItem({ name, deleteFn }) {
    const { confirmed } = await confirm({
      title: t('trash.permanentDeleteTitle'),
      description: interpolateConfirm(t('trash.permanentDeleteConfirm'), { name }),
      confirmLabel: t('trash.permanentDelete'),
      tone: 'rose',
    });
    if (!confirmed) {
      return { ok: false };
    }

    try {
      await deleteFn();
      pushToast('success', t('trash.permanentDelete'), `${name} ${t('trash.permanentDeleteSuccess')}`);
      return { ok: true };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('trash.permanentDeleteFailed'), message);
      return { ok: false, message };
    }
  }

  function restoreProduct(product) {
    return restoreTrashedItem({
      name: product.name,
      restoreFn: () => inventoryApi.restoreProduct(product.id),
      onRestored: refreshProductDirectory,
    });
  }

  function permanentlyDeleteProduct(product) {
    return permanentlyDeleteTrashedItem({
      name: product.name,
      deleteFn: () => inventoryApi.permanentlyDeleteProduct(product.id),
    });
  }

  function restoreUser(user) {
    return restoreTrashedItem({
      name: user.name,
      restoreFn: () => inventoryApi.restoreUser(user.id),
    });
  }

  function permanentlyDeleteUser(user) {
    return permanentlyDeleteTrashedItem({
      name: user.name,
      deleteFn: () => inventoryApi.permanentlyDeleteUser(user.id),
    });
  }

  function restoreDsr(dsr) {
    return restoreTrashedItem({
      name: dsr.name,
      restoreFn: () => inventoryApi.restoreDsr(dsr.id),
      onRestored: refreshDsrDirectory,
    });
  }

  function permanentlyDeleteDsr(dsr) {
    return permanentlyDeleteTrashedItem({
      name: dsr.name,
      deleteFn: () => inventoryApi.permanentlyDeleteDsr(dsr.id),
    });
  }

  function restoreCustomer(customer) {
    return restoreTrashedItem({
      name: customer.shopName,
      restoreFn: () => inventoryApi.restoreCustomer(customer.id),
    });
  }

  function permanentlyDeleteCustomer(customer) {
    return permanentlyDeleteTrashedItem({
      name: customer.shopName,
      deleteFn: () => inventoryApi.permanentlyDeleteCustomer(customer.id),
    });
  }

  function restoreExpense(expense) {
    return restoreTrashedItem({
      name: expense.category,
      restoreFn: () => inventoryApi.restoreExpense(expense.id),
    });
  }

  function permanentlyDeleteExpense(expense) {
    return permanentlyDeleteTrashedItem({
      name: expense.category,
      deleteFn: () => inventoryApi.permanentlyDeleteExpense(expense.id),
    });
  }

  async function saveIssue(issue) {
    try {
      await inventoryApi.saveIssue(issue);
      await refreshProductDirectory();
      pushToast('success', t('nav.morningIssue'), `${issue.dsrName} - ${formatDate(issue.date)}`);
      return { ok: true };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function saveSettlement(settlement) {
    try {
      await inventoryApi.saveSettlement(settlement);
      await refreshProductDirectory();
      pushToast('success', t('nav.eveningSettlement'), `${settlement.dsrName} - ${formatCurrency(settlement.totalPayable)}`);
      return { ok: true };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function login(credentials) {
    try {
      const result = await inventoryApi.login(credentials);
      setUser(result.user);
      setTenant(result.tenant || null);
      setPermissions(result.permissions || []);
      if (result.user.role !== 'platform_admin') {
        await refreshState();
      }
      pushToast('success', t('alerts.loggedIn'), result.user.name);
      return { ok: true };
    } catch (error) {
      const message = getFriendlyError(error);
      pushToast('error', t('auth.loginFailed'), message);
      return { ok: false, message };
    }
  }

  async function logout() {
    try {
      await inventoryApi.logout();
    } catch (error) {
      if (error.status !== 401) {
        pushToast('error', t('auth.logout'), getFriendlyError(error, t));
      }
    } finally {
      handleUnauthorized();
    }
  }

  async function forgotPassword(payload) {
    try {
      await inventoryApi.forgotPassword(payload);
      return { ok: true };
    } catch (error) {
      const message = getFriendlyError(error, t);
      return { ok: false, message };
    }
  }

  async function resetPassword(payload) {
    try {
      await inventoryApi.resetPassword(payload);
      return { ok: true };
    } catch (error) {
      const message = getFriendlyError(error, t);
      return { ok: false, message };
    }
  }

  async function updateProfile(fields) {
    try {
      const result = await inventoryApi.updateProfile(fields);
      setUser((current) => (current ? { ...current, ...result.user } : result.user));
      pushToast('success', t('profile.title'), t('profile.updateSuccess'));
      return { ok: true };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  const value = useMemo(
    () => ({
      today,
      language,
      setLanguage,
      t,
      can: (permission) => user?.role === 'system_developer' || permissions.includes(permission),
      hasFeature: (feature) =>
        !feature || user?.role === 'system_developer' || user?.role === 'platform_admin' || !tenant?.features || tenant.features.includes(feature),
      user,
      tenant,
      setTenant,
      authLoading,
      productDirectory,
      dsrDirectory,
      loading,
      loadError,
      toasts,
      pushToast,
      dismissToast,
      confirmation,
      confirm,
      closeConfirmation,
      login,
      logout,
      forgotPassword,
      resetPassword,
      saveProduct,
      deleteProduct,
      restoreProduct,
      permanentlyDeleteProduct,
      restoreUser,
      permanentlyDeleteUser,
      addStock,
      clearDamagedStock,
      saveDsr,
      deleteDsr,
      restoreDsr,
      permanentlyDeleteDsr,
      saveCustomer,
      deleteCustomer,
      restoreCustomer,
      permanentlyDeleteCustomer,
      restoreExpense,
      permanentlyDeleteExpense,
      saveIssue,
      saveSettlement,
      updateProfile,
    }),
    [today, language, t, user, tenant, permissions, authLoading, productDirectory, dsrDirectory, loading, loadError, toasts, confirmation],
  );

  return <InventoryAppContext.Provider value={value}>{children}</InventoryAppContext.Provider>;
}

export function useInventoryApp() {
  const context = useContext(InventoryAppContext);
  if (!context) {
    throw new Error('useInventoryApp must be used within InventoryAppProvider.');
  }

  return context;
}
