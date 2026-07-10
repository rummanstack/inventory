import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../../services/inventoryApi';
import { usePagedList } from '../../../../hooks/usePagedList';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';

const SEARCH_DEBOUNCE_MS = 300;

export function useTradePromotionRulesViewModel() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);
  const [supplierId, setSupplierId] = useState('');
  const [targetType, setTargetType] = useState('');
  const [active, setActive] = useState('');

  const list = usePagedList(
    ({ page, pageSize }) => inventoryApi.listTradePromotionRules({
      page,
      pageSize,
      search: debouncedSearch || undefined,
      supplierId: supplierId || undefined,
      targetType: targetType || undefined,
      active: active || undefined,
    }),
    [debouncedSearch, supplierId, targetType, active],
  );

  useEffect(() => {
    list.resetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, supplierId, targetType, active]);

  return {
    search,
    setSearch,
    supplierId,
    setSupplierId,
    targetType,
    setTargetType,
    active,
    setActive,
    ...list,
  };
}
