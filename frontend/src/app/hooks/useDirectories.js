import { useState } from 'react';
import { inventoryApi } from '../../services/inventoryApi';

export function useDirectories() {
  const [productDirectory, setProductDirectory] = useState([]);
  const [dsrDirectory, setDsrDirectory] = useState([]);

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
  }

  return {
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
  };
}
