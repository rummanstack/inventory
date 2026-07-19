import { useState } from 'react';
import { Scale } from 'lucide-react';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import ComparisonModal from './ComparisonModal.jsx';

export default function ComparisonTray({ compareIds, tenantId, onRemove, onClear, onAddToSale }) {
  const { t } = useInventoryApp();
  const [open, setOpen] = useState(false);

  if (compareIds.length === 0) return null;

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-3 no-print">
        <div className="surface flex w-full max-w-2xl items-center gap-3 px-4 py-3 shadow-modal">
          <Scale size={18} className="shrink-0 text-brand" />
          <span className="text-sm font-semibold text-slate-950">
            {t('productBrowser.compareCount').replace('{count}', compareIds.length)}
          </span>
          <button type="button" className="ml-auto btn-secondary" onClick={onClear}>
            {t('productBrowser.clearCompare')}
          </button>
          <button type="button" className="btn-primary" onClick={() => setOpen(true)} disabled={compareIds.length < 2}>
            {t('productBrowser.compareNow')}
          </button>
        </div>
      </div>
      {open ? (
        <ComparisonModal
          productIds={compareIds}
          tenantId={tenantId}
          onClose={() => setOpen(false)}
          onRemove={onRemove}
          onAddToSale={onAddToSale}
        />
      ) : null}
    </>
  );
}
