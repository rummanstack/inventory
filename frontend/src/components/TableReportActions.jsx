import { Download, FileSpreadsheet, Printer } from 'lucide-react';
import { useInventoryApp } from '../app/useInventoryApp.jsx';
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
  const { tenant } = useInventoryApp();
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
        className="btn-secondary py-1.5 text-xs"
        onClick={() => {
          record('pdf');
          downloadSheetPdf(targetId, pdfFileName, pdfOptions);
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
