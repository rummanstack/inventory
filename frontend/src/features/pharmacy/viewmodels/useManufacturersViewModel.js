import { useState, useEffect, useCallback } from 'react';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';

export function useManufacturersViewModel() {
  const { pushToast } = useInventoryApp();

  const [manufacturers, setManufacturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [form, setForm] = useState(emptyForm());

  function emptyForm() {
    return { name: '', shortName: '', country: '', dgdaLicense: '', phone: '', address: '', status: 'ACTIVE' };
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await inventoryApi.listManufacturers();
      setManufacturers(data.manufacturers || []);
    } catch {
      pushToast('error', 'Error', 'Failed to load manufacturers.');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditTarget(null);
    setForm(emptyForm());
    setModalOpen(true);
  }

  function openEdit(m) {
    setEditTarget(m);
    setForm({
      name: m.name,
      shortName: m.shortName || '',
      country: m.country || '',
      dgdaLicense: m.dgdaLicense || '',
      phone: m.phone || '',
      address: m.address || '',
      status: m.status || 'ACTIVE',
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditTarget(null);
  }

  async function save() {
    if (!form.name.trim()) { pushToast('error', 'Validation', 'Manufacturer name is required.'); return; }
    setSaving(true);
    try {
      if (editTarget) {
        await inventoryApi.updateManufacturer(editTarget.id, form);
        pushToast('success', 'Updated', 'Manufacturer updated.');
      } else {
        await inventoryApi.createManufacturer(form);
        pushToast('success', 'Created', 'Manufacturer created.');
      }
      closeModal();
      load();
    } catch (err) {
      pushToast('error', 'Error', err.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await inventoryApi.deleteManufacturer(deleteTarget.id);
      pushToast('success', 'Deleted', 'Manufacturer deleted.');
      setDeleteTarget(null);
      load();
    } catch (err) {
      pushToast('error', 'Error', err.message || 'Cannot delete — manufacturer may still have products.');
    } finally {
      setSaving(false);
    }
  }

  return {
    manufacturers,
    loading,
    saving,
    modalOpen,
    editTarget,
    deleteTarget,
    form,
    setForm,
    openCreate,
    openEdit,
    closeModal,
    save,
    setDeleteTarget,
    confirmDelete,
  };
}
