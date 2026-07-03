import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { utils as xlsxUtils, write } from "xlsx";
import { backendRoot } from "../config/paths.js";

const MAX_RECORDS_PER_PAGE = 20;

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cleanText(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

function normalizeCell(cell) {
  if (cell && typeof cell === "object") {
    return {
      text: cleanText(cell.text ?? cell.value ?? ""),
      header: Boolean(cell.header),
      align: cell.align || (cell.className?.includes?.("text-right") ? "right" : "left"),
      colSpan: Number(cell.colSpan || 1),
    };
  }

  return {
    text: cleanText(cell ?? ""),
    header: false,
    align: "left",
    colSpan: 1,
  };
}

function normalizeTables(tables = []) {
  return tables
    .map((table) => ({
      title: cleanText(table.title || ""),
      rows: Array.isArray(table.rows)
        ? table.rows.map((row) => row.map(normalizeCell).filter((cell) => cell.text))
        : [],
    }))
    .filter((table) => table.rows.length);
}

function tableToRows(table) {
  const rows = [];
  for (const row of table.rows) {
    rows.push(row.map((cell) => cell.text));
  }
  return rows;
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
      title: cleanText(table.title || `Table ${tableIndex + 1}`),
      rows: [headerRow, ...chunk],
      pageNumber: chunkIndex + 1,
      pageCount: rowChunks.length,
      recordCount: chunk.length,
    }));
  });
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
function buildReportHtml({ title, generatedAt, tables, tenantName, tenantAddress, tenantLogoUrl }) {
  const fontCss = pathToFileURL(path.join(backendRoot, "node_modules", "@fontsource", "noto-sans-bengali", "index.css")).href;
  const pages = buildPageDefinitions(tables);

  const pagesHtml = pages.map((page, pageIndex) => `
    <section class="report-page">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <tr>
          <td style="width:68px;vertical-align:top;">
            ${tenantLogoUrl ? `<img src="${escapeHtml(tenantLogoUrl)}" alt="Logo" style="display:block;width:54px;height:54px;object-fit:contain;">` : '<div style="width:54px;height:54px;border:1px solid #dbe2ea;background:#f8fafc;"></div>'}
          </td>
          <td style="vertical-align:top;">
            <div style="font-size:19px;font-weight:800;color:#0f172a;line-height:1.2;">${escapeHtml(tenantName)}</div>
            ${tenantAddress ? `<div style="margin-top:3px;font-size:10px;line-height:1.35;color:#475569;">${escapeHtml(tenantAddress)}</div>` : ""}
          </td>
          <td align="right" style="vertical-align:top;">
            <div style="font-size:16px;font-weight:800;line-height:1.2;color:#0f172a;text-transform:uppercase;">${escapeHtml(title)}</div>
            <div style="margin-top:4px;font-size:10px;color:#475569;">Generated: ${escapeHtml(generatedAt)}</div>
          </td>
        </tr>
      </table>

      <div style="margin-top:12px;font-size:10px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#64748b;">${escapeHtml(page.title)}${page.pageCount > 1 ? ` | Page ${page.pageNumber} of ${page.pageCount}` : ""}</div>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;border-collapse:collapse;font-size:10.5px;line-height:1.3;table-layout:fixed;font-weight:700;">
        ${page.rows.map((row, rowIndex) => {
          const hasHeader = row.some((cell) => cell.header) || rowIndex === 0;
          return `<tr style="${hasHeader ? "background:#eef2f7;color:#0f172a;" : `background:${rowIndex % 2 === 1 ? "#ffffff" : "#fbfdff"};`}">
            ${row.map((cell, cellIndex) => {
              const tag = hasHeader ? "th" : "td";
              const headerText = page.rows[0]?.[cellIndex]?.text || cell.text;
              const widthStyle = getColumnSizingStyle(headerText);
              const cellStyle = hasHeader
                ? `padding:7px 8px;text-align:${cell.align};vertical-align:top;font-size:10px;font-weight:800;text-transform:uppercase;border:1px solid #dbe2ea;white-space:nowrap;${widthStyle}`
                : `padding:6px 8px;text-align:${cell.align};vertical-align:top;color:#1e293b;border:1px solid #e8edf3;font-weight:700;${widthStyle}`;
              return `<${tag} colspan="${cell.colSpan}" style="${cellStyle}">${escapeHtml(cell.text)}</${tag}>`;
            }).join("")}
          </tr>`;
        }).join("")}
      </table>
    </section>
  `).join("");

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8">
        <link rel="stylesheet" href="${fontCss}">
        <style>
          @page { size: A4; margin: 10mm; }
          body {
            margin: 0;
            padding: 12px;
            background: #f4f6f8;
            font-family: "Noto Sans Bengali", "Noto Sans", Arial, Helvetica, sans-serif;
            color: #1f2937;
          }
          .report-page {
            width: 794px;
            min-height: 1122px;
            box-sizing: border-box;
            margin: 0 auto 18px;
            padding: 18px 22px 22px;
            background: #ffffff;
            border: 1px solid #dbe2ea;
            page-break-after: always;
            break-after: page;
          }
          .report-page:last-child {
            margin-bottom: 0;
            page-break-after: auto;
            break-after: auto;
          }
        </style>
      </head>
      <body>
        ${pagesHtml || '<section class="report-page"><div style="font-size:11px;color:#64748b;">No rows available for this report.</div></section>'}
      </body>
    </html>
  `;
}

export class ReportExportService {
  async createPdfBuffer(payload = {}) {
    const tables = normalizeTables(payload.tables);
    const generatedAt = new Date().toLocaleString();
    const html = buildReportHtml({
      title: cleanText(payload.title || payload.fileName || "Report"),
      generatedAt,
      tables,
      tenantName: cleanText(payload.tenantName || "StockLedger"),
      tenantAddress: cleanText(payload.tenantAddress || ""),
      tenantLogoUrl: cleanText(payload.tenantLogoUrl || ""),
    });

    const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
    try {
      const page = await browser.newPage({ viewport: { width: 1280, height: 1600 } });
      await page.setContent(html, { waitUntil: "networkidle" });
      await page.emulateMedia({ media: "screen" });
      await page.evaluate(() => document.fonts.ready);
      return await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" },
      });
    } finally {
      await browser.close();
    }
  }

  async createExcelBuffer(payload = {}) {
    const tables = normalizeTables(payload.tables);
    const rows = [];
    tables.forEach((table, tableIndex) => {
      if (table.title) {
        rows.push([table.title]);
      }
      tableToRows(table).forEach((row) => rows.push(row));
      if (tableIndex < tables.length - 1) {
        rows.push([]);
      }
    });

    const worksheet = xlsxUtils.aoa_to_sheet(rows.length ? rows : [["No rows available"]]);
    const workbook = xlsxUtils.book_new();
    xlsxUtils.book_append_sheet(workbook, worksheet, cleanText(payload.sheetName || payload.title || "Report").slice(0, 31));
    return write(workbook, { bookType: "xlsx", type: "buffer" });
  }
}

