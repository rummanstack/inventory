import { Download, FileSpreadsheet, PackageX, Printer } from 'lucide-react';
import { EmptyState, SectionHeader } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { downloadSheetPdf } from '../../../services/printService.js';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { formatCasePiece, formatNumber } from '../../../utils/calculations.js';
import ClearDamageModal from '../components/ClearDamageModal';
import DamageClearHistoryPanel from '../components/DamageClearHistoryPanel';
import { useDamagedStockViewModel } from '../viewmodels/useDamagedStockViewModel';

export default function DamagedStockPage() {
  const { productDirectory, clearDamagedStock, t, can } = useInventoryApp();
  const vm = useDamagedStockViewModel({ products: productDirectory });
  const canManageProducts = can('manage_products');

  async function handleExportExcel() {
    const { utils, writeFile } = await import('xlsx');
    const header = ['#', 'Product', 'Category', 'Damaged Pieces', 'Case Size'];
    const data = vm.damagedProducts.map((p, i) => [i + 1, p.name, p.category || '', p.damagedPieces, p.piecesPerCase]);
    const ws = utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [{ wch: 6 }, { wch: 28 }, { wch: 18 }, { wch: 16 }, { wch: 12 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Damaged Stock');
    writeFile(wb, 'damaged-stock-report.xlsx');
  }

  return (
    <div>
      <SectionHeader eyebrow={t('damagedStock.eyebrow')} title={t('damagedStock.title')} description={t('damagedStock.description')} />

      <div id="damaged-stock-print" className="surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <span className="text-sm font-bold text-slate-700">{t('damagedStock.title')}</span>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary no-print py-1.5 text-xs"
              onClick={() => { inventoryApi.recordPrint({ entityType: 'damaged_stock', entityId: null, label: 'pdf' }).catch(() => {}); downloadSheetPdf('damaged-stock-print', 'damaged-stock-report.pdf'); }}
            >
              <Download size={14} />
              Download as PDF
            </button>
            <button type="button" className="btn-secondary no-print py-1.5 text-xs" onClick={handleExportExcel}>
              <FileSpreadsheet size={14} />
              Export as Excel
            </button>
            <button
              type="button"
              className="btn-secondary no-print py-1.5 text-xs"
              onClick={() => { inventoryApi.recordPrint({ entityType: 'damaged_stock', entityId: null, label: 'print' }).catch(() => {}); window.print(); }}
            >
              <Printer size={14} />
              Print
            </button>
          </div>
        </div>
        {vm.damagedProducts.length ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">{t('damagedStock.product')}</th>
                  <th className="px-4 py-3">{t('damagedStock.category')}</th>
                  <th className="px-4 py-3">{t('damagedStock.damagedQty')}</th>
                  <th className="px-4 py-3 text-right no-print">{t('common.actions')}</th>
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
                    <td className="table-cell text-right no-print">
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

      <DamageClearHistoryPanel products={productDirectory} refreshKey={vm.refreshKey} />

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
