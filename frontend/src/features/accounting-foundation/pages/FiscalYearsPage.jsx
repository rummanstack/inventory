import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Modal, SectionHeader } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantReportQuery } from '../../reports/queries/useTenantReportQuery.js';
import { transactionKeys } from '../../transactions/queries/transactionQueries.js';
import { getActiveTenantId } from '../../../services/api/client.js';

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

function CloseFiscalYearModal({ year, preview, submitting, onClose, onConfirm }) {
  return (
    <Modal title={`Close ${year.name}`} onClose={onClose} width="max-w-2xl">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">Review the close checklist before locking the fiscal year.</p>
        <div className="space-y-3">
          {preview?.checks?.map((check) => (
            <div key={check.key} className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 px-4 py-3">
              <div>
                <div className="font-medium text-slate-900">{check.label}</div>
                <div className="text-xs text-slate-500">{Object.entries(check.details || {}).map(([key, value]) => `${key}: ${value}`).join(' | ') || 'No exceptions found.'}</div>
              </div>
              <Badge tone={check.passed ? 'emerald' : 'rose'}>{check.passed ? 'Passed' : 'Failed'}</Badge>
            </div>
          ))}
        </div>
        {!preview?.canClose ? <Alert type="error">Close is blocked until every checklist item passes.</Alert> : null}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary" disabled={!preview?.canClose || submitting} onClick={onConfirm}>{submitting ? 'Closing...' : 'Close Fiscal Year'}</button>
        </div>
      </div>
    </Modal>
  );
}

function ReopenFiscalYearModal({ year, onClose, onConfirm }) {
  const [reason, setReason] = useState(`Reopen ${year.name}`);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    const result = await onConfirm(reason);
    setSaving(false);
    if (result?.error) setError(result.error);
  }

  return (
    <Modal title={`Reopen ${year.name}`} onClose={onClose} width="max-w-xl">
      <form className="space-y-4" onSubmit={submit}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <label>
          <span className="label">Reason</span>
          <textarea className="input min-h-28" value={reason} onChange={(e) => setReason(e.target.value)} required />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Reopening...' : 'Reopen Fiscal Year'}</button>
        </div>
      </form>
    </Modal>
  );
}

