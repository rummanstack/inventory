import { useState } from 'react';
import { Check, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Alert, Badge, EmptyState, Modal, TableSkeleton } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';

export default function GenericMedicinesManagerModal({ onClose, onChanged }) {
  const { t, confirm, pushToast } = useInventoryApp();
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', description: '' });
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', status: 'ACTIVE' });
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');

  useState(() => {
    inventoryApi.listGenericMedicines()
      .then((r) => setItems(r.genericMedicines || []))
      .catch(() => setError('Failed to load.'))
      .finally(() => setLoading(false));
  });

  async function handleAdd(event) {
    event.preventDefault();
    if (!form.name.trim()) return;
    setAdding(true);
    setError('');
    try {
      await inventoryApi.createGenericMedicine({ name: form.name.trim(), description: form.description.trim() });
      setForm({ name: '', description: '' });
      const r = await inventoryApi.listGenericMedicines();
      setItems(r.genericMedicines || []);
      onChanged?.();
    } catch (err) {
      setError(err.message || 'Failed to add.');
    } finally {
      setAdding(false);
    }
  }

  function startEditing(item) {
    setEditingId(item.id);
    setEditForm({ name: item.name, description: item.description || '', status: item.status });
  }

  async function handleSaveEdit(item) {
    if (!editForm.name.trim()) return;
    setSavingId(item.id);
    setError('');
    try {
      await inventoryApi.updateGenericMedicine(item.id, editForm);
      setEditingId(null);
      const r = await inventoryApi.listGenericMedicines();
      setItems(r.genericMedicines || []);
      onChanged?.();
    } catch (err) {
      setError(err.message || 'Failed to save.');
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(item) {
    const { confirmed } = await confirm({
      title: t('genericMedicines.deleteTitle'),
      description: `${t('genericMedicines.deleteConfirm')} "${item.name}"?`,
      confirmLabel: t('common.delete'),
      tone: 'rose',
    });
    if (!confirmed) return;
    setDeletingId(item.id);
    try {
      await inventoryApi.deleteGenericMedicine(item.id);
      const r = await inventoryApi.listGenericMedicines();
      setItems(r.genericMedicines || []);
      onChanged?.();
    } catch (err) {
      pushToast('error', 'Error', err.message || 'Cannot delete — it may still have products.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Modal title={t('genericMedicines.title')} description={t('genericMedicines.description')} onClose={onClose} width="max-w-lg">
      <form onSubmit={handleAdd} className="mb-4 space-y-2">
        <div className="flex gap-2">
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder={t('genericMedicines.namePlaceholder')}
            disabled={adding}
          />
          <button type="submit" className="btn-primary shrink-0" disabled={adding || !form.name.trim()}>
            {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {t('common.add')}
          </button>
        </div>
        <input
          className="input text-sm"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder={t('genericMedicines.descriptionPlaceholder')}
          disabled={adding}
        />
      </form>

      {error ? <Alert type="error">{error}</Alert> : null}

      {loading ? (
        <TableSkeleton columns={1} rows={4} showHeader={false} />
      ) : !items?.length ? (
        <EmptyState title={t('genericMedicines.noneTitle')} description={t('genericMedicines.noneDescription')} />
      ) : (
        <ul className="max-h-96 space-y-1.5 overflow-y-auto">
          {items.map((item) => (
            <li key={item.id} className="rounded-xl border border-slate-200 px-3 py-2">
              {editingId === item.id ? (
                <div className="space-y-1.5">
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      className="input h-9 flex-1"
                      value={editForm.name}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      disabled={savingId === item.id}
                    />
                    <select className="input h-9 w-32 shrink-0" value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))} disabled={savingId === item.id}>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                    <button type="button" className="icon-btn text-emerald-600" onClick={() => handleSaveEdit(item)} disabled={savingId === item.id}>
                      {savingId === item.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    </button>
                    <button type="button" className="icon-btn" onClick={() => setEditingId(null)} disabled={savingId === item.id}>
                      <X size={16} />
                    </button>
                  </div>
                  <input
                    className="input h-8 text-sm"
                    value={editForm.description}
                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder={t('genericMedicines.descriptionPlaceholder')}
                    disabled={savingId === item.id}
                  />
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-slate-950">{item.name}</span>
                    {item.description && <span className="block truncate text-xs text-slate-500">{item.description}</span>}
                  </div>
                  <Badge tone={item.status === 'ACTIVE' ? 'green' : 'slate'} className="shrink-0">{item.productCount || 0} {t('products.title')}</Badge>
                  <button type="button" className="icon-btn shrink-0" onClick={() => startEditing(item)}>
                    <Pencil size={16} />
                  </button>
                  <button type="button" className="icon-btn shrink-0 text-rose-600" onClick={() => handleDelete(item)} disabled={deletingId === item.id}>
                    {deletingId === item.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
