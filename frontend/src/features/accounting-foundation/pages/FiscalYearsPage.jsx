import { useEffect, useState } from 'react';
import { Alert, Badge, Modal, SectionHeader } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';

function FiscalYearFormModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '', isActive: true });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    const result = await onSave(form);
    setSaving(false);
    if (result?.error) setError(result.error);
  }

  return (
    <Modal title="Create Fiscal Year" onClose={onClose} width="max-w-xl">
      <form className="space-y-4" onSubmit={submit}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <label><span className="label">Name</span><input className="input" value={form.name} onChange={(e) => setForm((cur) => ({ ...cur, name: e.target.value }))} required /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label><span className="label">Start Date</span><input type="date" className="input" value={form.startDate} onChange={(e) => setForm((cur) => ({ ...cur, startDate: e.target.value }))} required /></label>
          <label><span className="label">End Date</span><input type="date" className="input" value={form.endDate} onChange={(e) => setForm((cur) => ({ ...cur, endDate: e.target.value }))} required /></label>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm((cur) => ({ ...cur, isActive: e.target.checked }))} /> Set as active</label>
        <div className="flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={onClose}>Cancel</button><button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button></div>
      </form>
    </Modal>
  );
}

export default function FiscalYearsPage() {
  const { can, pushToast } = useInventoryApp();
  const canManage = can('manage_fiscal_years');
  const canManagePeriods = can('manage_accounting_periods');
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  async function load() {
    try {
      const result = await inventoryApi.listFiscalYears();
      setItems(result.fiscalYears || []);
      setError('');
    } catch (err) {
      setError(err?.message || 'Failed to load fiscal years.');
    }
  }

  useEffect(() => { load(); }, []);

  async function createYear(form) {
    try {
      await inventoryApi.createFiscalYear(form);
      setShowCreate(false);
      await load();
      pushToast('success', 'Fiscal Years', 'Fiscal year created.');
      return { ok: true };
    } catch (err) {
      return { error: err?.message || 'Request failed.' };
    }
  }

  async function transition(fn, id, message) {
    try {
      await fn(id);
      await load();
      pushToast('success', 'Fiscal Years', message);
    } catch (err) {
      setError(err?.message || 'Request failed.');
    }
  }

  return (
    <div>
      <SectionHeader eyebrow="Accounting" title="Fiscal Years & Periods" description="Monthly accounting periods live under each fiscal year and posting is blocked when a period is closed or locked." action={canManage ? <button type="button" className="btn-primary" onClick={() => setShowCreate(true)}>Create Fiscal Year</button> : null} />
      {error ? <Alert type="error">{error}</Alert> : null}
      <div className="space-y-4">
        {items.map((year) => (
          <section key={year.id} className="surface overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold text-slate-950">{year.name}</h2>
                  {year.isActive ? <Badge tone="emerald">Active</Badge> : null}
                  <Badge tone={year.status === 'CLOSED' ? 'rose' : 'blue'}>{year.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-500">{year.startDate} to {year.endDate}</p>
              </div>
              {canManage ? (
                <div className="flex flex-wrap gap-2">
                  {!year.isActive && year.status !== 'CLOSED' ? <button type="button" className="btn-secondary" onClick={() => transition(inventoryApi.activateFiscalYear, year.id, 'Fiscal year activated.')}>Set Active</button> : null}
                  {year.status !== 'CLOSED' ? <button type="button" className="btn-secondary" onClick={() => transition(inventoryApi.closeFiscalYear, year.id, 'Fiscal year closed.')}>Close Year</button> : null}
                </div>
              ) : null}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-3">Period</th>
                    <th className="px-4 py-3">Date Range</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Locked</th>
                    {canManagePeriods ? <th className="px-4 py-3 text-right">Actions</th> : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {year.periods?.map((period) => (
                    <tr key={period.id} className="hover:bg-slate-50">
                      <td className="table-cell font-semibold text-slate-950">{period.name}</td>
                      <td className="table-cell">{period.startDate} to {period.endDate}</td>
                      <td className="table-cell"><Badge tone={period.status === 'CLOSED' ? 'rose' : 'blue'}>{period.status}</Badge></td>
                      <td className="table-cell">{period.locked ? 'Yes' : 'No'}</td>
                      {canManagePeriods ? (
                        <td className="table-cell text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            {!period.locked ? <button type="button" className="btn-secondary" onClick={() => transition(inventoryApi.lockAccountingPeriod, period.id, 'Period locked.')}>Lock</button> : null}
                            {period.status !== 'CLOSED' ? <button type="button" className="btn-secondary" onClick={() => transition(inventoryApi.closeAccountingPeriod, period.id, 'Period closed.')}>Close</button> : <button type="button" className="btn-secondary" onClick={() => transition(inventoryApi.reopenAccountingPeriod, period.id, 'Period reopened.')}>Reopen</button>}
                            {period.status === 'CLOSED' ? null : <button type="button" className="btn-secondary" onClick={() => transition(inventoryApi.openAccountingPeriod, period.id, 'Period opened.')}>Open</button>}
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
      {showCreate ? <FiscalYearFormModal onClose={() => setShowCreate(false)} onSave={createYear} /> : null}
    </div>
  );
}
