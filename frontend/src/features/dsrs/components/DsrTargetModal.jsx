import { useEffect, useState } from 'react';
import { Save, Target } from 'lucide-react';
import { Alert, Modal } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';

export default function DsrTargetModal({ onClose, onSaved }) {
  const { dsrDirectory, language } = useInventoryApp();
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [month, setMonth] = useState(defaultMonth);
  const [targets, setTargets] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const activeDsrs = dsrDirectory.filter((d) => d.status === 'Active');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await inventoryApi.getDsrTargets(month);
        if (!cancelled) {
          const map = {};
          (data.targets || []).forEach((t) => { map[t.dsrId] = String(t.targetAmount); });
          setTargets(map);
        }
      } catch {
        // leave empty on error
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [month]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = activeDsrs
        .filter((d) => targets[d.id] !== undefined && targets[d.id] !== '')
        .map((d) => ({ dsrId: d.id, month, targetAmount: Number(targets[d.id]) || 0 }));
      await inventoryApi.setDsrTargets(payload);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Set Monthly DSR Targets" description="Set collection targets per DSR for the selected month." onClose={onClose} width="max-w-xl">
      <form className="space-y-4" onSubmit={handleSave}>
        {error ? <Alert type="error">{error}</Alert> : null}

        <div>
          <label className="label">Month</label>
          <input className="input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-2xl bg-slate-100" />)}
          </div>
        ) : activeDsrs.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">No active DSRs found.</p>
        ) : (
          <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
            {activeDsrs.map((dsr) => (
              <div key={dsr.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--secondary-soft)]">
                  <Target size={14} className="text-[var(--secondary-strong)]" />
                </div>
                <p className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800">{dsr.name}</p>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="input w-36 text-right"
                  placeholder="0"
                  value={targets[dsr.id] ?? ''}
                  onChange={(e) => setTargets((prev) => ({ ...prev, [dsr.id]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving || loading}>
            <Save size={16} />
            {saving ? 'Saving…' : 'Save Targets'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
