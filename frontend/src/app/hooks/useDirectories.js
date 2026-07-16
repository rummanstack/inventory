import { useState } from 'react';
import { inventoryApi } from '../../services/inventoryApi';
import { SHARED_DATA_DOMAINS as D } from '../../services/sharedDataInvalidation.js';

export function useDirectories({ onDirectoryFresh } = {}) {
  const [productDirectory, setProductDirectory] = useState([]);
  const [dsrDirectory, setDsrDirectory] = useState([]);
  const [srDirectory, setSrDirectory] = useState([]);
  const [supplierDirectory, setSupplierDirectory] = useState([]);
  const [shopDirectory, setShopDirectory] = useState([]);
  const [retailCustomerDirectory, setRetailCustomerDirectory] = useState([]);
  const [promotionDirectory, setPromotionDirectory] = useState([]);

  function upsertProductDirectory(product) {
    onDirectoryFresh?.(D.PRODUCTS);
    setProductDirectory((current) => {
      const next = current.some((item) => item.id === product.id)
        ? current.map((item) => (item.id === product.id ? product : item))
        : [...current, product];
      return next.sort((a, b) => {
        const aOrder = a.orderIndex ?? 9999;
        const bOrder = b.orderIndex ?? 9999;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.name.localeCompare(b.name);
      });
    });
  }

  function removeFromProductDirectory(productId) {
    onDirectoryFresh?.(D.PRODUCTS);
    setProductDirectory((current) => current.filter((item) => item.id !== productId));
  }

  function upsertDsrDirectory(dsr) {
    onDirectoryFresh?.(D.DSRS);
    setDsrDirectory((current) => {
      const next = current.some((item) => item.id === dsr.id)
        ? current.map((item) => (item.id === dsr.id ? dsr : item))
        : [...current, dsr];
      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  function removeFromDsrDirectory(dsrId) {
    onDirectoryFresh?.(D.DSRS);
    setDsrDirectory((current) => current.filter((item) => item.id !== dsrId));
  }

  function upsertSrDirectory(sr) {
    onDirectoryFresh?.(D.SRS);
    setSrDirectory((current) => {
      const next = current.some((item) => item.id === sr.id)
        ? current.map((item) => (item.id === sr.id ? sr : item))
        : [...current, sr];
      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  function removeFromSrDirectory(srId) {
    onDirectoryFresh?.(D.SRS);
    setSrDirectory((current) => current.filter((item) => item.id !== srId));
  }

  async function refreshSrDirectory() {
    try {
      const result = await inventoryApi.getSrsDirectory();
      setSrDirectory(result.srs || []);
      onDirectoryFresh?.(D.SRS);
      return true;
    } catch {
      // Best effort - the directory will catch up on the next full refresh.
      return false;
    }
  }

  function upsertSupplierDirectory(supplier) {
    onDirectoryFresh?.(D.SUPPLIERS);
    setSupplierDirectory((current) => {
      const next = current.some((item) => item.id === supplier.id)
        ? current.map((item) => (item.id === supplier.id ? supplier : item))
        : [...current, supplier];
      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  function removeFromSupplierDirectory(supplierId) {
    onDirectoryFresh?.(D.SUPPLIERS);
    setSupplierDirectory((current) => current.filter((item) => item.id !== supplierId));
  }

  async function refreshSupplierDirectory() {
    try {
      const result = await inventoryApi.getActiveSuppliers();
      setSupplierDirectory(result.items || []);
      onDirectoryFresh?.(D.SUPPLIERS);
      return true;
    } catch {
      // Best effort - the directory will catch up on the next full refresh.
      return false;
    }
  }

  function upsertShopDirectory(shop) {
    onDirectoryFresh?.(D.SHOPS);
    setShopDirectory((current) => {
      const next = current.some((item) => item.id === shop.id)
        ? current.map((item) => (item.id === shop.id ? shop : item))
        : [...current, shop];
      return next.sort((a, b) => a.shopName.localeCompare(b.shopName));
    });
  }

  function removeFromShopDirectory(shopId) {
    onDirectoryFresh?.(D.SHOPS);
    setShopDirectory((current) => current.filter((item) => item.id !== shopId));
  }

  async function refreshShopDirectory() {
    try {
      const result = await inventoryApi.getActiveCustomers();
      setShopDirectory(result.items || []);
      onDirectoryFresh?.(D.SHOPS);
      return true;
    } catch {
      // Best effort - the directory will catch up on the next full refresh.
      return false;
    }
  }

  function upsertRetailCustomerDirectory(customer) {
    onDirectoryFresh?.(D.RETAIL_CUSTOMERS);
    setRetailCustomerDirectory((current) => {
      const next = current.some((item) => item.id === customer.id)
        ? current.map((item) => (item.id === customer.id ? customer : item))
        : [...current, customer];
      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  function removeFromRetailCustomerDirectory(customerId) {
    onDirectoryFresh?.(D.RETAIL_CUSTOMERS);
    setRetailCustomerDirectory((current) => current.filter((item) => item.id !== customerId));
  }

  async function refreshRetailCustomerDirectory() {
    try {
      const result = await inventoryApi.getActiveRetailCustomers();
      setRetailCustomerDirectory(result.items || []);
      onDirectoryFresh?.(D.RETAIL_CUSTOMERS);
      return true;
    } catch {
      // Best effort - the directory will catch up on the next full refresh.
      return false;
    }
  }

  function upsertPromotionDirectory(promotion) {
    onDirectoryFresh?.(D.PROMOTIONS);
    setPromotionDirectory((current) => {
      const next = current.some((item) => item.id === promotion.id)
        ? current.map((item) => (item.id === promotion.id ? promotion : item))
        : [...current, promotion];
      return next.sort((a, b) => {
        const priorityDiff = Number(a.priority || 0) - Number(b.priority || 0);
        if (priorityDiff !== 0) return priorityDiff;
        return String(a.name || '').localeCompare(String(b.name || ''));
      });
    });
  }

  function removeFromPromotionDirectory(promotionId) {
    onDirectoryFresh?.(D.PROMOTIONS);
    setPromotionDirectory((current) => current.filter((item) => item.id !== promotionId));
  }

  async function refreshPromotionDirectory() {
    try {
      const result = await inventoryApi.listRetailPromotions();
      setPromotionDirectory(result.promotions || []);
      onDirectoryFresh?.(D.PROMOTIONS);
      return true;
    } catch {
      // Best effort - the directory will catch up on the next full refresh.
      return false;
    }
  }

  async function refreshProductDirectory() {
    try {
      const result = await inventoryApi.getProductsDirectory();
      setProductDirectory(result.products || []);
      onDirectoryFresh?.(D.PRODUCTS);
      return true;
    } catch {
      // Best effort - the directory will catch up on the next full refresh.
      return false;
    }
  }

  async function refreshDsrDirectory() {
    try {
      const result = await inventoryApi.getDsrsDirectory();
      setDsrDirectory(result.dsrs || []);
      onDirectoryFresh?.(D.DSRS);
      return true;
    } catch {
      // Best effort - the directory will catch up on the next full refresh.
      return false;
    }
  }

  function resetDirectories() {
    setProductDirectory([]);
    setDsrDirectory([]);
    setSrDirectory([]);
    setSupplierDirectory([]);
    setShopDirectory([]);
    setRetailCustomerDirectory([]);
    setPromotionDirectory([]);
  }

  return {
    productDirectory,
    dsrDirectory,
    srDirectory,
    supplierDirectory,
    shopDirectory,
    retailCustomerDirectory,
    promotionDirectory,
    setProductDirectory,
    setDsrDirectory,
    setSrDirectory,
    setSupplierDirectory,
    setShopDirectory,
    setRetailCustomerDirectory,
    setPromotionDirectory,
    upsertProductDirectory,
    removeFromProductDirectory,
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
    refreshProductDirectory,
    refreshDsrDirectory,
    refreshSrDirectory,
    refreshSupplierDirectory,
    refreshShopDirectory,
    refreshRetailCustomerDirectory,
    refreshPromotionDirectory,
    resetDirectories,
  };
}
