import { cx } from '../../../components/ui.jsx';
import { formatCasePiece, formatCurrency, formatNumber } from '../../../utils/calculations.js';

export default function ProductsPrintSheet({ products, businessName, printTarget = false, targetId }) {
  return (
    <div id={targetId} className={cx('mx-auto w-full max-w-[210mm] bg-white p-8', printTarget && 'print-target')}>
      <div className="border-b-2 border-slate-950 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">{businessName}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">Products Report</p>
          </div>
          <div className="text-right text-[11px] text-slate-500">
            <p>{products.length} products</p>
          </div>
        </div>
      </div>

      <table className="mt-4 w-full border-collapse text-[9px]">
        <thead>
          <tr className="bg-slate-950 text-white">
            <th className="border border-slate-800 px-1.5 py-1 text-left">#</th>
            <th className="border border-slate-800 px-1.5 py-1 text-left">Product</th>
            <th className="border border-slate-800 px-1.5 py-1 text-left">Category</th>
            <th className="border border-slate-800 px-1.5 py-1 text-right">Purchase</th>
            <th className="border border-slate-800 px-1.5 py-1 text-right">Wholesale</th>
            <th className="border border-slate-800 px-1.5 py-1 text-right">Retail</th>
            <th className="border border-slate-800 px-1.5 py-1 text-right">Stock</th>
            <th className="border border-slate-800 px-1.5 py-1 text-right">Damaged</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product, index) => (
            <tr key={product.id} className={product.stockPieces === 0 ? 'bg-rose-50' : product.stockPieces <= product.piecesPerCase ? 'bg-amber-50' : ''}>
              <td className="border border-slate-200 px-1.5 py-1 text-slate-400 font-bold">{index + 1}</td>
              <td className="border border-slate-200 px-1.5 py-1 font-semibold text-slate-950">{product.name}</td>
              <td className="border border-slate-200 px-1.5 py-1 text-slate-500">{product.category || '-'}</td>
              <td className="border border-slate-200 px-1.5 py-1 text-right">{formatCurrency(product.purchasePrice)}</td>
              <td className="border border-slate-200 px-1.5 py-1 text-right">{formatCurrency(product.wholesalePrice)}</td>
              <td className="border border-slate-200 px-1.5 py-1 text-right">{formatCurrency(product.retailPrice)}</td>
              <td className={`border border-slate-200 px-1.5 py-1 text-right font-bold ${product.stockPieces === 0 ? 'text-rose-700' : product.stockPieces <= product.piecesPerCase ? 'text-amber-700' : 'text-emerald-700'}`}>
                {formatCasePiece(product.stockPieces, product.piecesPerCase)}
              </td>
              <td className="border border-slate-200 px-1.5 py-1 text-right text-rose-600">
                {product.damagedPieces > 0 ? formatNumber(product.damagedPieces) : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex justify-between text-[9px] text-slate-500">
        <span>{products.filter((p) => p.stockPieces === 0).length} out of stock · {products.filter((p) => p.stockPieces > 0 && p.stockPieces <= p.piecesPerCase).length} low stock</span>
        <span>Generated {new Date().toLocaleDateString()}</span>
      </div>
    </div>
  );
}
