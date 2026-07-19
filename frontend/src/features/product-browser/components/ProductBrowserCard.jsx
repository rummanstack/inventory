import { Scale, ShoppingCart } from 'lucide-react';
import { Badge } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency } from '../../../utils/calculations.js';

export default function ProductBrowserCard({ product, compared, onOpenDetail, onToggleCompare, onAddToSale }) {
  const { t, language } = useInventoryApp();
  const coverImage = product.images?.[0];

  return (
    <div className="surface flex flex-col overflow-hidden">
      <button type="button" className="block aspect-square w-full bg-slate-100" onClick={() => onOpenDetail(product.id)}>
        {coverImage ? (
          <img src={coverImage} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs font-medium text-slate-400">
            {t('products.noImage')}
          </div>
        )}
      </button>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div>
          {product.category ? <Badge tone="slate">{product.category}</Badge> : null}
          <button type="button" className="mt-1 block text-left text-sm font-semibold text-slate-950 hover:text-brand" onClick={() => onOpenDetail(product.id)}>
            {product.name}
          </button>
          {product.brand ? <p className="text-xs text-slate-500">{product.brand}{product.model ? ` · ${product.model}` : ''}</p> : null}
        </div>
        <p className="mt-auto text-base font-bold text-slate-950">{formatCurrency(product.retailPrice, language)}</p>
        <Badge tone={product.inStock ? 'emerald' : 'rose'}>
          {product.inStock ? t('productBrowser.inStock') : t('productBrowser.outOfStock')}
        </Badge>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            className={`icon-btn flex-1 ${compared ? 'bg-brand-soft text-brand' : ''}`}
            title={t('productBrowser.addToCompare')}
            onClick={() => onToggleCompare(product.id)}
          >
            <Scale size={16} />
          </button>
          <button
            type="button"
            className="btn-primary flex-[2] justify-center"
            onClick={() => onAddToSale(product.id)}
            disabled={!product.inStock}
          >
            <ShoppingCart size={16} />
            {t('productBrowser.addToSale')}
          </button>
        </div>
      </div>
    </div>
  );
}
