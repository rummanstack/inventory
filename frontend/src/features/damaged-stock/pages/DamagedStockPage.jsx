import { PackageX } from 'lucide-react';
import { EmptyState, SectionHeader } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCasePiece, formatNumber } from '../../../utils/calculations.js';
import StockLedgerPanel from '../../products/components/StockLedgerPanel';
import ClearDamageModal from '../components/ClearDamageModal';
import { useDamagedStockViewModel } from '../viewmodels/useDamagedStockViewModel';

export default function DamagedStockPage() {
  const { productDirectory, clearDamagedStock, t, can } = useInventoryApp();
  const vm = useDamagedStockViewModel({ products: productDirectory });
  const canManageProducts = can('manage_products');

  return (
    <div>
      <SectionHeader eyebrow={t('damagedStock.eyebrow')} title={t('damagedStock.title')} description={t('damagedStock.description')} />

      <div className="surface overflow-hidden">
        {vm.damagedProducts.length ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">{t('damagedStock.product')}</th>
                  <th className="px-4 py-3">{t('damagedStock.category')}</th>
                  <th className="px-4 py-3">{t('damagedStock.damagedQty')}</th>
                  <th className="px-4 py-3 text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vm.damagedProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50">
                    <td className="table-cell font-semibold text-slate-950">{product.name}</td>
                    <td className="table-cell text-slate-500">{product.category}</td>
                    <td className="table-cell">
                      <p className="font-semibold text-rose-600">{formatCasePiece(product.damagedPieces, product.piecesPerCase)}</p>
                      <p className="text-xs text-slate-500">{formatNumber(product.damagedPieces)} {t('common.pcs')}</p>
                    </td>
                    <td className="table-cell text-right">
                      {canManageProducts ? (
                        <button type="button" className="btn-secondary h-9 px-3" onClick={() => vm.openClearModal(product)}>
                          <PackageX size={16} />
                          {t('damagedStock.clearButton')}
                        </button>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-5">
            <EmptyState title={t('damagedStock.emptyTitle')} description={t('damagedStock.emptyDescription')} icon={PackageX} />
          </div>
        )}
      </div>

      <StockLedgerPanel products={productDirectory} t={t} refreshKey={vm.refreshKey} fixedType="DAMAGE_CLEAR" />

      {vm.selectedProduct ? (
        <ClearDamageModal
          product={vm.selectedProduct}
          onClose={vm.closeClearModal}
          onSave={async (productId, quantity, note) => {
            const result = await clearDamagedStock(productId, quantity, note);
            if (result.ok) {
              vm.onCleared();
            }
            return result;
          }}
        />
      ) : null}
    </div>
  );
}
