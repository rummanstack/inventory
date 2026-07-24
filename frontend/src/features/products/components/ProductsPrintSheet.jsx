import { cx } from '../../../components/ui.jsx';
import { formatCasePiece, formatCurrency, formatDateTime, formatNumber } from '../../../utils/calculations.js';

export default function ProductsPrintSheet({ products, businessName, printTarget = false, targetId, t, language = 'en', isElectronics = false }) {
  return (
    <div id={targetId} className={cx('mx-auto w-full max-w-[210mm] bg-white p-8', printTarget && 'print-target')}>
      <div className="border-b-2 border-slate-950 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">{businessName}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">{t('products.reportTitle')}</p>
          </div>
          <div className="text-right text-[11px] text-slate-500">
            <p>{formatNumber(products.length, language)} {t('products.productsCount')}</p>
          </div>
        </div>
      </div>

      <table className="mt-4 w-full border-collapse text-[9px]">
        <thead>
          <tr className="bg-slate-950 text-white">
            <th className="border border-slate-800 px-1.5 py-1 text-left">#</th>
            <th className="border border-slate-800 px-1.5 py-1 text-left">{t('products.product')}</th>
            <th className="border border-slate-800 px-1.5 py-1 text-left">{t('products.category')}</th>
            <th className="border border-slate-800 px-1.5 py-1 text-right">{t('products.purchasePrice')}</th>
            <th className="border border-slate-800 px-1.5 py-1 text-right">{t('products.wholesalePrice')}</th>
            <th className="border border-slate-800 px-1.5 py-1 text-right">{t('products.retailPrice')}</th>
            <th className="border border-slate-800 px-1.5 py-1 text-right">{t('products.stock')}</th>
            <th className="border border-slate-800 px-1.5 py-1 text-right">{t('products.damaged')}</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product, index) => (
            <tr key={product.id} className={product.stockPieces === 0 ? 'bg-rose-50' : product.stockPieces <= product.piecesPerCase ? 'bg-amber-50' : ''}>
              <td className="border border-slate-200 px-1.5 py-1 font-bold text-slate-400">{index + 1}</td>
              <td className="border border-slate-200 px-1.5 py-1 font-semibold text-slate-950">{product.name}</td>
              <td className="border border-slate-200 px-1.5 py-1 text-slate-500">{product.category || '-'}</td>
              <td className="border border-slate-200 px-1.5 py-1 text-right">{formatCurrency(product.purchasePrice, language)}</td>
              <td className="border border-slate-200 px-1.5 py-1 text-right">{formatCurrency(product.wholesalePrice, language)}</td>
              <td className="border border-slate-200 px-1.5 py-1 text-right">{formatCurrency(product.retailPrice, language)}</td>
              <td className={`border border-slate-200 px-1.5 py-1 text-right font-bold ${product.stockPieces === 0 ? 'text-rose-700' : product.stockPieces <= product.piecesPerCase ? 'text-amber-700' : 'text-emerald-700'}`}>
                {isElectronics ? `${formatNumber(product.stockPieces, language)} ${t('common.pcs')}` : formatCasePiece(product.stockPieces, product.piecesPerCase, language)}
              </td>
              <td className="border border-slate-200 px-1.5 py-1 text-right text-rose-600">
                {product.damagedPieces > 0 ? formatNumber(product.damagedPieces, language) : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex justify-between text-[9px] text-slate-500">
        <span>
          {formatNumber(products.filter((p) => p.stockPieces === 0).length, language)} {t('products.outShort')} · {formatNumber(products.filter((p) => p.stockPieces > 0 && p.stockPieces <= p.piecesPerCase).length, language)} {t('products.lowShort')}
        </span>
        <span>
          {t('products.generatedOn')} {formatDateTime(new Date(), language)}
        </span>
      </div>
    </div>
  );
}
