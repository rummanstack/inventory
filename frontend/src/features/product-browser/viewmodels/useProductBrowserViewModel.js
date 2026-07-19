import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { usePagedList } from '../../../hooks/usePagedList.js';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue.js';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import {
  fetchBrowseCategories,
  fetchBrowseCategoryAttributes,
  fetchBrowseProducts,
  productBrowserKeys,
} from '../queries/productBrowserQueries.js';
import { setPendingSaleProduct } from '../pendingSaleSelection.js';

const MAX_COMPARE = 4;

export function useProductBrowserViewModel() {
  const { tenant, user, pushToast, t } = useInventoryApp();
  const navigate = useNavigate();
  const tenantId = tenant?.id || user?.tenantId || '';

  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput, 300);
  const [categoryId, setCategoryId] = useState('');
  const [specFilterInputs, setSpecFilterInputs] = useState({});
  const [compareIds, setCompareIds] = useState([]);
  const [detailProductId, setDetailProductId] = useState(null);

  const categoriesQuery = useQuery({
    queryKey: productBrowserKeys.categories(tenantId),
    queryFn: fetchBrowseCategories,
    enabled: Boolean(tenantId),
    staleTime: 5 * 60_000,
  });
  const categoryAttributesQuery = useQuery({
    queryKey: productBrowserKeys.categoryAttributes(tenantId, categoryId),
    queryFn: () => fetchBrowseCategoryAttributes(categoryId),
    enabled: Boolean(tenantId && categoryId),
    staleTime: 60_000,
  });
  const categoryAttributes = categoryAttributesQuery.data || [];

  const specFilters = useMemo(() => {
    const filters = {};
    for (const [key, value] of Object.entries(specFilterInputs)) {
      if (value === '' || value === undefined || value === null) continue;
      filters[key] = value;
    }
    return filters;
  }, [specFilterInputs]);

  const list = usePagedList(
    ({ page, pageSize }) => fetchBrowseProducts({ page, pageSize, search, categoryId, specFilters }),
    [search, categoryId, specFilters],
  );

  function updateSpecFilter(key, value) {
    setSpecFilterInputs((current) => ({ ...current, [key]: value }));
    list.resetPage();
  }

  function selectCategory(nextCategoryId) {
    setCategoryId(nextCategoryId);
    setSpecFilterInputs({});
    list.resetPage();
  }

  function updateSearch(value) {
    setSearchInput(value);
    list.resetPage();
  }

  function toggleCompare(productId) {
    setCompareIds((current) => {
      if (current.includes(productId)) {
        return current.filter((id) => id !== productId);
      }
      if (current.length >= MAX_COMPARE) {
        pushToast('warning', t('productBrowser.compareTitle'), t('productBrowser.maxCompareReached'));
        return current;
      }
      return [...current, productId];
    });
  }

  function clearCompare() {
    setCompareIds([]);
  }

  function addToCurrentSale(productId) {
    setPendingSaleProduct(tenantId, productId);
    navigate('/retailer/quick-sale');
  }

  return {
    categories: categoriesQuery.data || [],
    categoriesLoading: categoriesQuery.isPending,
    categoryAttributes,
    categoryId,
    selectCategory,
    searchInput,
    updateSearch,
    specFilterInputs,
    updateSpecFilter,
    ...list,
    compareIds,
    toggleCompare,
    clearCompare,
    detailProductId,
    openDetail: setDetailProductId,
    closeDetail: () => setDetailProductId(null),
    addToCurrentSale,
  };
}
