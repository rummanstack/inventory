import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { inventoryApi } from '../services/inventoryApi';
import { getActiveTenantId, setActiveTenantId } from '../services/api/client.js';
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
    supplierDirectory,
    shopDirectory,
    retailCustomerDirectory,
    promotionDirectory,
    setProductDirectory,
    setDsrDirectory,
    setSupplierDirectory,
    setShopDirectory,
    setRetailCustomerDirectory,
    setPromotionDirectory,
    upsertProductDirectory,
    removeFromProductDirectory,
    upsertDsrDirectory,
    removeFromDsrDirectory,
    upsertSupplierDirectory,
    removeFromSupplierDirectory,
    upsertShopDirectory,
    removeFromShopDirectory,
    upsertRetailCustomerDirectory,
    removeFromRetailCustomerDirectory,
    upsertPromotionDirectory,
    removeFromPromotionDirectory,
    refreshProductDirectory,
    refreshDsrDirectory,
    refreshSupplierDirectory,
    refreshShopDirectory,
    refreshRetailCustomerDirectory,
    refreshPromotionDirectory,
    resetDirectories,
  } = useDirectories();
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [tenantOptions, setTenantOptions] = useState([]);

  function handleUnauthorized() {
    setUser(null);
    setTenant(null);
    setPermissions([]);
    setTenantOptions([]);
    resetDirectories();
    setLoadError('');
    setLoading(false);
  }

  async function switchTenant(tenantId) {
    setActiveTenantId(tenantId || '');
    try {
      const result = await inventoryApi.getCurrentUser();
      setUser(result.user);
      setTenant(result.tenant || null);
      setPermissions(result.permissions || []);
      await refreshState();
      pushToast('success', t('organizations.switchedOrg'), result.tenant?.name || t('organizations.noOrgSelected'));
      return { ok: true };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function refreshState() {
    try {
      setLoading(true);
      setLoadError('');
      const [productsResult, dsrsResult, suppliersResult, customersResult, retailCustomersResult, promotionsResult] = await Promise.all([
        inventoryApi.getProductsDirectory(),
        inventoryApi.getDsrsDirectory(),
        inventoryApi.getActiveSuppliers(),
        inventoryApi.getActiveCustomers(),
        inventoryApi.getActiveRetailCustomers(),
        inventoryApi.listRetailPromotions(),
      ]);
      setProductDirectory(productsResult.products || []);
      setDsrDirectory(dsrsResult.dsrs || []);
      setSupplierDirectory(suppliersResult.items || []);
      setShopDirectory(customersResult.items || []);
      setRetailCustomerDirectory(retailCustomersResult.items || []);
      setPromotionDirectory(promotionsResult.promotions || []);
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

        if (result.user.isPlatformUser) {
          inventoryApi.listTenants().then((tenantsResult) => {
            if (!cancelled) {
              setTenantOptions(tenantsResult.tenants || []);
            }
          }).catch(() => {});
        }

        if (!result.user.isPlatformUser) {
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
      const result = product.id ? await inventoryApi.updateProduct(product) : await inventoryApi.createProduct(product);
      upsertProductDirectory(result.product);
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

  async function setOpeningStock(productId, quantity, note) {
    try {
      const result = await inventoryApi.setOpeningStock(productId, quantity, note);
      upsertProductDirectory(result.product);
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

  async function savePurchaseReceipt(purchaseReceipt) {
    try {
      const result = purchaseReceipt.id ? await inventoryApi.updatePurchaseReceipt(purchaseReceipt) : await inventoryApi.createPurchaseReceipt(purchaseReceipt);
      await refreshProductDirectory();
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
    });
    if (!confirmed) {
      return { ok: false };
    }

    try {
      await inventoryApi.deletePurchaseReceipt(purchaseReceipt.id, reason);
      await refreshProductDirectory();
      pushToast('success', t('common.delete'), `${purchaseReceipt.purchaseNumber} ${t('alerts.deleted')}`);
      return { ok: true };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.deleteFailed'), message);
      return { ok: false, message };
    }
  }

  async function saveSupplierPayment(payment) {
    try {
      const result = payment.id ? await inventoryApi.updateSupplierPayment(payment) : await inventoryApi.createSupplierPayment(payment);
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
    });
    if (!confirmed) {
      return { ok: false };
    }

    try {
      await inventoryApi.deleteSupplierPayment(payment.id, reason);
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
      const result = await inventoryApi.createSalesInvoice(invoice);
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
    });
    if (!confirmed) {
      return { ok: false };
    }

    try {
      await inventoryApi.deleteSalesInvoice(invoice.id, reason);
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
      const result = await inventoryApi.createSalesReturn(salesReturn);
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
        await refreshState();
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
    try {
      await inventoryApi.logout();
    } catch (error) {
      if (error.status !== 401) {
        pushToast('error', t('auth.logout'), getFriendlyError(error, t));
      }
    } finally {
      setActiveTenantId('');
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
        !feature || user?.role === 'system_developer' || !tenant?.features || tenant.features.includes(feature),
      user,
      tenant,
      setTenant,
      tenantOptions,
      switchTenant,
      authLoading,
      productDirectory,
      dsrDirectory,
      supplierDirectory,
      shopDirectory,
      retailCustomerDirectory,
      promotionDirectory,
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
      setOpeningStock,
      clearDamagedStock,
      saveDsr,
      deleteDsr,
      restoreDsr,
      permanentlyDeleteDsr,
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
      savePurchaseReceipt,
      deletePurchaseReceipt,
      restorePurchaseReceipt,
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
      saveIssue,
      saveSettlement,
      upsertPromotionDirectory,
      removeFromPromotionDirectory,
      refreshPromotionDirectory,
      updateProfile,
    }),
    [today, language, t, user, tenant, tenantOptions, permissions, authLoading, productDirectory, dsrDirectory, supplierDirectory, shopDirectory, retailCustomerDirectory, promotionDirectory, loading, loadError, toasts, confirmation],
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
