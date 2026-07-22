import { useState } from 'react';
import { Download, Loader2, Upload } from 'lucide-react';
import { Alert, Modal, Select } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';

// Accepts a handful of header spellings so a CSV exported from a spreadsheet
// with slightly different casing/spacing still parses.
const HEADER_ALIASES = {
  serialnumber: 'serialNumber',
  serial: 'serialNumber',
  imei1: 'imei1',
  imei2: 'imei2',
  barcode: 'barcode',
  purchaseprice: 'purchasePrice',
  saleprice: 'salePrice',
};

function normalizeHeader(raw) {
  const key = String(raw || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
  return HEADER_ALIASES[key] || null;
}

function rowsFromSheet(rows) {
  if (!rows.length) return [];
  const headerMap = rows[0].map(normalizeHeader);

  return rows.slice(1)
    .filter((row) => row.some((cell) => String(cell ?? '').trim() !== ''))
    .map((row) => {
      const entry = {};
      headerMap.forEach((field, index) => {
        if (!field) return;
        const value = row[index];
        if (value === undefined || value === null || String(value).trim() === '') return;
        entry[field] = field === 'purchasePrice' || field === 'salePrice' ? Number(value) : String(value).trim();
      });
      return entry;
    })
    .filter((entry) => entry.serialNumber || entry.imei1 || entry.imei2);
}

export default function ProductSerialImportModal({ onClose, onImported }) {
  const { t, productDirectory, pushToast } = useInventoryApp();
  const serialRequiredProducts = productDirectory.filter((product) => product.serialRequired);
  const [productId, setProductId] = useState(serialRequiredProducts[0]?.id || '');
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError('');
    try {
      const { read, utils } = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const workbook = read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const raw = utils.sheet_to_json(sheet, { header: 1, raw: true, blankrows: false });
      const parsed = rowsFromSheet(raw);
      if (!parsed.length) {
        setError(t('productSerials.importNoRows'));
        setRows([]);
        return;
      }
      setRows(parsed);
      setFileName(file.name);
    } catch {
      setError(t('productSerials.importParseFailed'));
      setRows([]);
    }
  }

  async function downloadTemplate() {
    const { utils, writeFile } = await import('xlsx');
    const ws = utils.aoa_to_sheet([
      ['serialNumber', 'barcode', 'purchasePrice', 'salePrice'],
      ['SN-0001', '', '', ''],
      ['SN-0002', '', '', ''],
    ]);
    ws['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 14 }, { wch: 14 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Serials');
    writeFile(wb, 'serial-import-template.xlsx');
  }

  async function handleImport() {
    if (!productId) {
      setError(t('productSerials.selectProduct'));
      return;
    }
    if (!rows.length) {
      setError(t('productSerials.importNoRows'));
      return;
    }

    setImporting(true);
    setError('');
    try {
      const result = await inventoryApi.bulkImportProductSerials({ productId, rows });
      pushToast('success', t('productSerials.importSuccessTitle'), t('productSerials.importSuccessMessage', { count: result.count }));
      onImported();
    } catch (err) {
      setError(err?.message || t('productSerials.importFailed'));
    } finally {
      setImporting(false);
    }
  }

  return (
    <Modal title={t('productSerials.importCsv')} description={t('productSerials.importDescription')} onClose={onClose}>
      <div className="space-y-4">
        {error ? <Alert type="error">{error}</Alert> : null}

        <div>
          <label className="label">{t('products.product')}</label>
          <Select className="input" value={productId} onChange={(event) => { setProductId(event.target.value); setRows([]); setFileName(''); }}>
            <option value="">{t('productSerials.selectProduct')}</option>
            {serialRequiredProducts.map((product) => (
              <option key={product.id} value={product.id}>{product.name}</option>
            ))}
          </Select>
          {!serialRequiredProducts.length ? (
            <p className="mt-1 text-xs font-semibold text-rose-600">{t('productSerials.noSerialProducts')}</p>
          ) : null}
        </div>

        <div>
          <label className="label">{t('productSerials.importFileLabel')}</label>
          <input className="input" type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} />
          <p className="mt-1 text-xs text-slate-500">{t('productSerials.importFileHint')}</p>
        </div>

        <button type="button" className="btn-secondary h-9 px-3 text-xs" onClick={downloadTemplate}>
          <Download size={14} />
          {t('productSerials.downloadTemplate')}
        </button>

        {rows.length ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
            {t('productSerials.importPreviewCount', { count: rows.length, file: fileName })}
          </div>
        ) : null}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={importing}>
            {t('common.cancel')}
          </button>
          <button type="button" className="btn-primary" onClick={handleImport} disabled={importing || !rows.length}>
            {importing ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
            {importing ? t('common.saving') : t('productSerials.importCsv')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
