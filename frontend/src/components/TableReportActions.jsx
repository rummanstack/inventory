import { useEffect } from 'react';
import { Download, FileSpreadsheet, Loader2, Printer } from 'lucide-react';
import { useInventoryApp } from '../app/useInventoryApp.jsx';
import { inventoryApi } from '../services/inventoryApi.js';
import { downloadSheetPdf, exportTableElementToCsv, exportTableElementToExcel, printElementById } from '../services/printService.js';
import { useAsyncAction } from '../hooks/useAsyncAction.js';

export default function TableReportActions({
  targetId,
  title,
  subtitle,
  fileName = 'report',
  entityType = 'table_report',
  entityId = null,
  t,
  className = 'flex gap-2',
  showPrint = true,
  shortcuts = {},
}) {
  const { tenant } = useInventoryApp();
  const [downloadingPdf, downloadPdf] = useAsyncAction();
  const pdfFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  const excelFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  const csvFileName = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`;

  function record(label) {
    inventoryApi.recordPrint({ entityType, entityId, label }).catch(() => {});
  }

  function formatShortcut(shortcut) {
    return shortcut?.label || '';
  }

  function matchesShortcut(event, shortcut) {
    if (!shortcut) return false;
    const key = String(shortcut.key || '').toLowerCase();
    return (
      event.key.toLowerCase() === key &&
      Boolean(event.ctrlKey || event.metaKey) === Boolean(shortcut.ctrlOrMeta) &&
      Boolean(event.altKey) === Boolean(shortcut.alt) &&
      Boolean(event.shiftKey) === Boolean(shortcut.shift)
    );
  }

  function shortcutBadge(shortcut) {
    const label = formatShortcut(shortcut);
    return label ? <kbd className="ml-1 rounded border border-slate-300 bg-white/70 px-1 py-0.5 font-mono text-[10px] text-slate-500">{label}</kbd> : null;
  }

  const pdfOptions = {
    title,
    subtitle,
    entityType,
    entityId,
    tenantName: tenant?.name || '',
    tenantAddress: tenant?.address || '',
    tenantLogoUrl: tenant?.logoUrl || '',
  };

  const handleDownloadPdf = () => downloadPdf(async () => {
    record('pdf');
    await downloadSheetPdf(targetId, pdfFileName, pdfOptions);
  });

  function handleExportExcel() {
    record('excel');
    exportTableElementToExcel(targetId, excelFileName, title, { entityType, entityId });
  }

  function handleExportCsv() {
    record('csv');
    exportTableElementToCsv(targetId, csvFileName, title, { entityType, entityId });
  }

  function handlePrint() {
    record('print');
    printElementById(targetId);
  }

  useEffect(() => {
    function handleKeyDown(event) {
      if (matchesShortcut(event, shortcuts.pdf) && !downloadingPdf) {
        event.preventDefault();
        handleDownloadPdf();
      } else if (matchesShortcut(event, shortcuts.excel)) {
        event.preventDefault();
        handleExportExcel();
      } else if (matchesShortcut(event, shortcuts.csv)) {
        event.preventDefault();
        handleExportCsv();
      } else if (showPrint && matchesShortcut(event, shortcuts.print)) {
        event.preventDefault();
        handlePrint();
      }
    }

    if (!shortcuts.pdf && !shortcuts.excel && !shortcuts.csv && !shortcuts.print) {
      return undefined;
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [downloadingPdf, shortcuts, showPrint, targetId, pdfFileName, excelFileName, csvFileName, title, entityType, entityId]);

  return (
    <div className={className}>
      <button
        type="button"
        className="btn-secondary py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
        onClick={handleDownloadPdf}
        disabled={downloadingPdf}
      >
        {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
        {t?.('common.downloadPdf') || 'Download as PDF'}
        {shortcutBadge(shortcuts.pdf)}
      </button>
      <button
        type="button"
        className="btn-secondary py-1.5 text-xs"
        onClick={handleExportExcel}
      >
        <FileSpreadsheet size={14} />
        {t?.('common.exportExcel') || 'Export as Excel'}
        {shortcutBadge(shortcuts.excel)}
      </button>
      <button
        type="button"
        className="btn-secondary py-1.5 text-xs"
        onClick={handleExportCsv}
      >
        <FileSpreadsheet size={14} />
        {t?.('common.exportCsv') || 'Export as CSV'}
        {shortcutBadge(shortcuts.csv)}
      </button>
      {showPrint ? (
        <button
          type="button"
          className="btn-secondary py-1.5 text-xs"
          onClick={handlePrint}
        >
          <Printer size={14} />
          {t?.('common.print') || 'Print'}
          {shortcutBadge(shortcuts.print)}
        </button>
      ) : null}
    </div>
  );
}
