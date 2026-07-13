import { FileText, Trash2 } from 'lucide-react';
import { EmptyState } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';

export default function DocumentsList({ planId, documents = [], canManage, onChanged }) {
  const { t, removeInstallmentDocument } = useInventoryApp();

  if (!documents.length) {
    return <EmptyState title={t('installments.documents.emptyTitle')} description={t('installments.documents.emptyDescription')} icon={FileText} />;
  }

  async function handleRemove(document) {
    const result = await removeInstallmentDocument(planId, document);
    if (result?.ok) onChanged();
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {documents.map((document) => (
        <div key={document.id} className="overflow-hidden rounded-2xl border border-slate-200">
          <div className="aspect-video w-full overflow-hidden bg-slate-50">
            <img src={document.url} alt={document.documentType} className="h-full w-full object-cover" />
          </div>
          <div className="flex items-center justify-between p-3">
            <p className="text-xs font-semibold text-slate-700">{t(`installments.documents.types.${document.documentType}`)}</p>
            {canManage ? (
              <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" title={t('common.delete')} onClick={() => handleRemove(document)}>
                <Trash2 size={16} />
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
