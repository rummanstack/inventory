import { useState } from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Alert, Badge, EmptyState, Modal, Select, TableSkeleton } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { useCategoryAttributesViewModel } from '../viewmodels/useCategoryAttributesViewModel.js';

const DATA_TYPES = ['text', 'number', 'boolean', 'select'];

const BLANK_FORM = { key: '', label: '', dataType: 'text', unit: '', options: '' };

export default function CategoryAttributesModal({ category, onClose }) {
  const { t, confirm } = useInventoryApp();
  const vm = useCategoryAttributesViewModel(category.id);
  const [form, setForm] = useState(BLANK_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function startEditing(attribute) {
    setEditingId(attribute.id);
    setForm({
      key: attribute.key,
      label: attribute.label,
      dataType: attribute.dataType,
      unit: attribute.unit || '',
      options: Array.isArray(attribute.options) ? attribute.options.join(', ') : '',
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(BLANK_FORM);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.label.trim() || (!editingId && !form.key.trim())) return;

    const options = form.options
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    setSaving(true);
    const result = editingId
      ? await vm.updateAttribute(editingId, { label: form.label.trim(), dataType: form.dataType, unit: form.unit.trim(), options })
      : await vm.createAttribute({ key: form.key.trim(), label: form.label.trim(), dataType: form.dataType, unit: form.unit.trim(), options });
    setSaving(false);

    if (result.ok) resetForm();
  }

  async function handleDelete(attribute) {
    const { confirmed } = await confirm({
      title: t('categoryAttributes.deleteTitle'),
      description: t('categoryAttributes.deleteConfirm').replace('{label}', attribute.label),
      confirmLabel: t('common.delete'),
      tone: 'rose',
    });
    if (!confirmed) return;

    setDeletingId(attribute.id);
    await vm.deleteAttribute(attribute.id);
    setDeletingId(null);
  }

  return (
    <Modal
      title={t('categoryAttributes.title')}
      description={t('categoryAttributes.description').replace('{category}', category.name)}
      onClose={onClose}
      width="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="mb-4 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <label className="label">{t('categoryAttributes.key')}</label>
            <input
              className="input"
              value={form.key}
              onChange={(event) => updateForm('key', event.target.value)}
              placeholder={t('categoryAttributes.keyPlaceholder')}
              disabled={Boolean(editingId)}
            />
          </div>
          <div>
            <label className="label">{t('categoryAttributes.label')}</label>
            <input className="input" value={form.label} onChange={(event) => updateForm('label', event.target.value)} placeholder={t('categoryAttributes.labelPlaceholder')} />
          </div>
          <div>
            <label className="label">{t('categoryAttributes.dataType')}</label>
            <Select className="input" value={form.dataType} onChange={(event) => updateForm('dataType', event.target.value)}>
              {DATA_TYPES.map((type) => (
                <option key={type} value={type}>{t(`categoryAttributes.dataTypes.${type}`)}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="label">{t('categoryAttributes.unit')}</label>
            <input className="input" value={form.unit} onChange={(event) => updateForm('unit', event.target.value)} placeholder={t('categoryAttributes.unitPlaceholder')} />
          </div>
          {form.dataType === 'select' ? (
            <div className="sm:col-span-2">
              <label className="label">{t('categoryAttributes.options')}</label>
              <input className="input" value={form.options} onChange={(event) => updateForm('options', event.target.value)} placeholder={t('categoryAttributes.optionsPlaceholder')} />
            </div>
          ) : null}
        </div>
        <div className="flex justify-end gap-2">
          {editingId ? (
            <button type="button" className="btn-secondary" onClick={resetForm} disabled={saving}>
              {t('common.cancel')}
            </button>
          ) : null}
          <button type="submit" className="btn-primary" disabled={saving || !form.label.trim() || (!editingId && !form.key.trim())}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {editingId ? t('common.save') : t('categoryAttributes.add')}
          </button>
        </div>
      </form>

      {vm.error ? <Alert type="error">{vm.error}</Alert> : null}

      {vm.loading ? (
        <TableSkeleton columns={1} rows={3} showHeader={false} />
      ) : !vm.attributes.length ? (
        <EmptyState title={t('categoryAttributes.noneTitle')} description={t('categoryAttributes.noneDescription')} />
      ) : (
        <ul className="max-h-72 space-y-1.5 overflow-y-auto">
          {vm.attributes.map((attribute) => (
            <li key={attribute.id} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
              <span className="flex-1">
                <span className="block text-sm font-semibold text-slate-950">{attribute.label}</span>
                <span className="block text-xs text-slate-500">{attribute.key}{attribute.unit ? ` · ${attribute.unit}` : ''}</span>
              </span>
              <Badge tone="slate">{t(`categoryAttributes.dataTypes.${attribute.dataType}`)}</Badge>
              <button type="button" className="icon-btn" title={t('common.edit')} onClick={() => startEditing(attribute)}>
                <Pencil size={16} />
              </button>
              <button
                type="button"
                className="icon-btn text-rose-600 hover:text-rose-700"
                title={t('common.delete')}
                onClick={() => handleDelete(attribute)}
                disabled={deletingId === attribute.id}
              >
                {deletingId === attribute.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
