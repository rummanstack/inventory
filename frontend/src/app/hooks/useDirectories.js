import { useState } from 'react';
import { inventoryApi } from '../../services/inventoryApi';

export function useDirectories() {
  const [productDirectory, setProductDirectory] = useState([]);
  const [dsrDirectory, setDsrDirectory] = useState([]);
  const [supplierDirectory, setSupplierDirectory] = useState([]);
  const [shopDirectory, setShopDirectory] = useState([]);
  const [retailCustomerDirectory, setRetailCustomerDirectory] = useState([]);

  function upsertProductDirectory(product) {
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
    setProductDirectory((current) => current.filter((item) => item.id !== productId));
  }

  function upsertDsrDirectory(dsr) {
    setDsrDirectory((current) => {
      const next = current.some((item) => item.id === dsr.id)
        ? current.map((item) => (item.id === dsr.id ? dsr : item))
        : [...current, dsr];
      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  function removeFromDsrDirectory(dsrId) {
    setDsrDirectory((current) => current.filter((item) => item.id !== dsrId));
  }

  function upsertSupplierDirectory(supplier) {
    setSupplierDirectory((current) => {
      const next = current.some((item) => item.id === supplier.id)
        ? current.map((item) => (item.id === supplier.id ? supplier : item))
        : [...current, supplier];
      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  function removeFromSupplierDirectory(supplierId) {
    setSupplierDirectory((current) => current.filter((item) => item.id !== supplierId));
  }

  async function refreshSupplierDirectory() {
    try {
      const result = await inventoryApi.getActiveSuppliers();
      setSupplierDirectory(result.items || []);
    } catch {
      // Best effort - the directory will catch up on the next full refresh.
    }
  }

  function upsertShopDirectory(shop) {
    setShopDirectory((current) => {
      const next = current.some((item) => item.id === shop.id)
        ? current.map((item) => (item.id === shop.id ? shop : item))
        : [...current, shop];
      return next.sort((a, b) => a.shopName.localeCompare(b.shopName));
    });
  }

  function removeFromShopDirectory(shopId) {
    setShopDirectory((current) => current.filter((item) => item.id !== shopId));
  }

  async function refreshShopDirectory() {
    try {
      const result = await inventoryApi.getActiveCustomers();
      setShopDirectory(result.items || []);
    } catch {
      // Best effort - the directory will catch up on the next full refresh.
    }
  }

  function upsertRetailCustomerDirectory(customer) {
    setRetailCustomerDirectory((current) => {
      const next = current.some((item) => item.id === customer.id)
        ? current.map((item) => (item.id === customer.id ? customer : item))
        : [...current, customer];
      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  function removeFromRetailCustomerDirectory(customerId) {
    setRetailCustomerDirectory((current) => current.filter((item) => item.id !== customerId));
  }

  async function refreshRetailCustomerDirectory() {
    try {
      const result = await inventoryApi.getActiveRetailCustomers();
      setRetailCustomerDirectory(result.items || []);
    } catch {
      // Best effort - the directory will catch up on the next full refresh.
    }
  }

  async function refreshProductDirectory() {
    try {
      const result = await inventoryApi.getProductsDirectory();
      setProductDirectory(result.products || []);
    } catch {
      // Best effort - the directory will catch up on the next full refresh.
    }
  }

  async function refreshDsrDirectory() {
    try {
      const result = await inventoryApi.getDsrsDirectory();
      setDsrDirectory(result.dsrs || []);
    } catch {
      // Best effort - the directory will catch up on the next full refresh.
    }
  }

  function resetDirectories() {
    setProductDirectory([]);
    setDsrDirectory([]);
    setSupplierDirectory([]);
    setShopDirectory([]);
    setRetailCustomerDirectory([]);
  }

  return {
    productDirectory,
    dsrDirectory,
    supplierDirectory,
    shopDirectory,
    retailCustomerDirectory,
    setProductDirectory,
    setDsrDirectory,
    setSupplierDirectory,
    setShopDirectory,
    setRetailCustomerDirectory,
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
    refreshProductDirectory,
    refreshDsrDirectory,
    refreshSupplierDirectory,
    refreshShopDirectory,
    refreshRetailCustomerDirectory,
    resetDirectories,
  };
}
