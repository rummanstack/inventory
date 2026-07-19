import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Scale, ShoppingCart } from 'lucide-react';
import { Badge, Modal, TableSkeleton } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency } from '../../../utils/calculations.js';
import { fetchBrowseCategoryAttributes, fetchBrowseProduct, productBrowserKeys } from '../queries/productBrowserQueries.js';

export default function ProductDetailModal({ productId, tenantId, compared, onClose, onToggleCompare, onAddToSale }) {
  const { t, language } = useInventoryApp();
  const [activeImage, setActiveImage] = useState(0);

  const productQuery = useQuery({
    queryKey: productBrowserKeys.product(tenantId, productId),
    queryFn: () => fetchBrowseProduct(productId),
    enabled: Boolean(productId),
  });
  const product = productQuery.data;

  const attributesQuery = useQuery({
    queryKey: productBrowserKeys.categoryAttributes(tenantId, product?.categoryId),
    queryFn: () => fetchBrowseCategoryAttributes(product?.categoryId),
    enabled: Boolean(product?.categoryId),
  });
  const attributes = attributesQuery.data || [];

  return (
    <Modal title={product?.name || t('productBrowser.title')} onClose={onClose} width="max-w-3xl">
      {productQuery.isPending || !product ? (
        <TableSkeleton columns={1} rows={5} showHeader={false} />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <div className="aspect-square w-full overflow-hidden rounded-2xl bg-slate-100">
              {product.images?.length ? (
                <img src={product.images[activeImage] || product.images[0]} alt={product.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-medium text-slate-400">
                  {t('products.noImage')}
                </div>
              )}
            </div>
            {product.images?.length > 1 ? (
              <div className="mt-2 flex gap-2 overflow-x-auto">
                {product.images.map((url, index) => (
                  <button
                    key={url + index}
                    type="button"
                    className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 ${index === activeImage ? 'border-brand' : 'border-transparent'}`}
                    onClick={() => setActiveImage(index)}
                  >
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-3">
            {product.category ? <Badge tone="slate">{product.category}</Badge> : null}
            {product.brand ? <p className="text-sm text-slate-500">{product.brand}{product.model ? ` · ${product.model}` : ''}</p> : null}
            <p className="text-2xl font-bold text-slate-950">{formatCurrency(product.retailPrice, language)}</p>
            <Badge tone={product.inStock ? 'emerald' : 'rose'}>
              {product.inStock ? t('productBrowser.inStock') : t('productBrowser.outOfStock')}
            </Badge>
            {product.warrantyMonths > 0 ? (
              <p className="text-sm text-slate-600">{t('productBrowser.warrantyMonths').replace('{count}', product.warrantyMonths)}</p>
            ) : null}
            {product.description ? <p className="text-sm text-slate-600">{product.description}</p> : null}

            {attributes.length > 0 ? (
              <div className="mt-2 rounded-2xl border border-slate-200">
                <table className="w-full text-sm">
                  <tbody>
                    {attributes.map((attribute) => {
                      const value = product.specs?.[attribute.key];
                      if (value === undefined || value === null || value === '') return null;
                      return (
                        <tr key={attribute.id} className="border-b border-slate-100 last:border-0">
                          <td className="px-3 py-2 font-medium text-slate-500">{attribute.label}</td>
                          <td className="px-3 py-2 text-right text-slate-900">{String(value)}{attribute.unit ? ` ${attribute.unit}` : ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}

            <div className="mt-auto flex gap-2 pt-3">
              <button
                type="button"
                className={`icon-btn ${compared ? 'bg-brand-soft text-brand' : ''}`}
                title={t('productBrowser.addToCompare')}
                onClick={() => onToggleCompare(product.id)}
              >
                <Scale size={18} />
              </button>
              <button
                type="button"
                className="btn-primary flex-1 justify-center"
                onClick={() => onAddToSale(product.id)}
                disabled={!product.inStock}
              >
                <ShoppingCart size={18} />
                {t('productBrowser.addToSale')}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
