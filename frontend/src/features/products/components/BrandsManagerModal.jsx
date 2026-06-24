import { useState } from 'react';
import { Check, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Alert, Badge, EmptyState, Modal, TableSkeleton } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { useBrandsViewModel } from '../viewmodels/useBrandsViewModel';

export default function BrandsManagerModal({ onClose, onChanged }) {
  const { t, confirm } = useInventoryApp();
  const vm = useBrandsViewModel();
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  async function handleAdd(event) {
    event.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    const result = await vm.createBrand(newName.trim());
    setAdding(false);
    if (result.ok) {
      setNewName('');
      onChanged?.();
    }
  }

  function startEditing(brand) {
    setEditingId(brand.id);
    setEditingName(brand.name);
  }

  async function handleRename(brand) {
    if (!editingName.trim() || editingName.trim() === brand.name) {
      setEditingId(null);
      return;
    }
    setSavingId(brand.id);
    const result = await vm.renameBrand(brand.id, editingName.trim());
    setSavingId(null);
    if (result.ok) {
      setEditingId(null);
      onChanged?.();
    }
  }

  async function handleDelete(brand) {
    const { confirmed } = await confirm({
      title: t('brands.deleteTitle'),
      description: t('brands.deleteConfirm').replace('{name}', brand.name),
      confirmLabel: t('common.delete'),
      tone: 'rose',
    });
    if (!confirmed) return;

    setDeletingId(brand.id);
    const result = await vm.deleteBrand(brand.id);
    setDeletingId(null);
    if (result.ok) {
      onChanged?.();
    }
  }

  return (
    <Modal title={t('brands.title')} description={t('brands.description')} onClose={onClose} width="max-w-lg">
      <form onSubmit={handleAdd} className="mb-4 flex gap-2">
        <input
          className="input"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder={t('brands.namePlaceholder')}
          disabled={adding}
        />
        <button type="submit" className="btn-primary shrink-0" disabled={adding || !newName.trim()}>
          {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          {t('brands.add')}
        </button>
      </form>

      {vm.error ? <Alert type="error">{vm.error}</Alert> : null}

      {vm.loading ? (
        <TableSkeleton columns={1} rows={4} showHeader={false} />
      ) : !vm.brands.length ? (
        <EmptyState title={t('brands.noneTitle')} description={t('brands.noneDescription')} />
      ) : (
        <ul className="max-h-96 space-y-1.5 overflow-y-auto">
          {vm.brands.map((brand) => (
            <li key={brand.id} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
              {editingId === brand.id ? (
                <>
                  <input
                    autoFocus
                    className="input h-9 flex-1"
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                    disabled={savingId === brand.id}
                  />
                  <button type="button" className="icon-btn text-emerald-600" title={t('common.save')} onClick={() => handleRename(brand)} disabled={savingId === brand.id}>
                    {savingId === brand.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  </button>
                  <button type="button" className="icon-btn" title={t('common.cancel')} onClick={() => setEditingId(null)} disabled={savingId === brand.id}>
                    <X size={16} />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 truncate text-sm font-semibold text-slate-950">{brand.name}</span>
                  <Badge tone="slate">{brand.productCount || 0} {t('products.title')}</Badge>
                  <button type="button" className="icon-btn" title={t('common.edit')} onClick={() => startEditing(brand)}>
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn text-rose-600 hover:text-rose-700"
                    title={t('common.delete')}
                    onClick={() => handleDelete(brand)}
                    disabled={deletingId === brand.id}
                  >
                    {deletingId === brand.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