function GenerateOpeningModal({ targetYear, years, onClose, onConfirm }) {
  const candidateYears = useMemo(
    () => years.filter((year) => year.id !== targetYear.id && year.status === 'CLOSED' && year.endDate < targetYear.startDate),
    [targetYear.id, targetYear.startDate, years],
  );
  const [sourceFiscalYearId, setSourceFiscalYearId] = useState(candidateYears[0]?.id || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    const result = await onConfirm(sourceFiscalYearId);
    setSaving(false);
    if (result?.error) setError(result.error);
  }

  return (
    <Modal title={`Generate Openings for ${targetYear.name}`} onClose={onClose} width="max-w-xl">
      <form className="space-y-4" onSubmit={submit}>
        {error ? <Alert type="error">{error}</Alert> : null}
        {!candidateYears.length ? <Alert type="error">No closed source fiscal year is available before this year.</Alert> : null}
        <label>
          <span className="label">Source Fiscal Year</span>
          <select className="input" value={sourceFiscalYearId} onChange={(e) => setSourceFiscalYearId(e.target.value)} disabled={!candidateYears.length} required>
            {candidateYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
          </select>
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving || !candidateYears.length}>{saving ? 'Generating...' : 'Generate Opening Balances'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function FiscalYearsPage() {
  const queryClient = useQueryClient();
  const { can, pushToast } = useInventoryApp();
  const canManage = can('manage_fiscal_years');
  const canManagePeriods = can('manage_accounting_periods');
  const canCloseYear = can('fiscal_year.close') || can('accounting.admin') || canManage;
  const canReopenYear = can('fiscal_year.reopen') || can('accounting.admin');
  const canGenerateOpening = can('opening_balance.generate') || can('accounting.admin');
  const canLockPeriod = can('period.lock') || can('accounting.admin') || canManagePeriods;
  const canUnlockPeriod = can('period.unlock') || can('accounting.admin');

  const [actionError, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [closeTarget, setCloseTarget] = useState(null);
  const [closePreview, setClosePreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [closingYear, setClosingYear] = useState(false);
  const [reopenTarget, setReopenTarget] = useState(null);
  const [openingTarget, setOpeningTarget] = useState(null);
  const yearsQuery = useTenantReportQuery({
    scope: 'fiscal-years',
    queryFn: () => inventoryApi.listFiscalYears(),
    staleTime: 60_000,
  });
  const accountingMutation = useMutation({
    mutationKey: transactionKeys.mutation(getActiveTenantId(), 'fiscal-year-workflow'),
    mutationFn: ({ fn, args = [] }) => fn(...args),
  });
  const items = yearsQuery.data?.fiscalYears || [];
  const error = actionError || yearsQuery.error?.message || '';
  const load = yearsQuery.refetch;

  async function createYear(form) {
    try {
      await accountingMutation.mutateAsync({ fn: inventoryApi.createFiscalYear, args: [form] });
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
      await accountingMutation.mutateAsync({ fn, args: [id] });
      await load();
      pushToast('success', 'Fiscal Years', message);
    } catch (err) {
      setError(err?.message || 'Request failed.');
    }
  }

  async function openClosePreview(year) {
    setLoadingPreview(true);
    setError('');
    try {
      const result = await queryClient.fetchQuery({
        queryKey: transactionKeys.detail(getActiveTenantId(), 'fiscal-year-close-preview', year.id),
        queryFn: () => inventoryApi.previewFiscalYearClose(year.id),
        staleTime: 30_000,
      });
      setCloseTarget(year);
      setClosePreview(result.preview || null);
    } catch (err) {
      setError(err?.message || 'Failed to load close checklist.');
    } finally {
      setLoadingPreview(false);
    }
  }

  async function confirmCloseYear() {
    if (!closeTarget) return;
    setClosingYear(true);
    try {
      await accountingMutation.mutateAsync({ fn: inventoryApi.closeFiscalYear, args: [closeTarget.id] });
      setCloseTarget(null);
      setClosePreview(null);
      await load();
      pushToast('success', 'Fiscal Years', 'Fiscal year closed.');
    } catch (err) {
      setError(err?.message || 'Failed to close fiscal year.');
    } finally {
      setClosingYear(false);
    }
  }

  async function confirmReopenYear(reason) {
    try {
      await accountingMutation.mutateAsync({ fn: inventoryApi.reopenFiscalYear, args: [reopenTarget.id, { reason }] });
      setReopenTarget(null);
      await load();
      pushToast('success', 'Fiscal Years', 'Fiscal year reopened.');
      return { ok: true };
    } catch (err) {
      return { error: err?.message || 'Failed to reopen fiscal year.' };
    }
  }

  async function confirmGenerateOpening(sourceFiscalYearId) {
    try {
      const result = await accountingMutation.mutateAsync({ fn: inventoryApi.generateYearOpening, args: [openingTarget.id, { sourceFiscalYearId }] });
      setOpeningTarget(null);
      await load();
      pushToast('success', 'Opening Balances', `${result.createdCount || 0} opening balances generated.`);
      return { ok: true };
    } catch (err) {
      return { error: err?.message || 'Failed to generate opening balances.' };
    }
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Accounting"
        title="Fiscal Years & Periods"
        description="Control posting windows, close years with a checklist, and carry balances into the next fiscal year."
        action={canManage ? <button type="button" className="btn-primary" onClick={() => setShowCreate(true)}>Create Fiscal Year</button> : null}
      />
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
                  {year.openingGeneratedAt ? <Badge tone="indigo">Openings Generated</Badge> : null}
                </div>
                <p className="mt-1 text-sm text-slate-500">{year.startDate} to {year.endDate}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {canManage && !year.isActive && year.status !== 'CLOSED' ? <button type="button" className="btn-secondary" onClick={() => transition(inventoryApi.activateFiscalYear, year.id, 'Fiscal year activated.')}>Set Active</button> : null}
                {canCloseYear && year.status !== 'CLOSED' ? <button type="button" className="btn-secondary" disabled={loadingPreview} onClick={() => openClosePreview(year)}>{loadingPreview ? 'Loading...' : 'Close Checklist'}</button> : null}
                {canReopenYear && year.status === 'CLOSED' ? <button type="button" className="btn-secondary" onClick={() => setReopenTarget(year)}>Reopen Year</button> : null}
                {canGenerateOpening && year.status !== 'CLOSED' ? <button type="button" className="btn-secondary" onClick={() => setOpeningTarget(year)}>Generate Openings</button> : null}
              </div>
            </div>
            <div className="divide-y divide-slate-100 md:hidden">
              {year.periods?.map((period) => (
                <div key={period.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-950">{period.name}</p>
                      <p className="mt-0.5 truncate text-xs font-medium text-slate-500">{period.startDate} to {period.endDate}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <Badge tone={period.status === 'CLOSED' ? 'rose' : 'blue'}>{period.status}</Badge>
                      <p className="mt-0.5 text-xs font-medium text-slate-500">{period.locked ? 'Locked' : 'Unlocked'}</p>
                    </div>
                  </div>
                  {(canManagePeriods || canUnlockPeriod || canLockPeriod) ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {canLockPeriod && !period.locked ? <button type="button" className="btn-secondary h-8 px-2.5 text-xs" onClick={() => transition(inventoryApi.lockAccountingPeriod, period.id, 'Period locked.')}>Lock</button> : null}
                      {canUnlockPeriod && period.locked ? <button type="button" className="btn-secondary h-8 px-2.5 text-xs" onClick={() => transition(inventoryApi.unlockAccountingPeriod, period.id, 'Period unlocked.')}>Unlock</button> : null}
                      {canManagePeriods ? (
                        period.status !== 'CLOSED'
                          ? <button type="button" className="btn-secondary h-8 px-2.5 text-xs" onClick={() => transition(inventoryApi.closeAccountingPeriod, period.id, 'Period closed.')}>Close</button>
                          : <button type="button" className="btn-secondary h-8 px-2.5 text-xs" onClick={() => transition(inventoryApi.reopenAccountingPeriod, period.id, 'Period reopened.')}>Reopen</button>
                      ) : null}
                      {canManagePeriods && period.status !== 'CLOSED' ? <button type="button" className="btn-secondary h-8 px-2.5 text-xs" onClick={() => transition(inventoryApi.openAccountingPeriod, period.id, 'Period opened.')}>Open</button> : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-3">Period</th>
                    <th className="px-4 py-3">Date Range</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Locked</th>
                    {(canManagePeriods || canUnlockPeriod || canLockPeriod) ? <th className="px-4 py-3 text-right">Actions</th> : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {year.periods?.map((period) => (
                    <tr key={period.id} className="hover:bg-slate-50">
                      <td className="table-cell font-semibold text-slate-950">{period.name}</td>
                      <td className="table-cell">{period.startDate} to {period.endDate}</td>
                      <td className="table-cell"><Badge tone={period.status === 'CLOSED' ? 'rose' : 'blue'}>{period.status}</Badge></td>
                      <td className="table-cell">{period.locked ? 'Yes' : 'No'}</td>
                      {(canManagePeriods || canUnlockPeriod || canLockPeriod) ? (
                        <td className="table-cell text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            {canLockPeriod && !period.locked ? <button type="button" className="btn-secondary" onClick={() => transition(inventoryApi.lockAccountingPeriod, period.id, 'Period locked.')}>Lock</button> : null}
                            {canUnlockPeriod && period.locked ? <button type="button" className="btn-secondary" onClick={() => transition(inventoryApi.unlockAccountingPeriod, period.id, 'Period unlocked.')}>Unlock</button> : null}
                            {canManagePeriods ? (
                              period.status !== 'CLOSED'
                                ? <button type="button" className="btn-secondary" onClick={() => transition(inventoryApi.closeAccountingPeriod, period.id, 'Period closed.')}>Close</button>
                                : <button type="button" className="btn-secondary" onClick={() => transition(inventoryApi.reopenAccountingPeriod, period.id, 'Period reopened.')}>Reopen</button>
                            ) : null}
                            {canManagePeriods && period.status !== 'CLOSED' ? <button type="button" className="btn-secondary" onClick={() => transition(inventoryApi.openAccountingPeriod, period.id, 'Period opened.')}>Open</button> : null}
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
      {closeTarget && closePreview ? <CloseFiscalYearModal year={closeTarget} preview={closePreview} submitting={closingYear} onClose={() => { setCloseTarget(null); setClosePreview(null); }} onConfirm={confirmCloseYear} /> : null}
      {reopenTarget ? <ReopenFiscalYearModal year={reopenTarget} onClose={() => setReopenTarget(null)} onConfirm={confirmReopenYear} /> : null}
      {openingTarget ? <GenerateOpeningModal targetYear={openingTarget} years={items} onClose={() => setOpeningTarget(null)} onConfirm={confirmGenerateOpening} /> : null}
    </div>
  );
}
