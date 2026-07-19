import { useQueries } from '@tanstack/react-query';
import { ShoppingCart, Trash2 } from 'lucide-react';
import { Modal, TableSkeleton } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency } from '../../../utils/calculations.js';
import { fetchBrowseCategoryAttributes, fetchBrowseProduct, productBrowserKeys } from '../queries/productBrowserQueries.js';

export default function ComparisonModal({ productIds, tenantId, onClose, onRemove, onAddToSale }) {
  const { t, language } = useInventoryApp();

  const productQueries = useQueries({
    queries: productIds.map((productId) => ({
      queryKey: productBrowserKeys.product(tenantId, productId),
      queryFn: () => fetchBrowseProduct(productId),
    })),
  });
  const loading = productQueries.some((query) => query.isPending);
  const products = productQueries.map((query) => query.data).filter(Boolean);
  const categoryIds = [...new Set(products.map((product) => product.categoryId).filter(Boolean))];

  const attributeQueries = useQueries({
    queries: categoryIds.map((categoryId) => ({
      queryKey: productBrowserKeys.categoryAttributes(tenantId, categoryId),
      queryFn: () => fetchBrowseCategoryAttributes(categoryId),
    })),
  });
  const attributesByKey = new Map();
  for (const query of attributeQueries) {
    for (const attribute of query.data || []) {
      if (!attributesByKey.has(attribute.key)) attributesByKey.set(attribute.key, attribute);
    }
  }
  const attributes = [...attributesByKey.values()].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <Modal title={t('productBrowser.comparisonTitle')} onClose={onClose} width="max-w-4xl">
      {loading ? (
        <TableSkeleton columns={productIds.length} rows={5} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="table-head text-left">{t('productBrowser.spec')}</th>
                {products.map((product) => (
                  <th key={product.id} className="table-head min-w-[160px] text-left">
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                        {product.images?.[0] ? <img src={product.images[0]} alt="" className="h-full w-full object-cover" /> : null}
                      </div>
                      <span className="font-semibold text-slate-950">{product.name}</span>
                      <button type="button" className="icon-btn ml-auto" title={t('common.delete')} onClick={() => onRemove(product.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-100">
                <td className="table-cell font-medium text-slate-500">{t('products.retailPrice')}</td>
                {products.map((product) => (
                  <td key={product.id} className="table-cell font-bold text-slate-950">{formatCurrency(product.retailPrice, language)}</td>
                ))}
              </tr>
              <tr className="border-t border-slate-100">
                <td className="table-cell font-medium text-slate-500">{t('products.brand')}</td>
                {products.map((product) => (
                  <td key={product.id} className="table-cell">{product.brand || '—'}{product.model ? ` · ${product.model}` : ''}</td>
                ))}
              </tr>
              {attributes.map((attribute) => (
                <tr key={attribute.key} className="border-t border-slate-100">
                  <td className="table-cell font-medium text-slate-500">{attribute.label}</td>
                  {products.map((product) => {
                    const value = product.specs?.[attribute.key];
                    return (
                      <td key={product.id} className="table-cell">
                        {value === undefined || value === null || value === '' ? '—' : `${value}${attribute.unit ? ` ${attribute.unit}` : ''}`}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="border-t border-slate-100">
                <td className="table-cell" />
                {products.map((product) => (
                  <td key={product.id} className="table-cell">
                    <button
                      type="button"
                      className="btn-primary w-full justify-center"
                      onClick={() => onAddToSale(product.id)}
                      disabled={!product.inStock}
                    >
                      <ShoppingCart size={16} />
                      {t('productBrowser.addToSale')}
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
