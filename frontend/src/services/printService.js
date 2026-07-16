import { downloadRequest } from './api/client.js';

const MAX_RECORDS_PER_PAGE = 22;

export function buildPdfFileName(sheet) {
  const safeName = String(sheet?.dsrName || 'dsr-sheet')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return `${safeName || 'dsr-sheet'}-${sheet?.date || 'report'}.pdf`;
}

function toTitle(fileName = 'report.pdf') {
  return String(fileName)
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function cleanText(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isExcludedCell(cell) {
  return cell.classList.contains('no-print') || cell.closest('.no-print');
}

function getCellText(cell) {
  const fieldValues = [...cell.querySelectorAll('input, select, textarea')]
    .map((field) => {
      if (field.tagName.toLowerCase() === 'select') {
        return field.selectedOptions?.[0]?.textContent || field.value || '';
      }
      return field.value || '';
    })
    .filter(Boolean);

  return cleanText(fieldValues.length ? fieldValues.join(' ') : (cell.innerText || cell.textContent || ''));
}

function readStoredTenantInfo() {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem('stockledger.activeTenantSnapshot');
    if (!raw) {
      return {};
    }

    const tenant = JSON.parse(raw);
    return {
      tenantName: cleanText(tenant?.name || ''),
      tenantAddress: cleanText(tenant?.address || ''),
      tenantLogoUrl: cleanText(tenant?.logoUrl || ''),
    };
  } catch {
    return {};
  }
}

function readTenantInfoFromDom() {
  if (typeof document === 'undefined') {
    return {};
  }

  const expandedSidebar = document.querySelector('.logo-chip img')?.getAttribute('src') || '';
  const tenantName = document.querySelector('.logo-chip + div h2')?.textContent || '';

  return {
    tenantName: cleanText(tenantName),
    tenantAddress: '',
    tenantLogoUrl: cleanText(expandedSidebar),
  };
}

function getTenantInfo(options = {}) {
  const stored = readStoredTenantInfo();
  const dom = readTenantInfoFromDom();

  return {
    tenantName: cleanText(options.tenantName || stored.tenantName || dom.tenantName || 'StockLedger'),
    tenantAddress: cleanText(options.tenantAddress || stored.tenantAddress || dom.tenantAddress || ''),
    tenantLogoUrl: cleanText(options.tenantLogoUrl || stored.tenantLogoUrl || dom.tenantLogoUrl || ''),
  };
}

function splitIntoChunks(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks.length ? chunks : [[]];
}

function buildPageDefinitions(tables = []) {
  return tables.flatMap((table, tableIndex) => {
    const rows = Array.isArray(table.rows) ? table.rows : [];
    if (!rows.length) {
      return [];
    }

    const headerRow = rows[0];
    const dataRows = rows.slice(1);
    const rowChunks = splitIntoChunks(dataRows, MAX_RECORDS_PER_PAGE);

    return rowChunks.map((chunk, chunkIndex) => ({
      key: `table-${tableIndex}-page-${chunkIndex}`,
      title: cleanText(table.title || `Table ${tableIndex + 1}`),
      rows: [headerRow, ...chunk],
      pageNumber: chunkIndex + 1,
      pageCount: rowChunks.length,
      recordCount: chunk.length,
    }));
  });
}

export function extractTablesFromElement(targetId) {
  const element = document.getElementById(targetId);
  if (!element) {
    throw new Error('Report target not found.');
  }

  return [...element.querySelectorAll('table')].map((table) => {
    const rows = [...table.rows].map((row) =>
      [...row.cells]
        .filter((cell) => !isExcludedCell(cell))
        .map((cell) => ({
          text: getCellText(cell),
          header: cell.tagName.toLowerCase() === 'th',
          align: cell.className.includes('text-right') || cell.getAttribute('align') === 'right' ? 'right' : 'left',
          colSpan: Number(cell.colSpan || 1),
        }))
        .filter((cell) => cell.text),
    ).filter((row) => row.length);

    return { rows };
  }).filter((table) => table.rows.length);
}

function formatHeaderLabel(headerText = '') {
  const label = cleanText(headerText);
  const normalized = label.toLowerCase();
  if (normalized.includes('wholesale price')) return 'W.H Price';
  if (normalized.includes('retail price')) return 'R.T Price';
  if (normalized.includes('purchase price')) return 'Pur. Price';
  return label;
}

function getColumnSizingStyle(headerText = '') {
  const label = cleanText(headerText).toLowerCase();
  if (label === '#' || label === 'sl' || label === 'no') {
    return 'width:28px;max-width:28px;';
  }
  if (label.includes('w.h price') || label.includes('wh price') || label.includes('r.t price') || label.includes('rt price') || label.includes('pur. price') || label.includes('pur price') || label.includes('purchase price')) {
    return 'width:62px;max-width:62px;';
  }
  return '';
}
function buildReportHtml({ title, tables, tenantName, tenantAddress, tenantLogoUrl }) {
  const generatedAt = new Date().toLocaleString();
  const pages = buildPageDefinitions(tables);

  const pagesHtml = pages.map((page, pageIndex) => `
    <section data-report-page="true" style="width:794px;min-height:1122px;box-sizing:border-box;margin:0 auto ${pageIndex < pages.length - 1 ? '18px' : '0'};padding:18px 22px 22px;background:#ffffff;border:1px solid #dbe2ea;page-break-after:${pageIndex < pages.length - 1 ? 'always' : 'auto'};break-after:${pageIndex < pages.length - 1 ? 'page' : 'auto'};">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <tr>
          <td style="width:68px;vertical-align:top;">
            ${tenantLogoUrl ? `<img src="${escapeHtml(tenantLogoUrl)}" alt="Logo" style="display:block;width:54px;height:54px;object-fit:contain;">` : '<div style="width:54px;height:54px;border:1px solid #dbe2ea;background:#f8fafc;"></div>'}
          </td>
          <td style="vertical-align:top;">
            <div style="font-size:19px;font-weight:800;color:#0f172a;line-height:1.2;">${escapeHtml(tenantName)}</div>
            ${tenantAddress ? `<div style="margin-top:3px;font-size:10px;line-height:1.35;color:#475569;">${escapeHtml(tenantAddress)}</div>` : ''}
          </td>
          <td align="right" style="vertical-align:top;">
            <div style="font-size:16px;font-weight:800;line-height:1.2;color:#0f172a;text-transform:uppercase;">${escapeHtml(title)}</div>
            <div style="margin-top:4px;font-size:10px;color:#475569;">Generated: ${escapeHtml(generatedAt)}</div>
          </td>
        </tr>
      </table>

      <div style="margin-top:12px;font-size:10px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#64748b;">${escapeHtml(page.title)}${page.pageCount > 1 ? ` | Page ${page.pageNumber} of ${page.pageCount}` : ''}</div>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;border-collapse:collapse;font-size:10.5px;line-height:1.3;table-layout:fixed;font-weight:700;">
        ${page.rows.map((row, rowIndex) => {
          const hasHeader = row.some((cell) => cell.header) || rowIndex === 0;
          return `<tr style="${hasHeader ? 'background:#eef2f7;color:#0f172a;' : `background:${rowIndex % 2 === 1 ? '#ffffff' : '#fbfdff'};`}">
            ${row.map((cell, cellIndex) => {
              const tag = hasHeader ? 'th' : 'td';
              const headerText = page.rows[0]?.[cellIndex]?.text || cell.text;
              const widthStyle = getColumnSizingStyle(headerText);
              const cellStyle = hasHeader
                ? `padding:7px 8px;text-align:${cell.align};vertical-align:top;font-size:10px;font-weight:800;text-transform:uppercase;border:1px solid #dbe2ea;white-space:nowrap;${widthStyle}`
                : `padding:6px 8px;text-align:${cell.align};vertical-align:top;color:#1e293b;border:1px solid #e8edf3;font-weight:700;${widthStyle}`;
              return `<${tag} colspan="${cell.colSpan}" style="${cellStyle}">${escapeHtml(cell.text)}</${tag}>`;
            }).join('')}
          </tr>`;
        }).join('')}
      </table>
    </section>
  `).join('');

  return `
    <div style="margin:0;padding:12px;background:#f4f6f8;font-family:'Noto Sans Bengali','Noto Sans',Arial,Helvetica,sans-serif;color:#1f2937;">
      ${pagesHtml || `<section data-report-page="true" style="width:794px;min-height:1122px;box-sizing:border-box;margin:0 auto;padding:18px 22px 22px;background:#ffffff;border:1px solid #dbe2ea;"><div style="font-size:11px;color:#64748b;">No rows available for this report.</div></section>`}
    </div>
  `;
}

function syncClonedFormState(sourceRoot, clonedRoot) {
  const sourceFields = sourceRoot.querySelectorAll('input, textarea, select');
  const clonedFields = clonedRoot.querySelectorAll('input, textarea, select');

  sourceFields.forEach((field, index) => {
    const clonedField = clonedFields[index];
    if (!clonedField) return;

    if (field instanceof HTMLInputElement) {
      if (field.type === 'checkbox' || field.type === 'radio') {
        clonedField.checked = field.checked;
      } else {
        clonedField.value = field.value;
        clonedField.setAttribute('value', field.value);
      }
      return;
    }

    if (field instanceof HTMLTextAreaElement) {
      clonedField.value = field.value;
      clonedField.textContent = field.value;
      return;
    }

    if (field instanceof HTMLSelectElement) {
      clonedField.value = field.value;
      [...clonedField.options].forEach((option) => {
        option.selected = option.value === field.value;
      });
    }
  });
}

export function printElementById(targetId) {
  const element = document.getElementById(targetId);
  if (!element) {
    throw new Error('Print target not found.');
  }

  const printRoot = document.createElement('div');
  printRoot.className = 'print-session-root';
  const clone = element.cloneNode(true);
  syncClonedFormState(element, clone);
  printRoot.appendChild(clone);
  document.body.appendChild(printRoot);
  document.body.classList.add('printing-active');

  const mediaQuery = typeof window.matchMedia === 'function' ? window.matchMedia('print') : null;
  let restored = false;

  const restore = () => {
    if (restored) return;
    restored = true;
    document.body.classList.remove('printing-active');
    printRoot.remove();
    window.removeEventListener('afterprint', restore);
    if (mediaQuery?.removeEventListener) {
      mediaQuery.removeEventListener('change', handlePrintChange);
    } else if (mediaQuery?.removeListener) {
      mediaQuery.removeListener(handlePrintChange);
    }
    window.clearTimeout(fallbackTimer);
  };

  const handlePrintChange = (event) => {
    if (!event.matches) {
      restore();
    }
  };

  window.addEventListener('afterprint', restore);
  if (mediaQuery?.addEventListener) {
    mediaQuery.addEventListener('change', handlePrintChange);
  } else if (mediaQuery?.addListener) {
    mediaQuery.addListener(handlePrintChange);
  }

  const fallbackTimer = window.setTimeout(restore, 60000);
  window.requestAnimationFrame(() => {
    window.print();
  });
}

function createReportHost(html) {
  const host = document.createElement('div');
  host.style.position = 'absolute';
  host.style.left = '-10000px';
  host.style.top = '0';
  host.style.width = '860px';
  host.style.background = '#f4f6f8';
  host.innerHTML = html;
  document.body.appendChild(host);
  return host;
}

async function saveBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// Day 12 (MOBILE-15-DAY-PLAN.md): reports need to travel to WhatsApp from a phone.
// Tries the native share sheet with the PDF file attached; falls back to a plain
// download if the browser lacks file-sharing support or the user cancels the sheet.
async function shareOrSaveBlob(blob, fileName, { title } = {}) {
  if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
    const file = new File([blob], fileName, { type: blob.type || 'application/pdf' });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: title || fileName });
        return;
      } catch (error) {
        if (error?.name === 'AbortError') {
          return;
        }
        // any other share failure — fall through to a plain download
      }
    }
  }
  await saveBlob(blob, fileName);
}

