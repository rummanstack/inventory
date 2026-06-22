import { useState } from 'react';
import { PackagePlus } from 'lucide-react';
import { Alert, Modal } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCasePiece, formatNumber, toPieces } from '../../../utils/calculations.js';

export default function StockUpdateModal({ product, mode = 'add', onClose, onSave }) {
  const { t, tenant } = useInventoryApp();
  const isOpening = mode === 'opening';
  const isElectronics = (tenant?.businessType || 'ELECTRONICS') === 'ELECTRONICS';
  const [caseQty, setCaseQty] = useState(0);
  const [pieceQty, setPieceQty] = useState(0);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const addPieces = toPieces(caseQty, pieceQty, product.piecesPerCase);
  const nextStock = product.stockPieces + addPieces;

  async function submitForm(event) {
    event.preventDefault();
    if (addPieces <= 0) {
      setError(t('products.stockError'));
      return;
    }

    setSaving(true);
    setError('');
    const result = await onSave(product.id, addPieces, reason.trim());
    setSaving(false);

    if (!result?.ok) {
      setError(result?.message || t('products.stockUpdateFailed'));
    }
  }

  return (
    <Modal title={isOpening ? t('products.openingStock') : t('products.addStock')} description={isOpening ? t('products.openingStockDescription') : product.name} onClose={onClose} width="max-w-xl">
      <form className="space-y-4" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">{t('products.currentStock')}</p>
            <p className="mt-1 text-lg font-bold text-slate-950">
              {isElectronics ? `${formatNumber(product.stockPieces)} ${t('common.pcs')}` : formatCasePiece(product.stockPieces, product.piecesPerCase)}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">{t('products.afterUpdate')}</p>
            <p className="mt-1 text-lg font-bold text-emerald-700">
              {isElectronics ? `${formatNumber(nextStock)} ${t('common.pcs')}` : formatCasePiece(nextStock, product.piecesPerCase)}
            </p>
          </div>
        </div>
        <div className={isElectronics ? 'grid gap-4' : 'grid gap-4 sm:grid-cols-2'}>
          {!isElectronics ? (
            <div>
              <label className="label">{t('products.addCase')}</label>
              <input className="input" type="number" min="0" value={caseQty} onChange={(event) => setCaseQty(event.target.value)} />
            </div>
          ) : null}
          <div>
            <label className="label">{t('products.addPiece')}</label>
            <input className="input" type="number" min="0" value={pieceQty} onChange={(event) => setPieceQty(event.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">{t('products.stockNoteLabel')}</label>
          <textarea className="input min-h-20" value={reason} onChange={(event) => setReason(event.target.value)} placeholder={t('products.stockNotePlaceholder')} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            {isOpening ? t('products.skipOpeningStock') : t('common.cancel')}
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <PackagePlus size={18} />
            {saving ? t('common.saving') : t('products.updateStock')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
