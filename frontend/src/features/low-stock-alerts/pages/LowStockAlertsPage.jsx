import { AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { Alert, Badge, EmptyState, SectionHeader } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCasePiece, formatNumber, getLowStockProducts, getLowStockThreshold } from '../../../utils/calculations.js';

export default function LowStockAlertsPage() {
  const { productDirectory, t, language } = useInventoryApp();
  const lowStockProducts = [...getLowStockProducts(productDirectory)].sort((a, b) => a.stockPieces - b.stockPieces);
  const outOfStockCount = lowStockProducts.filter((product) => product.stockPieces === 0).length;

  async function handleExportExcel() {
    const { utils, writeFile } = await import('xlsx');
    const header = [t('lowStockAlerts.product'), t('lowStockAlerts.category'), t('lowStockAlerts.currentStock'), t('lowStockAlerts.threshold'), t('lowStockAlerts.status')];
    const data = lowStockProducts.map((product) => [
      product.name,
      product.category || '',
      formatCasePiece(product.stockPieces, product.piecesPerCase, language),
      formatCasePiece(getLowStockThreshold(product), product.piecesPerCase, language),
      product.stockPieces === 0 ? t('lowStockAlerts.outOfStock') : t('lowStockAlerts.lowStock'),
    ]);
    const ws = utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [{ wch: 28 }, { wch: 18 }, { wch: 16 }, { wch: 18 }, { wch: 14 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, t('lowStockAlerts.sheetName'));
    writeFile(wb, 'low-stock-alerts.xlsx');
  }

  return (
    <div>
      <SectionHeader eyebrow={t('nav.lowStockAlerts')} description={t('lowStockAlerts.description')} />

      {lowStockProducts.length ? (
        <div className="mb-4">
          <Alert type="warning">
            {t('lowStockAlerts.summary', { count: formatNumber(lowStockProducts.length, language), outOfStock: formatNumber(outOfStockCount, language) })}
          </Alert>
        </div>
      ) : null}

      <div className="surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <span className="text-sm font-bold text-slate-700">{t('nav.lowStockAlerts')}</span>
          {lowStockProducts.length ? (
            <button type="button" className="btn-secondary py-1.5 text-xs" onClick={handleExportExcel}>
              <FileSpreadsheet size={14} />
              {t('common.exportExcel')}
            </button>
          ) : null}
        </div>

        {lowStockProducts.length ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">{t('lowStockAlerts.product')}</th>
                  <th className="px-4 py-3">{t('lowStockAlerts.category')}</th>
                  <th className="px-4 py-3 text-right">{t('lowStockAlerts.currentStock')}</th>
                  <th className="px-4 py-3 text-right">{t('lowStockAlerts.threshold')}</th>
                  <th className="px-4 py-3">{t('lowStockAlerts.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lowStockProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50">
                    <td className="table-cell font-semibold text-slate-950">{product.name}</td>
                    <td className="table-cell text-slate-500">{product.category}</td>
                    <td className="table-cell text-right font-semibold text-slate-700">
                      {formatCasePiece(product.stockPieces, product.piecesPerCase, language)}
                    </td>
                    <td className="table-cell text-right text-slate-500">
                      {formatCasePiece(getLowStockThreshold(product), product.piecesPerCase, language)}
                    </td>
                    <td className="table-cell">
                      <Badge tone={product.stockPieces === 0 ? 'rose' : 'amber'}>
                        {product.stockPieces === 0 ? t('lowStockAlerts.outOfStock') : t('lowStockAlerts.lowStock')}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-5">
            <EmptyState title={t('lowStockAlerts.emptyTitle')} description={t('lowStockAlerts.emptyDescription')} icon={AlertTriangle} />
          </div>
        )}
      </div>
    </div>
  );
}
