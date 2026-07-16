import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '../services/inventoryApi';
import { getActiveTenantId, setActiveTenantId } from '../services/api/client.js';
import { formatCurrency, formatDate, todayISO } from '../utils/calculations';
import { useLanguage } from './hooks/useLanguage';
import { pushToast } from './hooks/toast';
import { useConfirmation } from './hooks/useConfirmation';
import { useDirectories } from './hooks/useDirectories';
import { clearCssVarCache } from '../utils/theme.js';
import { SHARED_DATA_DOMAINS as D, subscribeToSharedDataInvalidation } from '../services/sharedDataInvalidation.js';
import { fetchProductDirectory, productKeys } from '../features/products/queries/productQueries.js';
import { apiListKeys } from '../queries/apiQueryKeys.js';
import { reportKeys } from '../features/reports/queries/reportQueries.js';
import { transactionKeys } from '../features/transactions/queries/transactionQueries.js';

const InventoryAppContext = createContext(null);

const THEME_STORAGE_KEY = 'stockledger.theme';
const SESSION_OPTIONAL_PATHS = [
  '/landing',
  '/features',
  '/solutions',
  '/pricing',
  '/contact',
  '/get-started',
  '/founder',
  '/privacy-policy',
  '/terms',
];

function isSessionOptionalPathname(pathname) {
  return SESSION_OPTIONAL_PATHS.some((publicPath) => pathname === publicPath || pathname.startsWith(publicPath + '/'));
}

function getCurrentPathname() {
  return typeof window === 'undefined' ? '/' : window.location.pathname;
}

function useTheme() {
  const [theme, setThemeState] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
  );

  function setTheme(next) {
    setThemeState(next);
    document.documentElement.dataset.theme = next === 'dark' ? 'dark' : '';
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch { /* private mode */ }
    // getCssVar memoizes resolved variables; charts must re-read them.
    clearCssVarCache();
  }

  function toggleTheme() {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }

  return { theme, setTheme, toggleTheme };
}

function interpolateConfirm(template, values) {
  return template.replace(/\{(\w+)\}/g, (_, name) => {
    const value = values[name];
    return value === undefined || value === null ? '' : String(value);
  });
}

function getFriendlyError(error, t) {
  return error?.message || t('alerts.requestFailed');
}

function buildConsequences(t, key, variants) {
  return t(key).map((text, i) => ({ variant: variants[i], text }));
}

