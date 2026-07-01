import { useState } from 'react';
import { Check, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Alert, Badge, EmptyState, Modal, TableSkeleton, Select } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';

const COUNTRIES = ['Bangladesh', 'India', 'China', 'USA', 'UK', 'Germany', 'Switzerland', 'South Korea', 'Japan', 'Pakistan', 'Other'];

function emptyEdit(m) {
  return { name: m.name, shortName: m.shortName || '', country: m.country || '', dgdaLicense: m.dgdaLicense || '', phone: m.phone || '', address: m.address || '', status: m.status };
}

export default function ManufacturersManagerModal({ onClose, onChanged }) {
  const { t, confirm, pushToast } = useInventoryApp();
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');

  useState(() => {
    inventoryApi.listManufacturers()
      .then((r) => setItems(r.manufacturers || []))
      .catch(() => setError('Failed to load.'))
      .finally(() => setLoading(false));
  });

  async function handleAdd(event) {
    event.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    setError('');
    try {
      await inventoryApi.createManufacturer({ name: newName.trim() });
      setNewName('');
      const r = await inventoryApi.listManufacturers();
      setItems(r.manufacturers || []);
      onChanged?.();
    } catch (err) {
      setError(err.message || 'Failed to add.');
    } finally {
      setAdding(false);
    }
  }

  async function handleSaveEdit(item) {
    if (!editForm.name?.trim()) return;
    setSavingId(item.id);
    setError('');
    try {
      await inventoryApi.updateManufacturer(item.id, editForm);
      setEditingId(null);
      const r = await inventoryApi.listManufacturers();
      setItems(r.manufacturers || []);
      onChanged?.();
    } catch (err) {
      setError(err.message || 'Failed to save.');
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(item) {
    const { confirmed } = await confirm({
      title: t('pharmacy.deleteManufacturer'),
      description: `${t('pharmacy.deleteManufacturerConfirm', { name: item.name })}`,
      confirmLabel: t('common.delete'),
      tone: 'rose',
    });
    if (!confirmed) return;
    setDeletingId(item.id);
    try {
      await inventoryApi.deleteManufacturer(item.id);
      const r = await inventoryApi.listManufacturers();
      setItems(r.manufacturers || []);
      onChanged?.();
    } catch (err) {
      pushToast('error', 'Error', err.message || 'Cannot delete — it may still have products.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Modal title={t('pharmacy.manufacturers')} description={t('pharmacy.manufacturersSubtitle')} onClose={onClose} width="max-w-xl">
      <form onSubmit={handleAdd} className="mb-4 flex gap-2">
        <input
          className="input"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={t('pharmacy.manufacturerName')}
          disabled={adding}
        />
        <button type="submit" className="btn-primary shrink-0" disabled={adding || !newName.trim()}>
          {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          {t('common.add')}
        </button>
      </form>

      {error ? <Alert type="error">{error}</Alert> : null}

      {loading ? (
        <TableSkeleton columns={1} rows={4} showHeader={false} />
      ) : !items?.length ? (
        <EmptyState title={t('pharmacy.noManufacturers')} description={t('pharmacy.noManufacturersHint')} />
      ) : (
        <ul className="max-h-[28rem] space-y-1.5 overflow-y-auto">
          {items.map((item) => (
            <li key={item.id} className="rounded-xl border border-slate-200 px-3 py-2">
              {editingId === item.id ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input className="input h-8 text-sm" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} placeholder={t('pharmacy.manufacturerName')} disabled={savingId === item.id} />
                    <input className="input h-8 text-sm" value={editForm.shortName} onChange={(e) => setEditForm((f) => ({ ...f, shortName: e.target.value }))} placeholder={t('pharmacy.shortName')} disabled={savingId === item.id} />
                    <Select className="input h-8 text-sm" value={editForm.country} onChange={(e) => setEditForm((f) => ({ ...f, country: e.target.value }))} disabled={savingId === item.id}>
                      <option value="">{t('pharmacy.country')}</option>
                      {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </Select>
                    <input className="input h-8 text-sm" value={editForm.dgdaLicense} onChange={(e) => setEditForm((f) => ({ ...f, dgdaLicense: e.target.value }))} placeholder={t('pharmacy.dgdaLicense')} disabled={savingId === item.id} />
                    <input className="input h-8 text-sm" value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} placeholder={t('pharmacy.phone')} disabled={savingId === item.id} />
                    <Select className="input h-8 text-sm" value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))} disabled={savingId === item.id}>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" className="icon-btn text-emerald-600" onClick={() => handleSaveEdit(item)} disabled={savingId === item.id}>
                      {savingId === item.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    </button>
                    <button type="button" className="icon-btn" onClick={() => setEditingId(null)} disabled={savingId === item.id}>
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-slate-950">{item.name}</span>
                    {(item.shortName || item.country) && (
                      <span className="block text-xs text-slate-500">{[item.shortName, item.country].filter(Boolean).join(' · ')}</span>
                    )}
                  </div>
                  <Badge tone={item.status === 'ACTIVE' ? 'green' : 'slate'} className="shrink-0">{item.productCount || 0} {t('products.title')}</Badge>
                  <button type="button" className="icon-btn shrink-0" onClick={() => { setEditingId(item.id); setEditForm(emptyEdit(item)); }}>
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

