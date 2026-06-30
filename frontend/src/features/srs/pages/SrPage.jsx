import { useState } from 'react';
import { HandCoins, Pencil, Phone, Plus, Search, Trash2, Users } from 'lucide-react';
import { Alert, Badge, EmptyState, Modal, Pagination, SectionHeader, TableSkeleton } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { statusTone } from '../../../models/inventoryViewData.js';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency } from '../../../utils/calculations.js';
import { inventoryApi } from '../../../services/inventoryApi.js';
import SrFormModal from '../components/SrFormModal';
import { useSrViewModel } from '../viewmodels/useSrViewModel';

function CollectDueModal({ sr, onClose, onSave }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [businessDate, setBusinessDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const amountValue = Number(amount);
    if (!(amountValue > 0)) {
      setError('Amount must be greater than zero.');
      return;
    }
    setSaving(true);
    setError('');
    const result = await onSave({ amount: amountValue, note: note.trim(), businessDate });
    setSaving(false);
    if (!result?.ok) setError(result?.error || 'Failed to record collection.');
  }

  return (
    <Modal title="Collect SR Due" description={sr.name} onClose={onClose} width="max-w-lg">
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase text-slate-500">Current Balance</p>
          <p className="mt-1 text-lg font-bold text-slate-950">{formatCurrency(sr.currentDue || 0)}</p>
        </div>
        <div>
          <label className="label">Date</label>
          <DatePickerField value={businessDate} onChange={setBusinessDate} max={new Date().toISOString().slice(0, 10)} />
        </div>
        <div>
          <label className="label">Amount Collected</label>
          <input className="input" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <label className="label">Note</label>
          <textarea className="input min-h-20" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note about this collection" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <HandCoins size={18} />
            {saving ? 'Saving...' : 'Collect'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function SrPage() {
  const { saveSr, deleteSr, can } = useInventoryApp();
  const vm = useSrViewModel();
  const [srModal, setSrModal] = useState(null);
  const [collectModal, setCollectModal] = useState(null);
  const canManageSrs = can('manage_srs');

  return (
    <div>
      <SectionHeader
        eyebrow="SR Management"
        title="Sales Representatives"
        description="Manage SR due balances and handovers"
        action={canManageSrs ? (
          <button type="button" className="btn-primary" onClick={() => setSrModal({ mode: 'add' })}>
            <Plus size={18} />
            Add SR
          </button>
        ) : null}
      />

      <div className="surface overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              className="input pl-10"
              value={vm.search}
              onChange={(e) => vm.setSearch(e.target.value)}
              placeholder="Search by name or phone..."
            />
          </div>
        </div>

        {vm.loading ? (
          <div className="p-5">
            <TableSkeleton columns={5} showHeader={false} />
          </div>
        ) : vm.error ? (
          <div className="p-5">
            <Alert type="error">{vm.error}</Alert>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Current Due</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vm.items.map((sr, index) => (
                  <tr key={sr.id} className="hover:bg-slate-50">
                    <td className="table-cell font-black text-slate-400">{(vm.page - 1) * vm.pageSize + index + 1}</td>
                    <td className="table-cell font-semibold text-slate-950">{sr.name}</td>
                    <td className="hidden table-cell sm:table-cell">
                      <span className="inline-flex items-center gap-2">
                        <Phone size={15} className="text-slate-400" />
                        {sr.phone}
                      </span>
                    </td>
                    <td className="table-cell">
                      <Badge tone={statusTone(sr.status)}>{sr.status}</Badge>
                    </td>
                    <td className="table-cell text-right">
                      <span className={`font-bold ${Number(sr.currentDue) > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
                        {formatCurrency(sr.currentDue || 0)}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="row-actions flex justify-end gap-2">
                        {canManageSrs ? (
                          <>
                            {Number(sr.currentDue) > 0 ? (
                              <button type="button" className="btn-secondary h-8 px-3 text-xs" title="Collect Due" onClick={() => setCollectModal(sr)}>
                                <HandCoins size={15} />
                                Collect
                              </button>
                            ) : null}
                            <button type="button" className="icon-btn" title="Edit" onClick={() => setSrModal({ mode: 'edit', sr })}>
                              <Pencil size={16} />
                            </button>
                            <button
                              type="button"
                              className="icon-btn text-rose-600 hover:text-rose-700"
                              title="Delete"
                              onClick={async () => {
                                const r = await deleteSr(sr);
                                if (r.ok) vm.reload();
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400">-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!vm.loading && !vm.error && !vm.items.length ? (
          <div className="p-5">
            <EmptyState title="No SRs Found" description="Add a Sales Representative to get started." icon={Users} />
          </div>
        ) : null}

        {!vm.loading && !vm.error && vm.items.length ? (
          <div className="border-t border-slate-100 px-5 py-4">
            <Pagination page={vm.page} totalPages={vm.totalPages} onPageChange={vm.setPage} />
          </div>
        ) : null}
      </div>

      {srModal ? (
        <SrFormModal
          sr={srModal.sr}
          onClose={() => setSrModal(null)}
          onSave={async (value) => {
            const result = await saveSr(value);
            if (result.ok) {
              setSrModal(null);
              vm.reload();
            }
            return result;
          }}
        />
      ) : null}

      {collectModal ? (
        <CollectDueModal
          sr={collectModal}
          onClose={() => setCollectModal(null)}
          onSave={async (payload) => {
            try {
              await inventoryApi.collectSrDue({ srId: collectModal.id, ...payload });
              setCollectModal(null);
              vm.reload();
              return { ok: true };
            } catch (err) {
              return { ok: false, error: err.message };
            }
          }}
        />
      ) : null}
    </div>
  );
}