async function exportReportFile(format, payload, fileName, fallback, options = {}) {
  try {
    const { blob } = await downloadRequest(`/report-exports/${format}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (options.share) {
      await shareOrSaveBlob(blob, fileName, { title: payload.title });
    } else {
      await saveBlob(blob, fileName);
    }
    return;
  } catch (error) {
    if (!fallback) {
      throw error;
    }
  }

  await fallback();
}

export async function downloadSheetPdf(targetId, fileName, options = {}) {
  const tables = extractTablesFromElement(targetId);
  const title = options.title || toTitle(fileName);
  const tenantInfo = getTenantInfo(options);

  await exportReportFile('pdf', {
    title,
    fileName,
    entityType: options.entityType,
    entityId: options.entityId,
    tables,
    ...tenantInfo,
  }, fileName, async () => {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
    const host = createReportHost(buildReportHtml({ title, tables, ...tenantInfo }));

    try {
      const pageNodes = [...host.querySelectorAll('[data-report-page="true"]')];
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      for (let index = 0; index < pageNodes.length; index += 1) {
        const canvas = await html2canvas(pageNodes[index], {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
        });

        if (index > 0) {
          pdf.addPage();
        }

        const imageData = canvas.toDataURL('image/png');
        pdf.addImage(imageData, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
      }

      if (options.share) {
        await shareOrSaveBlob(pdf.output('blob'), fileName, { title });
      } else {
        pdf.save(fileName);
      }
    } finally {
      host.remove();
    }
  }, { share: options.share });
}

export async function exportTableElementToExcel(targetId, fileName, sheetName = 'Report', options = {}) {
  const tables = extractTablesFromElement(targetId);
  const title = toTitle(fileName);
  await exportReportFile('excel', { title, sheetName, fileName, entityType: options.entityType, entityId: options.entityId, tables }, fileName, async () => {
    const rows = tables.flatMap((table, tableIndex) => [
      ...(tableIndex > 0 ? [[]] : []),
      ...table.rows.map((row) => row.map((cell) => cell.text)),
    ]);
    const { utils, writeFile } = await import('xlsx');
    const worksheet = utils.aoa_to_sheet(rows.length ? rows : [['No rows available']]);
    worksheet['!cols'] = (rows[0] || []).map(() => ({ wch: 22 }));
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, String(sheetName || 'Report').slice(0, 31));
    writeFile(workbook, fileName);
  });
}


export async function exportTableElementToCsv(targetId, fileName, sheetName = 'Report', options = {}) {
  const tables = extractTablesFromElement(targetId);
  const title = toTitle(fileName);
  await exportReportFile('excel', { title, sheetName, fileName, entityType: options.entityType, entityId: options.entityId, tables }, fileName, async () => {
    const rows = tables.flatMap((table, tableIndex) => [
      ...(tableIndex > 0 ? [[]] : []),
      ...table.rows.map((row) => row.map((cell) => cell.text)),
    ]);
    const { utils } = await import('xlsx');
    const worksheet = utils.aoa_to_sheet(rows.length ? rows : [['No rows available']]);
    const csv = utils.sheet_to_csv(worksheet);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    await saveBlob(blob, fileName);
  });
}
