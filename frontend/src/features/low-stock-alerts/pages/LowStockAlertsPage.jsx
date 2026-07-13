import { useEffect } from 'react';
import { AlertTriangle, Download, FileSpreadsheet, Loader2, Printer } from 'lucide-react';
import { Alert, Badge, EmptyState, SectionHeader } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { downloadSheetPdf } from '../../../services/printService.js';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { formatCasePiece, formatNumber, getLowStockProducts, getLowStockThreshold } from '../../../utils/calculations.js';
import { useAsyncAction } from '../../../hooks/useAsyncAction.js';

const LOW_STOCK_PRINT_ID = 'low-stock-alerts-print';

export default function LowStockAlertsPage() {
  const { productDirectory, t, language, tenant } = useInventoryApp();
  const isElectronics = (tenant?.businessType || 'ELECTRONICS') === 'ELECTRONICS';
  const isPharmacy = tenant?.businessType === 'DRUG_PHARMACY';
  const lowStockProducts = [...getLowStockProducts(productDirectory)].sort((a, b) => a.stockPieces - b.stockPieces);
  const outOfStockCount = lowStockProducts.filter((product) => product.stockPieces === 0).length;
  const [downloadingPdf, downloadPdf] = useAsyncAction();

  function formatStock(pieces, piecesPerCase) {
    return isElectronics ? `${formatNumber(pieces, language)} ${t('common.pcs')}` : formatCasePiece(pieces, piecesPerCase, language);
  }

  function handleDownloadPdf() {
    downloadPdf(async () => {
      await inventoryApi.recordPrint({ entityType: 'low_stock_alerts', entityId: null, label: 'pdf' }).catch(() => {});
      await downloadSheetPdf(LOW_STOCK_PRINT_ID, 'low-stock-alerts.pdf');
    });
  }

  function handlePrint() {
    inventoryApi.recordPrint({ entityType: 'low_stock_alerts', entityId: null, label: 'print' }).catch(() => {});
    window.print();
  }

  async function handleExportExcel() {
    const { utils, writeFile } = await import('xlsx');
    const header = [t('lowStockAlerts.product'), t('lowStockAlerts.category'), t('lowStockAlerts.currentStock'), t('lowStockAlerts.threshold'), t('lowStockAlerts.status')];
    const data = lowStockProducts.map((product) => [
      product.name,
      product.category || '',
      formatStock(product.stockPieces, product.piecesPerCase),
      formatStock(getLowStockThreshold(product), product.piecesPerCase),
      product.stockPieces === 0 ? t('lowStockAlerts.outOfStock') : t('lowStockAlerts.lowStock'),
    ]);
    const ws = utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [{ wch: 28 }, { wch: 18 }, { wch: 16 }, { wch: 18 }, { wch: 14 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, t('lowStockAlerts.sheetName'));
    writeFile(wb, 'low-stock-alerts.xlsx');
  }

  useEffect(() => {
    if (!lowStockProducts.length) {
      return undefined;
    }

    function handleKeyDown(event) {
      const key = event.key.toLowerCase();
      const isShortcut = event.altKey && !event.ctrlKey && !event.metaKey;
      if (!isShortcut) {
        return;
      }

      if (key === 'd' && !downloadingPdf) {
        event.preventDefault();
        handleDownloadPdf();
      } else if (key === 'e') {
        event.preventDefault();
        handleExportExcel();
      } else if (key === 'p') {
        event.preventDefault();
        handlePrint();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [downloadingPdf, lowStockProducts]);

  return (
    <div>
      <SectionHeader eyebrow={t('nav.lowStockAlerts')} title={t('nav.lowStockAlerts')} description={t('lowStockAlerts.description')} />

      {lowStockProducts.length ? (
        <div className="mb-4">
          <Alert type="warning">
            {t('lowStockAlerts.summary', { count: formatNumber(lowStockProducts.length, language), outOfStock: formatNumber(outOfStockCount, language) })}
          </Alert>
        </div>
      ) : null}

      <div id={LOW_STOCK_PRINT_ID} className="surface overflow-hidden print-target">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <span className="text-sm font-bold text-slate-700">{t('nav.lowStockAlerts')}</span>
          {lowStockProducts.length ? (
            <div className="flex gap-2 no-print">
              <button
                type="button"
                className="btn-secondary py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
              >
                {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                {t('purchaseReceive.downloadPdf')}
                <kbd className="ml-1 rounded border border-slate-300 bg-white/70 px-1 py-0.5 font-mono text-[10px] text-slate-500">Alt+D</kbd>
              </button>
              <button type="button" className="btn-secondary py-1.5 text-xs" onClick={handleExportExcel}>
                <FileSpreadsheet size={14} />
                {t('common.exportExcel')}
                <kbd className="ml-1 rounded border border-slate-300 bg-white/70 px-1 py-0.5 font-mono text-[10px] text-slate-500">Alt+E</kbd>
              </button>
              <button
                type="button"
                className="btn-secondary py-1.5 text-xs"
                onClick={handlePrint}
              >
                <Printer size={14} />
                {t('common.print')}
                <kbd className="ml-1 rounded border border-slate-300 bg-white/70 px-1 py-0.5 font-mono text-[10px] text-slate-500">Alt+P</kbd>
              </button>
            </div>
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
                      {formatStock(product.stockPieces, product.piecesPerCase)}
                    </td>
                    <td className="table-cell text-right text-slate-500">
                      {formatStock(getLowStockThreshold(product), product.piecesPerCase)}
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
