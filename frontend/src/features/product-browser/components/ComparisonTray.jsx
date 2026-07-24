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
        <div className="surface flex w-full max-w-2xl flex-wrap items-center gap-2 px-3 py-3 shadow-modal sm:gap-3 sm:px-4">
          <Scale size={18} className="shrink-0 text-brand" />
          <span className="min-w-0 flex-1 text-sm font-semibold text-slate-950">
            {t('productBrowser.compareCount').replace('{count}', compareIds.length)}
          </span>
          <button type="button" className="btn-secondary ml-auto" onClick={onClear}>
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
