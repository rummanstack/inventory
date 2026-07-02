import { Download, FileSpreadsheet, Printer } from 'lucide-react';
import { inventoryApi } from '../services/inventoryApi.js';
import { downloadSheetPdf, exportTableElementToExcel } from '../services/printService.js';

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
  const pdfFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  const excelFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;

  function record(label) {
    inventoryApi.recordPrint({ entityType, entityId, label }).catch(() => {});
  }

  return (
    <div className={className}>
      <button
        type="button"
        className="btn-secondary py-1.5 text-xs"
        onClick={() => {
          record('pdf');
          downloadSheetPdf(targetId, pdfFileName, { title, subtitle, entityType, entityId });
        }}
      >
        <Download size={14} />
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
            window.print();
          }}
        >
          <Printer size={14} />
          {t?.('common.print') || 'Print'}
        </button>
      ) : null}
    </div>
  );
}
