import { useState } from 'react';
import { PackageX } from 'lucide-react';
import { Alert, Modal } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCasePiece, formatNumber, toPieces } from '../../../utils/calculations.js';

export default function ClearDamageModal({ product, onClose, onSave }) {
  const { t, tenant } = useInventoryApp();
  const isElectronics = (tenant?.businessType || 'ELECTRONICS') === 'ELECTRONICS';
  const [caseQty, setCaseQty] = useState(0);
  const [pieceQty, setPieceQty] = useState(0);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const clearPieces = toPieces(caseQty, pieceQty, product.piecesPerCase);
  const remainingDamaged = product.damagedPieces - clearPieces;

  async function submitForm(event) {
    event.preventDefault();
    if (clearPieces <= 0 || clearPieces > product.damagedPieces) {
      setError(t('damagedStock.clearError'));
      return;
    }

    setSaving(true);
    setError('');
    const result = await onSave(product.id, clearPieces, note.trim());
    setSaving(false);

    if (!result?.ok) {
      setError(result?.message || t('damagedStock.clearFailed'));
    }
  }

  return (
    <Modal title={t('damagedStock.clearTitle')} description={product.name} onClose={onClose} width="max-w-xl">
      <form className="space-y-4" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">{t('damagedStock.damagedQty')}</p>
            <p className="mt-1 text-lg font-bold text-slate-950">
              {isElectronics ? `${formatNumber(product.damagedPieces)} ${t('common.pcs')}` : formatCasePiece(product.damagedPieces, product.piecesPerCase)}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">{t('damagedStock.afterClear')}</p>
            <p className="mt-1 text-lg font-bold text-emerald-700">
              {isElectronics ? `${formatNumber(Math.max(0, remainingDamaged))} ${t('common.pcs')}` : formatCasePiece(Math.max(0, remainingDamaged), product.piecesPerCase)}
            </p>
          </div>
        </div>
        <div className={isElectronics ? 'grid gap-4' : 'grid gap-4 sm:grid-cols-2'}>
          {!isElectronics ? (
            <div>
              <label className="label">{t('common.case')}</label>
              <input className="input" type="number" min="0" value={caseQty} onChange={(event) => setCaseQty(event.target.value)} />
            </div>
          ) : null}
          <div>
            <label className="label">{t('common.piece')}</label>
            <input className="input" type="number" min="0" value={pieceQty} onChange={(event) => setPieceQty(event.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">{t('damagedStock.clearNoteLabel')}</label>
          <textarea className="input min-h-20" value={note} onChange={(event) => setNote(event.target.value)} placeholder={t('damagedStock.clearNotePlaceholder')} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <PackageX size={18} />
            {saving ? t('common.saving') : t('damagedStock.clearSubmit')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