export function InventoryAppProvider({ children }) {
  const queryClient = useQueryClient();
  const today = todayISO();
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme, toggleTheme } = useTheme();
  const { confirmation, confirm, closeConfirmation } = useConfirmation(t);
  const staleSharedDirectoryDomainsRef = useRef(new Set());
  const sharedDirectoryRefreshPromisesRef = useRef(new Map());

  function markSharedDirectoryFresh(domain) {
    staleSharedDirectoryDomainsRef.current.delete(domain);
  }

  const {
    dsrDirectory,
    srDirectory,
    supplierDirectory,
    shopDirectory,
    retailCustomerDirectory,
    promotionDirectory,
    setDsrDirectory,
    setSrDirectory,
    setSupplierDirectory,
    setShopDirectory,
    setRetailCustomerDirectory,
    setPromotionDirectory,
    upsertDsrDirectory,
    removeFromDsrDirectory,
    upsertSrDirectory,
    removeFromSrDirectory,
    upsertSupplierDirectory,
    removeFromSupplierDirectory,
    upsertShopDirectory,
    removeFromShopDirectory,
    upsertRetailCustomerDirectory,
    removeFromRetailCustomerDirectory,
    upsertPromotionDirectory,
    removeFromPromotionDirectory,
    refreshDsrDirectory,
    refreshSrDirectory,
    refreshSupplierDirectory,
    refreshShopDirectory,
    refreshRetailCustomerDirectory,
    refreshPromotionDirectory,
    resetDirectories,
  } = useDirectories({ onDirectoryFresh: markSharedDirectoryFresh });
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [tenantOptions, setTenantOptions] = useState([]);
  const productTenantId = tenant?.id || user?.tenantId || '';
  const productDirectoryKey = productKeys.directory(productTenantId);
  const productDirectoryQuery = useQuery({
    queryKey: productDirectoryKey,
    queryFn: fetchProductDirectory,
    enabled: Boolean(user && productTenantId),
    staleTime: 60_000,
  });
  const productDirectory = productDirectoryQuery.data || [];
  const saveProductMutation = useMutation({
    mutationFn: (product) => product.id ? inventoryApi.updateProduct(product) : inventoryApi.createProduct(product),
    onSuccess: (result) => updateProductCaches(result.product),
  });
  const deleteProductMutation = useMutation({
    mutationFn: ({ product, reason }) => inventoryApi.deleteProduct(product.id, reason),
    onSuccess: (_result, { product }) => {
      removeFromProductDirectory(product.id);
      invalidateProductDerivedQueries();
    },
  });
  const addStockMutation = useMutation({
    mutationFn: ({ productId, addPieces, reason }) => inventoryApi.addProductStock(productId, addPieces, reason),
    onSuccess: (result) => updateProductCaches(result.product),
  });
  const openingStockMutation = useMutation({
    mutationFn: ({ productId, quantity, note }) => inventoryApi.setOpeningStock(productId, quantity, note),
    onSuccess: (result) => updateProductCaches(result.product),
  });
  const clearDamagedStockMutation = useMutation({
    mutationFn: ({ productId, quantity, note }) => inventoryApi.clearDamagedStock(productId, quantity, note),
    onSuccess: (result) => updateProductCaches(result.product),
  });
  const saveQuotationMutation = useMutation({
    mutationKey: transactionKeys.mutation(productTenantId, 'save-quotation'),
    mutationFn: (quotation) => quotation.id
      ? inventoryApi.updateQuotation(quotation)
      : inventoryApi.createQuotation(quotation),
  });
  const deleteQuotationMutation = useMutation({
    mutationKey: transactionKeys.mutation(productTenantId, 'delete-quotation'),
    mutationFn: ({ id, reason }) => inventoryApi.deleteQuotation(id, reason),
  });
  const convertQuotationMutation = useMutation({
    mutationKey: transactionKeys.mutation(productTenantId, 'convert-quotation'),
    mutationFn: ({ id, payload }) => inventoryApi.convertQuotation(id, payload),
  });
  const savePurchaseReceiptMutation = useMutation({
    mutationKey: transactionKeys.mutation(productTenantId, 'save-purchase-receipt'),
    mutationFn: (receipt) => receipt.id
      ? inventoryApi.updatePurchaseReceipt(receipt)
      : inventoryApi.createPurchaseReceipt(receipt),
  });
  const deletePurchaseReceiptMutation = useMutation({
    mutationKey: transactionKeys.mutation(productTenantId, 'delete-purchase-receipt'),
    mutationFn: ({ id, reason }) => inventoryApi.deletePurchaseReceipt(id, reason),
  });
  const savePurchaseReturnMutation = useMutation({
    mutationKey: transactionKeys.mutation(productTenantId, 'save-purchase-return'),
    mutationFn: (purchaseReturn) => inventoryApi.createPurchaseReturn(purchaseReturn),
  });
  const deletePurchaseReturnMutation = useMutation({
    mutationKey: transactionKeys.mutation(productTenantId, 'delete-purchase-return'),
    mutationFn: ({ id, reason }) => inventoryApi.deletePurchaseReturn(id, reason),
  });
  const saveSupplierPaymentMutation = useMutation({
    mutationKey: transactionKeys.mutation(productTenantId, 'save-supplier-payment'),
    mutationFn: (payment) => payment.id
      ? inventoryApi.updateSupplierPayment(payment)
      : inventoryApi.createSupplierPayment(payment),
  });
  const deleteSupplierPaymentMutation = useMutation({
    mutationKey: transactionKeys.mutation(productTenantId, 'delete-supplier-payment'),
    mutationFn: ({ id, reason }) => inventoryApi.deleteSupplierPayment(id, reason),
  });
  const saveSalesInvoiceMutation = useMutation({
    mutationKey: transactionKeys.mutation(productTenantId, 'save-sales-invoice'),
    mutationFn: (invoice) => inventoryApi.createSalesInvoice(invoice),
  });
  const deleteSalesInvoiceMutation = useMutation({
    mutationKey: transactionKeys.mutation(productTenantId, 'delete-sales-invoice'),
    mutationFn: ({ id, reason }) => inventoryApi.deleteSalesInvoice(id, reason),
  });
  const saveSalesReturnMutation = useMutation({
    mutationKey: transactionKeys.mutation(productTenantId, 'save-sales-return'),
    mutationFn: (salesReturn) => inventoryApi.createSalesReturn(salesReturn),
  });

  function invalidateProductDerivedQueries() {
    if (!productTenantId) return;
    queryClient.invalidateQueries({ queryKey: productKeys.lists(productTenantId), refetchType: 'none' });
    queryClient.invalidateQueries({ queryKey: productKeys.stockMovementLists(productTenantId), refetchType: 'none' });
  }

  function updateProductCaches(product) {
    upsertProductDirectory(product);
    invalidateProductDerivedQueries();
  }

  function upsertProductDirectory(product) {
    if (!productTenantId) return;
    queryClient.setQueryData(productDirectoryKey, (current = []) => {
      const next = current.some((item) => item.id === product.id)
        ? current.map((item) => (item.id === product.id ? product : item))
        : [...current, product];
      return next.sort((a, b) => {
        const orderDifference = (a.orderIndex ?? 9999) - (b.orderIndex ?? 9999);
        return orderDifference || a.name.localeCompare(b.name);
      });
    });
    markSharedDirectoryFresh(D.PRODUCTS);
  }

  function removeFromProductDirectory(productId) {
    if (!productTenantId) return;
    queryClient.setQueryData(productDirectoryKey, (current = []) => current.filter((item) => item.id !== productId));
    markSharedDirectoryFresh(D.PRODUCTS);
  }

  async function refreshProductDirectory() {
    if (!productTenantId) return false;
    try {
      await queryClient.invalidateQueries({ queryKey: productDirectoryKey, exact: true, refetchType: 'none' });
      await queryClient.fetchQuery({ queryKey: productDirectoryKey, queryFn: fetchProductDirectory, staleTime: 0 });
      markSharedDirectoryFresh(D.PRODUCTS);
      return true;
    } catch {
      return false;
    }
  }

  function handleUnauthorized() {
    setUser(null);
    setTenant(null);
    setPermissions([]);
    setTenantOptions([]);
    resetDirectories();
    queryClient.clear();
    staleSharedDirectoryDomainsRef.current.clear();
    sharedDirectoryRefreshPromisesRef.current.clear();
    setLoadError('');
    setLoading(false);
  }

  async function switchTenant(tenantId) {
    setActiveTenantId(tenantId || '');
    try {
      const result = await inventoryApi.getCurrentUser();
      if (!result?.user) {
        handleUnauthorized();
        return { ok: false, message: t('alerts.unableToVerify') };
      }
      setUser(result.user);
      setTenant(result.tenant || null);
      setPermissions(result.permissions || []);
      await refreshState(result.tenant?.id || result.user?.tenantId);
      pushToast('success', t('organizations.switchedOrg'), result.tenant?.name || t('organizations.noOrgSelected'));
      return { ok: true };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function refreshState(tenantId = productTenantId) {
    try {
      setLoading(true);
      setLoadError('');
      const [, dsrsResult, srsResult, suppliersResult, customersResult, retailCustomersResult, promotionsResult] = await Promise.all([
        tenantId
          ? queryClient.fetchQuery({ queryKey: productKeys.directory(tenantId), queryFn: fetchProductDirectory, staleTime: 60_000 }).catch(() => [])
          : Promise.resolve([]),
        inventoryApi.getDsrsDirectory().catch(() => ({ dsrs: [] })),
        inventoryApi.getSrsDirectory().catch(() => ({ srs: [] })),
        inventoryApi.getActiveSuppliers().catch(() => ({ items: [] })),
        inventoryApi.getActiveCustomers().catch(() => ({ items: [] })),
        inventoryApi.getActiveRetailCustomers().catch(() => ({ items: [] })),
        inventoryApi.listRetailPromotions().catch(() => ({ promotions: [] })),
      ]);
      setDsrDirectory(dsrsResult.dsrs || []);
      setSrDirectory(srsResult.srs || []);
      setSupplierDirectory(suppliersResult.items || []);
      setShopDirectory(customersResult.items || []);
      setRetailCustomerDirectory(retailCustomersResult.items || []);
      setPromotionDirectory(promotionsResult.promotions || []);
      staleSharedDirectoryDomainsRef.current.clear();
    } catch (error) {
      if (error.status === 401) {
        handleUnauthorized();
        return;
      }

      if (error.status !== 403) {
        const message = getFriendlyError(error, t);
        setLoadError(message);
        pushToast('error', t('alerts.unableToLoad'), message);
      }
    } finally {
      setLoading(false);
    }
  }

  function hasStaleSharedDirectories(domains) {
    return domains.some((domain) => staleSharedDirectoryDomainsRef.current.has(domain));
  }

  function refreshStaleSharedDirectories(domains) {
    const refreshers = {
      [D.PRODUCTS]: refreshProductDirectory,
      [D.DSRS]: refreshDsrDirectory,
      [D.SRS]: refreshSrDirectory,
      [D.SUPPLIERS]: refreshSupplierDirectory,
      [D.SHOPS]: refreshShopDirectory,
      [D.RETAIL_CUSTOMERS]: refreshRetailCustomerDirectory,
      [D.PROMOTIONS]: refreshPromotionDirectory,
    };

    const requests = [...new Set(domains)]
      .filter((domain) => staleSharedDirectoryDomainsRef.current.has(domain) && refreshers[domain])
      .map((domain) => {
        const existing = sharedDirectoryRefreshPromisesRef.current.get(domain);
        if (existing) return existing;

        const request = Promise.resolve(refreshers[domain]()).finally(() => {
          if (sharedDirectoryRefreshPromisesRef.current.get(domain) === request) {
            sharedDirectoryRefreshPromisesRef.current.delete(domain);
          }
        });
        sharedDirectoryRefreshPromisesRef.current.set(domain, request);
        return request;
      });

    return Promise.all(requests);
  }

  useEffect(() => subscribeToSharedDataInvalidation((domains) => {
    domains.forEach((domain) => staleSharedDirectoryDomainsRef.current.add(domain));
    queryClient.invalidateQueries({ queryKey: apiListKeys.all, refetchType: 'none' });
    queryClient.invalidateQueries({ queryKey: ['api-data'], refetchType: 'none' });
    queryClient.invalidateQueries({ queryKey: reportKeys.all, refetchType: 'none' });
    queryClient.invalidateQueries({ queryKey: transactionKeys.all, refetchType: 'none' });
    if (domains.includes(D.PRODUCTS)) {
      queryClient.invalidateQueries({ queryKey: productKeys.all, refetchType: 'none' });
    }
    if (domains.includes(D.SUPPLIERS)) {
      queryClient.invalidateQueries({ queryKey: productKeys.references, refetchType: 'none' });
    }
  }), [queryClient]);

  useEffect(() => {
    let cancelled = false;

    async function loadAuthenticatedSession() {
      try {
        setAuthLoading(true);
        const result = await inventoryApi.getCurrentUser();
        if (cancelled) {
          return;
        }

        const currentUser = result?.user || null;
        if (!currentUser) {
          handleUnauthorized();
          return;
        }

        setUser(currentUser);
        setTenant(result.tenant || null);
        setPermissions(result.permissions || []);

        if (currentUser.isPlatformUser) {
          inventoryApi.listTenants().then((tenantsResult) => {
            if (!cancelled) {
              setTenantOptions(tenantsResult.tenants || []);
            }
          }).catch(() => {});
        }

        if (!currentUser.isPlatformUser) {
          await refreshState(result.tenant?.id || currentUser.tenantId);
        } else {
          setLoading(false);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        const pathname = getCurrentPathname();
        if (error.status !== 401 && !isSessionOptionalPathname(pathname)) {
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

  useEffect(() => {
    function handleFocus(event) {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || target.type !== 'number') {
        return;
      }

      const value = String(target.value || '');
      if (!/^0(?:\.0+)?$/.test(value)) {
        return;
      }

      requestAnimationFrame(() => {
        try {
          target.select();
        } catch {
          // Some browsers may not allow selection on number inputs.
        }
      });
    }

    document.addEventListener('focusin', handleFocus);
    return () => {
      document.removeEventListener('focusin', handleFocus);
    };
  }, []);

  async function saveProduct(product) {
    try {
      const result = await saveProductMutation.mutateAsync(product);
      pushToast('success', product.id ? t('products.editTitle') : t('products.addTitle'), `${product.name} ${product.id ? t('alerts.updated') : t('alerts.created')}`);
      return { ok: true, product: result.product };
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
      consequences: buildConsequences(t, 'products.deleteConsequences', ['safe', 'info', 'warn']),
    });
    if (!confirmed) {
      return { ok: false };
    }

    try {
      await deleteProductMutation.mutateAsync({ product, reason });
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
      await addStockMutation.mutateAsync({ productId, addPieces, reason });
      pushToast('success', t('products.updateStock'), t('products.stockUpdateSuccess'));
      return { ok: true };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.updateFailed'), message);
      return { ok: false, message };
    }
  }

  async function setOpeningStock(productId, quantity, note) {
    try {
      await openingStockMutation.mutateAsync({ productId, quantity, note });
      pushToast('success', t('products.openingStock'), t('products.openingStockSuccess'));
      return { ok: true };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.updateFailed'), message);
      return { ok: false, message };
    }
  }

  async function clearDamagedStock(productId, quantity, note) {
    try {
      await clearDamagedStockMutation.mutateAsync({ productId, quantity, note });
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
      consequences: buildConsequences(t, 'dsr.deleteConsequences', ['safe', 'info', 'warn']),
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

  async function saveSr(sr) {
    try {
      const result = sr.id ? await inventoryApi.updateSr(sr) : await inventoryApi.createSr(sr);
      upsertSrDirectory(result.sr);
      pushToast('success', sr.id ? t('srs.updatedToast') : t('srs.addedToast'), `${sr.name} ${sr.id ? t('alerts.updated') : t('alerts.created')}`);
      return { ok: true };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function deleteSr(sr) {
    const confirmMessage = t('srs.deleteConfirm', { name: sr.name });
    const { confirmed, reason } = await confirm({
      title: t('srs.deleteTitle'),
      description: interpolateConfirm(confirmMessage, { name: sr.name }),
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
      await inventoryApi.deleteSr(sr.id, reason);
      removeFromSrDirectory(sr.id);
      pushToast('success', t('common.delete'), `${sr.name} ${t('alerts.deleted')}`);
      return { ok: true };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.deleteFailed'), message);
      return { ok: false, message };
    }
  }

  async function saveShop(shop) {
    try {
      const result = shop.id ? await inventoryApi.updateCustomer(shop) : await inventoryApi.createCustomer(shop);
      if (result.customer.status === 'ACTIVE') {
        upsertShopDirectory(result.customer);
      } else {
        removeFromShopDirectory(result.customer.id);
      }
      pushToast('success', shop.id ? t('shops.editTitle') : t('shops.addTitle'), `${shop.shopName} ${shop.id ? t('alerts.updated') : t('alerts.created')}`);
      return { ok: true, customer: result.customer };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function saveRetailCustomer(customer) {
    try {
      const result = customer.id ? await inventoryApi.updateRetailCustomer(customer) : await inventoryApi.createRetailCustomer(customer);
      if (result.retailCustomer.status === 'ACTIVE') {
        upsertRetailCustomerDirectory(result.retailCustomer);
      } else {
        removeFromRetailCustomerDirectory(result.retailCustomer.id);
      }
      pushToast('success', customer.id ? t('retailCustomers.editTitle') : t('retailCustomers.addTitle'), `${customer.name} ${customer.id ? t('alerts.updated') : t('alerts.created')}`);
      return { ok: true, retailCustomer: result.retailCustomer };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function deleteShop(shop) {
    const confirmMessage = t('shops.deleteConfirm', { name: shop.shopName });
    const { confirmed, reason } = await confirm({
      title: t('shops.deleteTitle'),
      description: interpolateConfirm(confirmMessage, { name: shop.shopName }),
      confirmLabel: t('common.delete'),
      tone: 'rose',
      requireReason: true,
      reasonLabel: t('common.deleteReasonLabel'),
      reasonPlaceholder: t('common.deleteReasonPlaceholder'),
      consequences: buildConsequences(t, 'shops.deleteConsequences', ['safe', 'info', 'warn']),
    });
    if (!confirmed) {
      return { ok: false };
    }

    try {
      await inventoryApi.deleteCustomer(shop.id, reason);
      removeFromShopDirectory(shop.id);
      pushToast('success', t('common.delete'), `${shop.shopName} ${t('alerts.deleted')}`);
      return { ok: true };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.deleteFailed'), message);
      return { ok: false, message };
    }
  }

  async function saveSupplier(supplier) {
    try {
      const result = supplier.id ? await inventoryApi.updateSupplier(supplier) : await inventoryApi.createSupplier(supplier);
      if (result.supplier.status === 'ACTIVE') {
        upsertSupplierDirectory(result.supplier);
      } else {
        removeFromSupplierDirectory(result.supplier.id);
      }
      pushToast('success', supplier.id ? t('suppliers.editTitle') : t('suppliers.addTitle'), `${result.supplier.name} ${supplier.id ? t('alerts.updated') : t('alerts.created')}`);
      return { ok: true, supplier: result.supplier };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function deleteSupplier(supplier) {
    const confirmMessage = t('suppliers.deleteConfirm', { name: supplier.name });
    const { confirmed, reason } = await confirm({
      title: t('suppliers.deleteTitle'),
      description: interpolateConfirm(confirmMessage, { name: supplier.name }),
      confirmLabel: t('common.delete'),
      tone: 'rose',
      requireReason: true,
      reasonLabel: t('common.deleteReasonLabel'),
      reasonPlaceholder: t('common.deleteReasonPlaceholder'),
      consequences: buildConsequences(t, 'suppliers.deleteConsequences', ['safe', 'info', 'warn']),
    });
    if (!confirmed) {
      return { ok: false };
    }

    try {
      await inventoryApi.deleteSupplier(supplier.id, reason);
      removeFromSupplierDirectory(supplier.id);
      pushToast('success', t('common.delete'), `${supplier.name} ${t('alerts.deleted')}`);
      return { ok: true };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.deleteFailed'), message);
      return { ok: false, message };
    }
  }

  async function saveProductSerial(serial) {
    try {
      const result = serial.id ? await inventoryApi.updateProductSerial(serial) : await inventoryApi.createProductSerial(serial);
      pushToast('success', serial.id ? t('productSerials.editTitle') : t('productSerials.addTitle'), serial.id ? t('alerts.updated') : t('alerts.created'));
      return { ok: true, serial: result.serial || result };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function deleteProductSerial(serial) {
    const { confirmed, reason } = await confirm({
      title: t('productSerials.deleteTitle'),
      description: t('productSerials.deleteConfirm'),
      confirmLabel: t('common.delete'),
      tone: 'rose',
      requireReason: true,
      reasonLabel: t('common.deleteReasonLabel'),
      reasonPlaceholder: t('common.deleteReasonPlaceholder'),
      consequences: buildConsequences(t, 'productSerials.deleteConsequences', ['danger', 'info', 'warn']),
    });
    if (!confirmed) {
      return { ok: false };
    }

    try {
      await inventoryApi.deleteProductSerial(serial.id, reason);
      pushToast('success', t('common.delete'), t('alerts.deleted'));
      return { ok: true };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.deleteFailed'), message);
      return { ok: false, message };
    }
  }

  async function saveWarrantyClaim(claim) {
    try {
      const result = claim.id ? await inventoryApi.updateWarrantyClaim(claim) : await inventoryApi.createWarrantyClaim(claim);
      pushToast('success', claim.id ? t('warrantyClaims.editTitle') : t('warrantyClaims.addTitle'), claim.id ? t('alerts.updated') : t('alerts.created'));
      return { ok: true, claim: result.claim || result };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function deleteWarrantyClaim(claim) {
    const confirmMessage = t('warrantyClaims.deleteConfirm', { number: claim.claimNumber });
    const { confirmed, reason } = await confirm({
      title: t('warrantyClaims.deleteTitle'),
      description: interpolateConfirm(confirmMessage, { number: claim.claimNumber }),
      confirmLabel: t('common.delete'),
      tone: 'rose',
      requireReason: true,
      reasonLabel: t('common.deleteReasonLabel'),
      reasonPlaceholder: t('common.deleteReasonPlaceholder'),
      consequences: buildConsequences(t, 'warrantyClaims.deleteConsequences', ['safe', 'danger', 'warn']),
    });
    if (!confirmed) {
      return { ok: false };
    }

    try {
      await inventoryApi.deleteWarrantyClaim(claim.id, reason);
      pushToast('success', t('common.delete'), `${claim.claimNumber} ${t('alerts.deleted')}`);
      return { ok: true };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.deleteFailed'), message);
      return { ok: false, message };
    }
  }

  async function saveRepairJob(job) {
    try {
      const result = job.id ? await inventoryApi.updateRepairJob(job) : await inventoryApi.createRepairJob(job);
      pushToast('success', job.id ? t('repairJobs.editTitle') : t('repairJobs.addTitle'), job.id ? t('alerts.updated') : t('alerts.created'));
      return { ok: true, job: result };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function deleteRepairJob(job) {
    const confirmMessage = t('repairJobs.deleteConfirm', { number: job.jobNumber });
    const { confirmed, reason } = await confirm({
      title: t('repairJobs.deleteTitle'),
      description: interpolateConfirm(confirmMessage, { number: job.jobNumber }),
      confirmLabel: t('common.delete'),
      tone: 'rose',
      requireReason: true,
      reasonLabel: t('common.deleteReasonLabel'),
      reasonPlaceholder: t('common.deleteReasonPlaceholder'),
      consequences: buildConsequences(t, 'repairJobs.deleteConsequences', ['safe', 'info']),
    });
    if (!confirmed) {
      return { ok: false };
    }

    try {
      await inventoryApi.deleteRepairJob(job.id, reason);
      pushToast('success', t('common.delete'), `${job.jobNumber} ${t('alerts.deleted')}`);
      return { ok: true };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.deleteFailed'), message);
      return { ok: false, message };
    }
  }

  async function saveTradeIn(tradeIn) {
    try {
      const result = await inventoryApi.createTradeIn(tradeIn);
      pushToast('success', t('tradeIns.addTitle'), t('alerts.created'));
      return { ok: true, tradeIn: result };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function deleteTradeIn(tradeIn) {
    const confirmMessage = t('tradeIns.deleteConfirm', { number: tradeIn.tradeInNumber });
    const { confirmed, reason } = await confirm({
      title: t('tradeIns.deleteTitle'),
      description: interpolateConfirm(confirmMessage, { number: tradeIn.tradeInNumber }),
      confirmLabel: t('common.delete'),
      tone: 'rose',
      requireReason: true,
      reasonLabel: t('common.deleteReasonLabel'),
      reasonPlaceholder: t('common.deleteReasonPlaceholder'),
      consequences: buildConsequences(t, 'tradeIns.deleteConsequences', ['safe', 'danger', 'warn']),
    });
    if (!confirmed) return { ok: false };
    try {
      await inventoryApi.deleteTradeIn(tradeIn.id, reason);
      pushToast('success', t('common.delete'), `${tradeIn.tradeInNumber} ${t('alerts.deleted')}`);
      return { ok: true };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.deleteFailed'), message);
      return { ok: false, message };
    }
  }

  async function saveQuotation(quotation) {
    try {
      const result = await saveQuotationMutation.mutateAsync(quotation);
      pushToast('success', quotation.id ? t('quotations.editTitle') : t('quotations.addTitle'), quotation.id ? t('alerts.updated') : t('alerts.created'));
      return { ok: true, quotation: result };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function deleteQuotation(quotation) {
    const confirmMessage = t('quotations.deleteConfirm', { number: quotation.quoteNumber });
    const { confirmed, reason } = await confirm({
      title: t('quotations.deleteTitle'),
      description: interpolateConfirm(confirmMessage, { number: quotation.quoteNumber }),
      confirmLabel: t('common.delete'),
      tone: 'rose',
      requireReason: true,
      reasonLabel: t('common.deleteReasonLabel'),
      reasonPlaceholder: t('common.deleteReasonPlaceholder'),
      consequences: buildConsequences(t, 'quotations.deleteConsequences', ['safe', 'info']),
    });
    if (!confirmed) return { ok: false };
    try {
      await deleteQuotationMutation.mutateAsync({ id: quotation.id, reason });
      pushToast('success', t('common.delete'), `${quotation.quoteNumber} ${t('alerts.deleted')}`);
      return { ok: true };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.deleteFailed'), message);
      return { ok: false, message };
    }
  }

  async function convertQuotation(id, payload) {
    try {
      const result = await convertQuotationMutation.mutateAsync({ id, payload });
      pushToast('success', t('quotations.convertTitle'), t('quotations.convertSuccess', { number: result.invoiceNumber }));
      return { ok: true, ...result };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('quotations.convertFailed'), message);
      return { ok: false, message };
    }
  }

  async function savePurchaseReceipt(purchaseReceipt) {
    try {
      const result = await savePurchaseReceiptMutation.mutateAsync(purchaseReceipt);
      await Promise.all([refreshProductDirectory(), refreshSupplierDirectory()]);
      pushToast('success', purchaseReceipt.id ? t('purchaseReceive.editTitle') : t('purchaseReceive.addTitle'), `${result.purchaseReceipt.purchaseNumber} ${purchaseReceipt.id ? t('alerts.updated') : t('alerts.created')}`);
      return { ok: true, purchaseReceipt: result.purchaseReceipt };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function deletePurchaseReceipt(purchaseReceipt) {
    const confirmMessage = t('purchaseReceive.deleteConfirm', { number: purchaseReceipt.purchaseNumber });
    const { confirmed, reason } = await confirm({
      title: t('purchaseReceive.deleteTitle'),
      description: interpolateConfirm(confirmMessage, { number: purchaseReceipt.purchaseNumber }),
      confirmLabel: t('common.delete'),
      tone: 'rose',
      requireReason: true,
      reasonLabel: t('common.deleteReasonLabel'),
      reasonPlaceholder: t('common.deleteReasonPlaceholder'),
      consequences: buildConsequences(t, 'purchaseReceive.deleteConsequences', ['safe', 'danger', 'danger', 'warn']),
    });
    if (!confirmed) {
      return { ok: false };
    }

    try {
      await deletePurchaseReceiptMutation.mutateAsync({ id: purchaseReceipt.id, reason });
      await Promise.all([refreshProductDirectory(), refreshSupplierDirectory()]);
      pushToast('success', t('common.delete'), `${purchaseReceipt.purchaseNumber} ${t('alerts.deleted')}`);
      return { ok: true };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.deleteFailed'), message);
      return { ok: false, message };
    }
  }

  async function savePurchaseReturn(purchaseReturn) {
    try {
      const result = await savePurchaseReturnMutation.mutateAsync(purchaseReturn);
      await Promise.all([refreshProductDirectory(), refreshSupplierDirectory()]);
      pushToast('success', t('purchaseReturns.addTitle'), `${result.purchaseReturn.returnNumber} ${t('alerts.created')}`);
      return { ok: true, purchaseReturn: result.purchaseReturn };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function deletePurchaseReturn(purchaseReturn) {
    const { confirmed, reason } = await confirm({
      title: t('purchaseReturns.deleteTitle'),
      description: t('purchaseReturns.deleteConfirm'),
      confirmLabel: t('common.delete'),
      tone: 'rose',
      requireReason: true,
      reasonLabel: t('common.deleteReasonLabel'),
      reasonPlaceholder: t('common.deleteReasonPlaceholder'),
      consequences: buildConsequences(t, 'purchaseReturns.deleteConsequences', ['danger', 'danger']),
    });
    if (!confirmed) {
      return { ok: false };
    }

    try {
      await deletePurchaseReturnMutation.mutateAsync({ id: purchaseReturn.id, reason });
      await Promise.all([refreshProductDirectory(), refreshSupplierDirectory()]);
      pushToast('success', t('common.delete'), `${purchaseReturn.returnNumber} ${t('alerts.deleted')}`);
      return { ok: true };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.deleteFailed'), message);
      return { ok: false, message };
    }
  }

  async function saveSupplierPayment(payment) {
    try {
      const result = await saveSupplierPaymentMutation.mutateAsync(payment);
      await refreshSupplierDirectory();
      pushToast('success', payment.id ? t('supplierPayments.editTitle') : t('supplierPayments.addTitle'), payment.id ? t('alerts.updated') : t('alerts.created'));
      return { ok: true, payment: result.payment };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function deleteSupplierPayment(payment) {
    const { confirmed, reason } = await confirm({
      title: t('supplierPayments.deleteTitle'),
      description: t('supplierPayments.deleteConfirm'),
      confirmLabel: t('common.delete'),
      tone: 'rose',
      requireReason: true,
      reasonLabel: t('common.deleteReasonLabel'),
      reasonPlaceholder: t('common.deleteReasonPlaceholder'),
      consequences: buildConsequences(t, 'supplierPayments.deleteConsequences', ['danger', 'danger', 'warn']),
    });
    if (!confirmed) {
      return { ok: false };
    }

    try {
      await deleteSupplierPaymentMutation.mutateAsync({ id: payment.id, reason });
      await refreshSupplierDirectory();
      pushToast('success', t('common.delete'), t('alerts.deleted'));
      return { ok: true };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.deleteFailed'), message);
      return { ok: false, message };
    }
  }

  async function saveSalesInvoice(invoice) {
    try {
      const result = await saveSalesInvoiceMutation.mutateAsync(invoice);
      await Promise.all([refreshProductDirectory(), refreshRetailCustomerDirectory()]);
      pushToast('success', t('retailer.salesInvoices.addTitle'), `${result.invoice.invoiceNumber} ${t('alerts.created')}`);
      return { ok: true, salesInvoice: result.invoice };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function deleteSalesInvoice(invoice) {
    const confirmMessage = t('retailer.salesInvoices.deleteConfirm', { number: invoice.invoiceNumber });
    const { confirmed, reason } = await confirm({
      title: t('retailer.salesInvoices.deleteTitle'),
      description: interpolateConfirm(confirmMessage, { number: invoice.invoiceNumber }),
      confirmLabel: t('common.delete'),
      tone: 'rose',
      requireReason: true,
      reasonLabel: t('common.deleteReasonLabel'),
      reasonPlaceholder: t('common.deleteReasonPlaceholder'),
      consequences: buildConsequences(t, 'retailer.salesInvoices.deleteConsequences', ['safe', 'danger', 'danger', 'warn']),
    });
    if (!confirmed) {
      return { ok: false };
    }

    try {
      await deleteSalesInvoiceMutation.mutateAsync({ id: invoice.id, reason });
      await Promise.all([refreshProductDirectory(), refreshRetailCustomerDirectory()]);
      pushToast('success', t('common.delete'), `${invoice.invoiceNumber} ${t('alerts.deleted')}`);
      return { ok: true };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.deleteFailed'), message);
      return { ok: false, message };
    }
  }

  async function saveCustomerPayment(payment) {
    try {
      const result = payment.id ? await inventoryApi.updateCustomerPayment(payment) : await inventoryApi.createCustomerPayment(payment);
      await refreshRetailCustomerDirectory();
      pushToast('success', payment.id ? t('retailer.dueCollection.editTitle') : t('retailer.dueCollection.addTitle'), payment.id ? t('alerts.updated') : t('alerts.created'));
      return { ok: true, payment: result.payment };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function deleteCustomerPayment(payment) {
    const { confirmed, reason } = await confirm({
      title: t('retailer.dueCollection.deleteTitle'),
      description: t('retailer.dueCollection.deleteConfirm'),
      confirmLabel: t('common.delete'),
      tone: 'rose',
      requireReason: true,
      reasonLabel: t('common.deleteReasonLabel'),
      reasonPlaceholder: t('common.deleteReasonPlaceholder'),
      consequences: buildConsequences(t, 'retailer.dueCollection.deleteConsequences', ['danger', 'danger', 'warn']),
    });
    if (!confirmed) {
      return { ok: false };
    }

    try {
      await inventoryApi.deleteCustomerPayment(payment.id, reason);
      await refreshRetailCustomerDirectory();
      pushToast('success', t('common.delete'), t('alerts.deleted'));
      return { ok: true };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.deleteFailed'), message);
      return { ok: false, message };
    }
  }

  async function saveSalesReturn(salesReturn) {
    try {
      const result = await saveSalesReturnMutation.mutateAsync(salesReturn);
      await Promise.all([refreshProductDirectory(), refreshRetailCustomerDirectory()]);
      pushToast('success', t('retailer.salesReturn.addTitle'), `${result.salesReturn.returnNumber} ${t('alerts.created')}`);
      return { ok: true, salesReturn: result.salesReturn };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function saveRetailPromotion(promotion) {
    try {
      const result = promotion.id
        ? await inventoryApi.updateRetailPromotion(promotion)
        : await inventoryApi.createRetailPromotion(promotion);
      upsertPromotionDirectory(result.promotion);
      pushToast('success', promotion.id ? t('retailer.promotions.editTitle') : t('retailer.promotions.addTitle'), `${result.promotion.name} ${promotion.id ? t('alerts.updated') : t('alerts.created')}`);
      return { ok: true, promotion: result.promotion };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function deleteRetailPromotion(promotion) {
    const confirmMessage = t('retailer.promotions.deleteConfirm', { name: promotion.name });
    const { confirmed } = await confirm({
      title: t('retailer.promotions.deleteTitle'),
      description: interpolateConfirm(confirmMessage, { name: promotion.name }),
      confirmLabel: t('common.delete'),
      tone: 'rose',
      requireReason: false,
      consequences: buildConsequences(t, 'retailer.promotions.deleteConsequences', ['danger', 'info']),
    });
    if (!confirmed) {
      return { ok: false };
    }

    try {
      await inventoryApi.deleteRetailPromotion(promotion.id);
      removeFromPromotionDirectory(promotion.id);
      pushToast('success', t('common.delete'), `${promotion.name} ${t('alerts.deleted')}`);
      return { ok: true };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.deleteFailed'), message);
      return { ok: false, message };
    }
  }

  async function saveTradePromotionRule(rule) {
    try {
      const result = rule.id
        ? await inventoryApi.updateTradePromotionRule(rule)
        : await inventoryApi.createTradePromotionRule(rule);
      pushToast('success', rule.id ? t('tradePromotions.rules.editTitle') : t('tradePromotions.rules.addTitle'), `${result.name} ${rule.id ? t('alerts.updated') : t('alerts.created')}`);
      return { ok: true, rule: result };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function deleteTradePromotionRule(rule) {
    const confirmMessage = t('tradePromotions.rules.deleteConfirm', { name: rule.name });
    const { confirmed, reason } = await confirm({
      title: t('tradePromotions.rules.deleteTitle'),
      description: interpolateConfirm(confirmMessage, { name: rule.name }),
      confirmLabel: t('common.delete'),
      tone: 'rose',
      requireReason: true,
      reasonLabel: t('common.deleteReasonLabel'),
      reasonPlaceholder: t('common.deleteReasonPlaceholder'),
      consequences: buildConsequences(t, 'tradePromotions.rules.deleteConsequences', ['safe', 'info']),
    });
    if (!confirmed) {
      return { ok: false };
    }

    try {
      await inventoryApi.deleteTradePromotionRule(rule.id, reason);
      pushToast('success', t('common.delete'), `${rule.name} ${t('alerts.deleted')}`);
      return { ok: true };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.deleteFailed'), message);
      return { ok: false, message };
    }
  }

  async function createTradePromotionSettlement(settlement) {
    try {
      const result = await inventoryApi.createTradePromotionSettlement(settlement);
      pushToast('success', t('tradePromotions.settlements.addTitle'), t('alerts.created'));
      return { ok: true, settlement: result };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function deleteTradePromotionSettlement(settlement) {
    const { confirmed, reason } = await confirm({
      title: t('tradePromotions.settlements.voidTitle'),
      description: t('tradePromotions.settlements.voidConfirm'),
      confirmLabel: t('tradePromotions.settlements.void'),
      tone: 'rose',
      requireReason: true,
      reasonLabel: t('common.deleteReasonLabel'),
      reasonPlaceholder: t('common.deleteReasonPlaceholder'),
      consequences: buildConsequences(t, 'tradePromotions.settlements.deleteConsequences', ['danger', 'info']),
    });
    if (!confirmed) {
      return { ok: false };
    }

    try {
      await inventoryApi.deleteTradePromotionSettlement(settlement.id, reason);
      pushToast('success', t('tradePromotions.settlements.void'), t('alerts.deleted'));
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
      consequences: buildConsequences(t, 'trash.permanentDeleteConsequences', ['danger', 'danger', 'warn']),
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

  function restoreShop(shop) {
    return restoreTrashedItem({
      name: shop.shopName,
      restoreFn: () => inventoryApi.restoreCustomer(shop.id),
      onRestored: refreshShopDirectory,
    });
  }

  function permanentlyDeleteShop(shop) {
    return permanentlyDeleteTrashedItem({
      name: shop.shopName,
      deleteFn: () => inventoryApi.permanentlyDeleteCustomer(shop.id),
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

  function restoreSupplier(supplier) {
    return restoreTrashedItem({
      name: supplier.name,
      restoreFn: () => inventoryApi.restoreSupplier(supplier.id),
      onRestored: refreshSupplierDirectory,
    });
  }

  function permanentlyDeleteSupplier(supplier) {
    return permanentlyDeleteTrashedItem({
      name: supplier.name,
      deleteFn: () => inventoryApi.permanentlyDeleteSupplier(supplier.id),
    });
  }

  function restoreTradePromotionRule(rule) {
    return restoreTrashedItem({
      name: rule.name,
      restoreFn: () => inventoryApi.restoreTradePromotionRule(rule.id),
    });
  }

  function permanentlyDeleteTradePromotionRule(rule) {
    return permanentlyDeleteTrashedItem({
      name: rule.name,
      deleteFn: () => inventoryApi.permanentlyDeleteTradePromotionRule(rule.id),
    });
  }

  function restoreTradePromotionSettlement(settlement) {
    return restoreTrashedItem({
      name: settlement.id,
      restoreFn: () => inventoryApi.restoreTradePromotionSettlement(settlement.id),
    });
  }

  function restorePurchaseReceipt(purchaseReceipt) {
    return restoreTrashedItem({
      name: purchaseReceipt.purchaseNumber,
      restoreFn: () => inventoryApi.restorePurchaseReceipt(purchaseReceipt.id),
      onRestored: refreshProductDirectory,
    });
  }

  function restoreSupplierPayment(payment) {
    return restoreTrashedItem({
      name: payment.supplierName || payment.id,
      restoreFn: () => inventoryApi.restoreSupplierPayment(payment.id),
    });
  }

  function restoreSalesInvoice(invoice) {
    return restoreTrashedItem({
      name: invoice.invoiceNumber,
      restoreFn: () => inventoryApi.restoreSalesInvoice(invoice.id),
      onRestored: () => Promise.all([refreshProductDirectory(), refreshRetailCustomerDirectory()]),
    });
  }

  function restoreCustomerPayment(payment) {
    return restoreTrashedItem({
      name: payment.customerName || payment.id,
      restoreFn: () => inventoryApi.restoreCustomerPayment(payment.id),
      onRestored: refreshRetailCustomerDirectory,
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
      const isPlatformUser = !result.user.tenantId;
      setUser({ ...result.user, isPlatformUser });
      setTenant(result.tenant || null);
      setPermissions(result.permissions || []);
      if (isPlatformUser) {
        inventoryApi.listTenants().then((tenantsResult) => {
          setTenantOptions(tenantsResult.tenants || []);
        }).catch(() => {});
      }
      if (!isPlatformUser) {
        await refreshState(result.tenant?.id || result.user.tenantId);
      }
      pushToast('success', t('alerts.loggedIn'), result.user.name);
      return { ok: true };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('auth.loginFailed'), message);
      return { ok: false, message };
    }
  }

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      const sessionResult = await inventoryApi.getCurrentRetailCashSession().catch(() => null);
      const openSession = sessionResult?.session;
      if (openSession?.id) {
        const countedCash = openSession.expectedCash ?? openSession.openingCash ?? 0;
        await inventoryApi.stopRetailCashSession(openSession.id, { countedCash }).catch(() => null);
        try { window.localStorage.removeItem('retail.cashSessionSnapshot'); } catch { /* ignore */ }
      }
    } catch { /* ignore — proceed with logout regardless */ }

    try {
      await inventoryApi.logout();
    } catch (error) {
      if (error.status !== 401) {
        pushToast('error', t('auth.logout'), getFriendlyError(error, t));
      }
    } finally {
      setActiveTenantId('');
      handleUnauthorized();
      setLoggingOut(false);
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

  async function createInstallmentPlan(payload) {
    try {
      const result = await inventoryApi.createInstallmentPlan(payload);
      pushToast('success', t('installments.plans.addTitle'), `${result.plan.planNumber} ${t('alerts.created')}`);
      return { ok: true, ...result };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function collectInstallmentPayment(payload) {
    try {
      const result = await inventoryApi.collectInstallmentPayment(payload);
      pushToast('success', t('installments.payment.title'), `${result.plan.planNumber} ${t('alerts.updated')}`);
      return { ok: true, ...result };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function rescheduleInstallmentPlan(planId, payload) {
    try {
      const plan = await inventoryApi.reschedulePlan(planId, payload);
      pushToast('success', t('installments.detail.reschedule'), `${plan.planNumber} ${t('alerts.updated')}`);
      return { ok: true, plan };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function settleInstallmentPlan(planId, payload) {
    try {
      const plan = await inventoryApi.settlePlan(planId, payload);
      pushToast('success', t('installments.detail.settle'), `${plan.planNumber} ${t('alerts.updated')}`);
      return { ok: true, plan };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function writeOffInstallmentPlan(plan) {
    const { confirmed, reason } = await confirm({
      title: t('installments.detail.writeOffTitle'),
      description: interpolateConfirm(t('installments.detail.writeOffConfirm'), { number: plan.planNumber }),
      confirmLabel: t('installments.detail.writeOff'),
      tone: 'rose',
      requireReason: true,
      reasonLabel: t('common.deleteReasonLabel'),
      reasonPlaceholder: t('common.deleteReasonPlaceholder'),
      consequences: buildConsequences(t, 'installments.detail.writeOffConsequences', ['danger', 'danger', 'info']),
    });
    if (!confirmed) return { ok: false };

    try {
      const updated = await inventoryApi.writeOffPlan(plan.id, { reason });
      pushToast('success', t('installments.detail.writeOff'), `${updated.planNumber} ${t('alerts.updated')}`);
      return { ok: true, plan: updated };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function cancelInstallmentPlan(plan) {
    const { confirmed, reason } = await confirm({
      title: t('installments.detail.cancelTitle'),
      description: interpolateConfirm(t('installments.detail.cancelConfirm'), { number: plan.planNumber }),
      confirmLabel: t('installments.detail.cancel'),
      tone: 'rose',
      requireReason: true,
      reasonLabel: t('common.deleteReasonLabel'),
      reasonPlaceholder: t('common.deleteReasonPlaceholder'),
      consequences: buildConsequences(t, 'installments.detail.cancelConsequences', ['safe', 'danger', 'info']),
    });
    if (!confirmed) return { ok: false };

    try {
      const updated = await inventoryApi.cancelPlan(plan.id, { reason });
      pushToast('success', t('installments.detail.cancel'), `${updated.planNumber} ${t('alerts.updated')}`);
      return { ok: true, plan: updated };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function addInstallmentGuarantor(planId, payload) {
    try {
      const guarantor = await inventoryApi.addInstallmentGuarantor(planId, payload);
      pushToast('success', t('installments.guarantors.add'), guarantor.name);
      return { ok: true, guarantor };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function removeInstallmentGuarantor(planId, guarantor) {
    const { confirmed } = await confirm({
      title: t('installments.guarantors.deleteTitle'),
      description: interpolateConfirm(t('installments.guarantors.deleteConfirm'), { name: guarantor.name }),
      requireReason: false,
    });
    if (!confirmed) return { ok: false };

    try {
      await inventoryApi.removeInstallmentGuarantor(planId, guarantor.id);
      pushToast('success', t('common.delete'), `${guarantor.name} ${t('alerts.deleted')}`);
      return { ok: true };
    } catch (error) {
      pushToast('error', t('alerts.deleteFailed'), getFriendlyError(error, t));
      return { ok: false };
    }
  }

  async function addInstallmentDocument(planId, payload) {
    try {
      const document = await inventoryApi.addInstallmentDocument(planId, payload);
      pushToast('success', t('installments.documents.add'), t(`installments.documents.types.${document.documentType}`));
      return { ok: true, document };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function removeInstallmentDocument(planId, document) {
    const { confirmed } = await confirm({
      title: t('installments.documents.deleteTitle'),
      description: t('installments.documents.deleteConfirm'),
      requireReason: false,
    });
    if (!confirmed) return { ok: false };

    try {
      await inventoryApi.removeInstallmentDocument(planId, document.id);
      pushToast('success', t('common.delete'), t('alerts.deleted'));
      return { ok: true };
    } catch (error) {
      pushToast('error', t('alerts.deleteFailed'), getFriendlyError(error, t));
      return { ok: false };
    }
  }

  async function updateInstallmentCreditSettings(customerId, payload) {
    try {
      const customer = await inventoryApi.updateInstallmentCreditSettings(customerId, payload);
      pushToast('success', t('installments.creditSettings.title'), t('alerts.updated'));
      return { ok: true, customer };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function saveInstallmentLateFeeRule(rule) {
    try {
      const result = await inventoryApi.saveInstallmentLateFeeRule(rule);
      pushToast('success', rule.id ? t('installments.lateFeeRules.editTitle') : t('installments.lateFeeRules.addTitle'), t(rule.id ? 'alerts.updated' : 'alerts.created'));
      return { ok: true, rule: result };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function applyInstallmentLateFee(scheduleId) {
    try {
      const result = await inventoryApi.applyInstallmentLateFee(scheduleId);
      pushToast('success', t('installments.reports.applyLateFee'), t('alerts.updated'));
      return { ok: true, ...result };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function downloadInstallmentAgreementPdf(planId) {
    try {
      const { blob, filename } = await inventoryApi.downloadInstallmentAgreementPdf(planId);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
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
      theme,
      setTheme,
      toggleTheme,
      t,
      can: (permission) => user?.role === 'system_developer' || permissions.includes(permission),
      hasFeature: (feature) =>
        !feature || user?.role === 'system_developer' || !tenant?.features || tenant.features.includes(feature),
      user,
      tenant,
      setTenant,
      tenantOptions,
      switchTenant,
      authLoading,
      productDirectory,
      dsrDirectory,
      srDirectory,
      supplierDirectory,
      shopDirectory,
      retailCustomerDirectory,
      promotionDirectory,
      hasStaleSharedDirectories,
      refreshStaleSharedDirectories,
      loading,
      loadError,
      pushToast,
      confirmation,
      confirm,
      closeConfirmation,
      login,
      logout,
      loggingOut,
      forgotPassword,
      resetPassword,
      saveProduct,
      deleteProduct,
      restoreProduct,
      permanentlyDeleteProduct,
      restoreUser,
      permanentlyDeleteUser,
      addStock,
      setOpeningStock,
      clearDamagedStock,
      saveDsr,
      deleteDsr,
      restoreDsr,
      permanentlyDeleteDsr,
      saveSr,
      deleteSr,
      refreshSrDirectory,
      saveShop,
      deleteShop,
      saveRetailCustomer,
      restoreShop,
      permanentlyDeleteShop,
      restoreExpense,
      permanentlyDeleteExpense,
      saveSupplier,
      deleteSupplier,
      restoreSupplier,
      permanentlyDeleteSupplier,
      saveProductSerial,
      deleteProductSerial,
      saveWarrantyClaim,
      deleteWarrantyClaim,
      saveRepairJob,
      deleteRepairJob,
      saveTradeIn,
      deleteTradeIn,
      saveQuotation,
      deleteQuotation,
      convertQuotation,
      savePurchaseReceipt,
      deletePurchaseReceipt,
      restorePurchaseReceipt,
      savePurchaseReturn,
      deletePurchaseReturn,
      saveSupplierPayment,
      deleteSupplierPayment,
      restoreSupplierPayment,
      saveSalesInvoice,
      deleteSalesInvoice,
      restoreSalesInvoice,
      saveCustomerPayment,
      deleteCustomerPayment,
      restoreCustomerPayment,
      saveSalesReturn,
      saveRetailPromotion,
      deleteRetailPromotion,
      saveTradePromotionRule,
      deleteTradePromotionRule,
      createTradePromotionSettlement,
      deleteTradePromotionSettlement,
      restoreTradePromotionRule,
      permanentlyDeleteTradePromotionRule,
      restoreTradePromotionSettlement,
      saveIssue,
      saveSettlement,
      upsertPromotionDirectory,
      removeFromPromotionDirectory,
      refreshPromotionDirectory,
      updateProfile,
      createInstallmentPlan,
      collectInstallmentPayment,
      rescheduleInstallmentPlan,
      settleInstallmentPlan,
      writeOffInstallmentPlan,
      cancelInstallmentPlan,
      addInstallmentGuarantor,
      removeInstallmentGuarantor,
      addInstallmentDocument,
      removeInstallmentDocument,
      updateInstallmentCreditSettings,
      saveInstallmentLateFeeRule,
      applyInstallmentLateFee,
      downloadInstallmentAgreementPdf,
    }),
    [today, language, theme, t, user, tenant, tenantOptions, permissions, authLoading, productDirectory, dsrDirectory, srDirectory, supplierDirectory, shopDirectory, retailCustomerDirectory, promotionDirectory, loading, loadError, confirmation, loggingOut],
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

