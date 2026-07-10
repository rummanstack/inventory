import { Download, FileSpreadsheet, Loader2, Printer } from 'lucide-react';
import { useInventoryApp } from '../app/useInventoryApp.jsx';
import { inventoryApi } from '../services/inventoryApi.js';
import { downloadSheetPdf, exportTableElementToExcel, printElementById } from '../services/printService.js';
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
}) {
  const { tenant } = useInventoryApp();
  const [downloadingPdf, downloadPdf] = useAsyncAction();
  const pdfFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  const excelFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;

  function record(label) {
    inventoryApi.recordPrint({ entityType, entityId, label }).catch(() => {});
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

  return (
    <div className={className}>
      <button
        type="button"
        className="btn-secondary py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
        onClick={() => downloadPdf(async () => {
          record('pdf');
          await downloadSheetPdf(targetId, pdfFileName, pdfOptions);
        })}
        disabled={downloadingPdf}
      >
        {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
        {t?.('common.downloadPdf') || 'Download as PDF'}
      </button>
      <button
        type="button"
        className="btn-secondary py-1.5 text-xs"
        onClick={() => {
          record('excel');
          exportTableElementToExcel(targetId, excelFileName, title, { entityType, entityId });
        }}
      >
        <FileSpreadsheet size={14} />
        {t?.('common.exportExcel') || 'Export as Excel'}
      </button>
      {showPrint ? (
        <button
          type="button"
          className="btn-secondary py-1.5 text-xs"
          onClick={() => {
            record('print');
            printElementById(targetId);
          }}
        >
          <Printer size={14} />
          {t?.('common.print') || 'Print'}
        </button>
      ) : null}
    </div>
  );
}
