import { useEffect, useState } from 'react';
import { Download, FileSpreadsheet, Loader2, PackageX, Printer } from 'lucide-react';
import { EmptyState, MobileCardList, MobileListCard, SectionHeader, cx } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { downloadSheetPdf } from '../../../services/printService.js';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { formatCasePiece, formatNumber } from '../../../utils/calculations.js';
import { useAsyncAction } from '../../../hooks/useAsyncAction.js';
import ClearDamageModal from '../components/ClearDamageModal';
import DamageFromSettlementsPanel from '../components/DamageFromSettlementsPanel';
import DamageClearHistoryPanel from '../components/DamageClearHistoryPanel';
import { useDamagedStockViewModel } from '../viewmodels/useDamagedStockViewModel';

const DAMAGE_TABS = {
  CURRENT: 'current',
  INFLOW: 'inflow',
  HISTORY: 'history',
};

export default function DamagedStockPage() {
  const { productDirectory, clearDamagedStock, t, can, tenant } = useInventoryApp();
  const isElectronics = (tenant?.businessType || 'ELECTRONICS') === 'ELECTRONICS';
  const vm = useDamagedStockViewModel({ products: productDirectory });
  const canManageProducts = can('manage_products');
  const [downloadingPdf, downloadPdf] = useAsyncAction();
  const [activeTab, setActiveTab] = useState(DAMAGE_TABS.CURRENT);

  const tabs = [
    {
      id: DAMAGE_TABS.CURRENT,
      label: t('damagedStock.currentTab'),
      count: vm.damagedProducts.length,
      shortcut: 'Alt+1',
    },
    {
      id: DAMAGE_TABS.INFLOW,
      label: t('damagedStock.inflowTab'),
      shortcut: 'Alt+2',
    },
    {
      id: DAMAGE_TABS.HISTORY,
      label: t('damagedStock.historyTab'),
      shortcut: 'Alt+3',
    },
  ];

  function handleDownloadPdf() {
    downloadPdf(async () => {
      await inventoryApi.recordPrint({ entityType: 'damaged_stock', entityId: null, label: 'pdf' }).catch(() => {});
      await downloadSheetPdf('damaged-stock-print', 'damaged-stock-report.pdf');
    });
  }

  function handlePrint() {
    inventoryApi.recordPrint({ entityType: 'damaged_stock', entityId: null, label: 'print' }).catch(() => {});
    window.print();
  }

  async function handleExportExcel() {
    const { utils, writeFile } = await import('xlsx');
    const header = isElectronics
      ? ['#', t('damagedStock.product'), t('damagedStock.category'), t('damagedStock.damagedPieces')]
      : ['#', t('damagedStock.product'), t('damagedStock.category'), t('damagedStock.damagedPieces'), t('damagedStock.caseSize')];
    const data = vm.damagedProducts.map((p, i) => isElectronics
      ? [i + 1, p.name, p.category || '', p.damagedPieces]
      : [i + 1, p.name, p.category || '', p.damagedPieces, p.piecesPerCase]);
    const ws = utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = isElectronics
      ? [{ wch: 6 }, { wch: 28 }, { wch: 18 }, { wch: 16 }]
      : [{ wch: 6 }, { wch: 28 }, { wch: 18 }, { wch: 16 }, { wch: 12 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, t('damagedStock.sheetName'));
    writeFile(wb, 'damaged-stock-report.xlsx');
  }

  useEffect(() => {
    function handleKeyDown(event) {
      const key = event.key.toLowerCase();
      const isShortcut = event.altKey && !event.ctrlKey && !event.metaKey;
      if (!isShortcut || vm.selectedProduct) {
        return;
      }

      if (key === '1') {
        event.preventDefault();
        setActiveTab(DAMAGE_TABS.CURRENT);
      } else if (key === '2') {
        event.preventDefault();
        setActiveTab(DAMAGE_TABS.INFLOW);
      } else if (key === '3') {
        event.preventDefault();
        setActiveTab(DAMAGE_TABS.HISTORY);
      } else if (activeTab === DAMAGE_TABS.CURRENT && key === 'd' && !downloadingPdf) {
        event.preventDefault();
        handleDownloadPdf();
      } else if (activeTab === DAMAGE_TABS.CURRENT && key === 'e') {
        event.preventDefault();
        handleExportExcel();
      } else if (activeTab === DAMAGE_TABS.CURRENT && key === 'p') {
        event.preventDefault();
        handlePrint();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, downloadingPdf, vm.selectedProduct, vm.damagedProducts]);

  return (
    <div>
      <SectionHeader title={t('damagedStock.title')} compact />

      <div className="no-print mb-4 overflow-x-auto">
        <div className="inline-flex min-w-full gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 sm:min-w-0">
          {tabs.map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={cx(
                  'flex min-h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 text-sm font-bold transition sm:flex-none',
                  selected ? 'border border-rose-200 bg-rose-50 text-rose-800 shadow-sm ring-2 ring-rose-100' : 'border border-transparent text-slate-500 hover:bg-white/70 hover:text-slate-800'
                )}
                aria-pressed={selected}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
                <kbd className={cx('rounded border px-1.5 py-0.5 text-[10px] font-black', selected ? 'border-rose-200 bg-white text-rose-700' : 'border-slate-200 bg-white text-slate-400')}>{tab.shortcut}</kbd>
                {typeof tab.count === 'number' ? (
                  <span className={cx('rounded-full px-2 py-0.5 text-xs font-black', selected ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-600')}>
                    {formatNumber(tab.count)}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === DAMAGE_TABS.CURRENT ? (
        <div id="damaged-stock-print" className="surface overflow-hidden print-target">
          <div className="flex flex-wrap justify-end gap-2 border-b border-slate-100 px-5 py-3">
            <button
              type="button"
              className="btn-secondary no-print h-10 gap-1.5 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
            >
              {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {t('purchaseReceive.downloadPdf')}
              <kbd className="rounded border border-slate-300 bg-white/70 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">Alt+D</kbd>
            </button>
            <button type="button" className="btn-secondary no-print h-10 gap-1.5 px-3 text-xs" onClick={handleExportExcel}>
              <FileSpreadsheet size={14} />
              {t('common.exportExcel')}
              <kbd className="rounded border border-slate-300 bg-white/70 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">Alt+E</kbd>
            </button>
            <button
              type="button"
              className="btn-secondary no-print h-10 gap-1.5 px-3 text-xs"
              onClick={handlePrint}
            >
              <Printer size={14} />
              {t('common.print')}
              <kbd className="rounded border border-slate-300 bg-white/70 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">Alt+P</kbd>
            </button>
          </div>
          {vm.damagedProducts.length ? (
            <>
            <MobileCardList>
              {vm.damagedProducts.map((product) => (
                <MobileListCard
                  key={product.id}
                  title={product.name}
                  subtitle={product.category}
                  value={isElectronics ? `${formatNumber(product.damagedPieces)} ${t('common.pcs')}` : formatCasePiece(product.damagedPieces, product.piecesPerCase)}
                  valueClass="text-rose-600"
                  valueSub={isElectronics ? null : `${formatNumber(product.damagedPieces)} ${t('common.pcs')}`}
                  action={canManageProducts ? (
                    <button type="button" className="btn-secondary h-9 px-3" onClick={() => vm.openClearModal(product)}>
                      <PackageX size={16} />
                      {t('damagedStock.clearButton')}
                    </button>
                  ) : null}
                />
              ))}
            </MobileCardList>
            <div className="hidden overflow-x-auto md:block">
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
                        {isElectronics ? (
                          <p className="font-semibold text-rose-600">{formatNumber(product.damagedPieces)} {t('common.pcs')}</p>
                        ) : (
                          <>
                            <p className="font-semibold text-rose-600">{formatCasePiece(product.damagedPieces, product.piecesPerCase)}</p>
                            <p className="text-xs text-slate-500">{formatNumber(product.damagedPieces)} {t('common.pcs')}</p>
                          </>
                        )}
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
            </>
          ) : (
            <div className="p-5">
              <EmptyState title={t('damagedStock.emptyTitle')} description={t('damagedStock.emptyDescription')} icon={PackageX} />
            </div>
          )}
        </div>
      ) : null}

      {activeTab === DAMAGE_TABS.INFLOW ? <DamageFromSettlementsPanel products={productDirectory} flushTop /> : null}
      {activeTab === DAMAGE_TABS.HISTORY ? <DamageClearHistoryPanel products={productDirectory} refreshKey={vm.refreshKey} flushTop /> : null}

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
