import { Scale, ShoppingCart } from 'lucide-react';
import { Badge } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency } from '../../../utils/calculations.js';

export default function ProductBrowserCard({ product, compared, onOpenDetail, onToggleCompare, onAddToSale }) {
  const { t, language } = useInventoryApp();
  const coverImage = product.images?.[0];

  return (
    <div className="group surface flex h-full flex-col overflow-hidden transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <button type="button" className="block aspect-[4/3] w-full border-b border-slate-100 bg-slate-50 p-3" onClick={() => onOpenDetail(product.id)}>
        {coverImage ? (
          <img src={coverImage} alt={product.name} className="h-full w-full object-contain transition duration-200 group-hover:scale-[1.03]" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs font-medium text-slate-400">
            {t('products.noImage')}
          </div>
        )}
      </button>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div>
          {product.category ? <Badge tone="slate">{product.category}</Badge> : null}
          <button type="button" className="mt-1 line-clamp-2 min-h-10 text-left text-sm font-semibold leading-5 text-slate-950 hover:text-brand" onClick={() => onOpenDetail(product.id)}>
            {product.name}
          </button>
          {product.brand ? <p className="truncate text-xs text-slate-500">{product.brand}{product.model ? ` · ${product.model}` : ''}</p> : null}
        </div>
        <div className="mt-auto flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-base font-bold text-slate-950">{formatCurrency(product.retailPrice, language)}</p>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${product.inStock ? 'bg-success-soft text-success-strong ring-success-line' : 'bg-danger-soft text-danger-strong ring-danger-line'}`}>
            {product.inStock ? t('productBrowser.inStock') : t('productBrowser.outOfStock')}
          </span>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            className={`icon-btn h-10 w-10 shrink-0 ${compared ? 'bg-brand-soft text-brand' : ''}`}
            title={t('productBrowser.addToCompare')}
            onClick={() => onToggleCompare(product.id)}
          >
            <Scale size={16} />
          </button>
          <button
            type="button"
            className="btn-primary min-w-0 flex-1 justify-center px-2 text-xs"
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
