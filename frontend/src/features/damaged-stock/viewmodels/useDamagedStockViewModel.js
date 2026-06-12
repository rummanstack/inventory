import { useState } from 'react';

export function useDamagedStockViewModel({ products }) {
  const damagedProducts = products.filter((product) => product.damagedPieces > 0);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function openClearModal(product) {
    setSelectedProduct(product);
  }

  function closeClearModal() {
    setSelectedProduct(null);
  }

  function onCleared() {
    setSelectedProduct(null);
    setRefreshKey((key) => key + 1);
  }

  return {
    damagedProducts,
    selectedProduct,
    refreshKey,
    openClearModal,
    closeClearModal,
    onCleared,
  };
}
