import { useState } from 'react';
import { Loader2, Pencil, Plus, Trash2, X, Check } from 'lucide-react';
import { Alert, Badge, EmptyState, Modal, TableSkeleton } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { useCategoriesViewModel } from '../viewmodels/useCategoriesViewModel';

export default function CategoriesManagerModal({ onClose, onChanged }) {
  const { t, confirm } = useInventoryApp();
  const vm = useCategoriesViewModel();
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
    const result = await vm.createCategory(newName.trim());
    setAdding(false);
    if (result.ok) {
      setNewName('');
      onChanged?.();
    }
  }

  function startEditing(category) {
    setEditingId(category.id);
    setEditingName(category.name);
  }

  async function handleRename(category) {
    if (!editingName.trim() || editingName.trim() === category.name) {
      setEditingId(null);
      return;
    }
    setSavingId(category.id);
    const result = await vm.renameCategory(category.id, editingName.trim());
    setSavingId(null);
    if (result.ok) {
      setEditingId(null);
      onChanged?.();
    }
  }

  async function handleDelete(category) {
    const { confirmed } = await confirm({
      title: t('categories.deleteTitle'),
      description: t('categories.deleteConfirm', { name: category.name }).replace('{name}', category.name),
      confirmLabel: t('common.delete'),
      tone: 'rose',
    });
    if (!confirmed) return;

    setDeletingId(category.id);
    const result = await vm.deleteCategory(category.id);
    setDeletingId(null);
    if (result.ok) {
      onChanged?.();
    }
  }

  return (
    <Modal title={t('categories.title')} description={t('categories.description')} onClose={onClose} width="max-w-lg">
      <form onSubmit={handleAdd} className="mb-4 flex gap-2">
        <input
          className="input"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder={t('categories.namePlaceholder')}
          disabled={adding}
        />
        <button type="submit" className="btn-primary shrink-0" disabled={adding || !newName.trim()}>
          {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          {t('categories.add')}
        </button>
      </form>

      {vm.error ? <Alert type="error">{vm.error}</Alert> : null}

      {vm.loading ? (
        <TableSkeleton columns={1} rows={4} showHeader={false} />
      ) : !vm.categories.length ? (
        <EmptyState title={t('categories.noneTitle')} description={t('categories.noneDescription')} />
      ) : (
        <ul className="max-h-96 space-y-1.5 overflow-y-auto">
          {vm.categories.map((category) => (
            <li key={category.id} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
              {editingId === category.id ? (
                <>
                  <input
                    autoFocus
                    className="input h-9 flex-1"
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                    disabled={savingId === category.id}
                  />
                  <button type="button" className="icon-btn text-emerald-600" title={t('common.save')} onClick={() => handleRename(category)} disabled={savingId === category.id}>
                    {savingId === category.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  </button>
                  <button type="button" className="icon-btn" title={t('common.cancel')} onClick={() => setEditingId(null)} disabled={savingId === category.id}>
                    <X size={16} />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 truncate text-sm font-semibold text-slate-950">{category.name}</span>
                  <Badge tone="slate">{category.productCount || 0} {t('products.title')}</Badge>
                  <button type="button" className="icon-btn" title={t('common.edit')} onClick={() => startEditing(category)}>
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn text-rose-600 hover:text-rose-700"
                    title={t('common.delete')}
                    onClick={() => handleDelete(category)}
                    disabled={deletingId === category.id}
                  >
                    {deletingId === category.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
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
