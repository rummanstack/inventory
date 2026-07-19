import { Search } from 'lucide-react';
import { EmptyState, Pagination, SectionHeader } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { useProductBrowserViewModel } from '../viewmodels/useProductBrowserViewModel.js';
import ProductBrowserCard from '../components/ProductBrowserCard.jsx';
import ProductDetailModal from '../components/ProductDetailModal.jsx';
import ComparisonTray from '../components/ComparisonTray.jsx';

export default function ProductBrowserPage() {
  const { t, tenant, user } = useInventoryApp();
  const tenantId = tenant?.id || user?.tenantId || '';
  const vm = useProductBrowserViewModel();

  return (
    <div className="pb-24">
      <SectionHeader
        eyebrow={t('navGroups.pos')}
        title={t('productBrowser.title')}
        description={t('productBrowser.description')}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            value={vm.searchInput}
            onChange={(event) => vm.updateSearch(event.target.value)}
            placeholder={t('productBrowser.searchPlaceholder')}
          />
        </div>
        <select className="input sm:w-56" value={vm.categoryId} onChange={(event) => vm.selectCategory(event.target.value)}>
          <option value="">{t('categories.allCategories')}</option>
          {vm.categories.map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
      </div>

      {vm.categoryAttributes.length > 0 ? (
        <div className="surface mb-4 flex flex-wrap gap-3 p-3">
          {vm.categoryAttributes
            .filter((attribute) => attribute.dataType !== 'boolean')
            .map((attribute) => (
              <div key={attribute.id} className="min-w-[140px]">
                <label className="label">{attribute.label}{attribute.unit ? ` (${attribute.unit})` : ''}</label>
                {attribute.dataType === 'select' ? (
                  <select
                    className="input"
                    value={vm.specFilterInputs[attribute.key] || ''}
                    onChange={(event) => vm.updateSpecFilter(attribute.key, event.target.value)}
                  >
                    <option value="">{t('common.all')}</option>
                    {(attribute.options || []).map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                ) : attribute.dataType === 'number' ? (
                  <div className="flex gap-1">
                    <input
                      className="input"
                      type="number"
                      placeholder={t('productBrowser.min')}
                      value={vm.specFilterInputs[`${attribute.key}_min`] || ''}
                      onChange={(event) => vm.updateSpecFilter(`${attribute.key}_min`, event.target.value)}
                    />
                    <input
                      className="input"
                      type="number"
                      placeholder={t('productBrowser.max')}
                      value={vm.specFilterInputs[`${attribute.key}_max`] || ''}
                      onChange={(event) => vm.updateSpecFilter(`${attribute.key}_max`, event.target.value)}
                    />
                  </div>
                ) : (
                  <input
                    className="input"
                    value={vm.specFilterInputs[attribute.key] || ''}
                    onChange={(event) => vm.updateSpecFilter(attribute.key, event.target.value)}
                  />
                )}
              </div>
            ))}
        </div>
      ) : null}

      {vm.loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="surface aspect-[3/4] animate-pulse bg-slate-100" />
          ))}
        </div>
      ) : vm.items.length === 0 ? (
        <EmptyState title={t('productBrowser.noneTitle')} description={t('productBrowser.noneDescription')} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {vm.items.map((product) => (
              <ProductBrowserCard
                key={product.id}
                product={product}
                compared={vm.compareIds.includes(product.id)}
                onOpenDetail={vm.openDetail}
                onToggleCompare={vm.toggleCompare}
                onAddToSale={vm.addToCurrentSale}
              />
            ))}
          </div>
          <Pagination page={vm.page} totalPages={vm.totalPages} onPageChange={vm.setPage} className="mt-4" />
        </>
      )}

      {vm.detailProductId ? (
        <ProductDetailModal
          productId={vm.detailProductId}
          tenantId={tenantId}
          compared={vm.compareIds.includes(vm.detailProductId)}
          onClose={vm.closeDetail}
          onToggleCompare={vm.toggleCompare}
          onAddToSale={vm.addToCurrentSale}
        />
      ) : null}

      <ComparisonTray
        compareIds={vm.compareIds}
        tenantId={tenantId}
        onRemove={vm.toggleCompare}
        onClear={vm.clearCompare}
        onAddToSale={vm.addToCurrentSale}
      />
    </div>
  );
}
