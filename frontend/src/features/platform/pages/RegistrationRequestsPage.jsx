import { useEffect, useState } from 'react';
import { Building2, Check, Mail, Phone, RefreshCw, X } from 'lucide-react';
import { Badge, EmptyState, SectionHeader } from '../../../components/ui.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatDateTime } from '../../../utils/calculations.js';

const BUSINESS_TYPE_LABELS = {
  ELECTRONICS: 'Electronics',
  GROCERY: 'Grocery / FMCG',
  DRUG_PHARMACY: 'Pharmacy',
};

function RegistrationCard({ item, language, busy, onApprove, onReject }) {
  const isPending = item.status === 'pending';
  return (
    <div className="rounded-card border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 font-semibold text-slate-900">
            <Building2 size={15} className="text-slate-400" />
            {item.name}
          </p>
          <p className="mt-0.5 text-xs font-semibold text-slate-400">
            {BUSINESS_TYPE_LABELS[item.businessType] || item.businessType} · {item.slug}
          </p>
        </div>
        <Badge tone={isPending ? 'amber' : 'rose'}>{isPending ? 'Pending' : 'Rejected'}</Badge>
      </div>

      <div className="mt-3 space-y-1 text-sm font-medium text-slate-700">
        <p>{item.ownerName}</p>
        <p className="flex items-center gap-2 text-[var(--brand)]">
          <Phone size={13} />
          {item.phone || '—'}
        </p>
        <p className="flex items-center gap-2 text-slate-500">
          <Mail size={13} />
          {item.ownerEmail || item.email}
        </p>
      </div>

      <p className="mt-3 text-xs font-semibold text-slate-400">{formatDateTime(item.createdAt, language)}</p>

      <div className="mt-4 flex gap-2">
        <button type="button" className="btn-primary flex-1" disabled={busy} onClick={() => onApprove(item)}>
          <Check size={15} />
          Approve
        </button>
        {isPending ? (
          <button
            type="button"
            className="btn-secondary flex-1 !text-[var(--danger)]"
            disabled={busy}
            onClick={() => onReject(item)}
          >
            <X size={15} />
            Reject
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function RegistrationRequestsPage() {
  const { language, pushToast, confirm } = useInventoryApp();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');

  async function load() {
    setLoading(true);
    try {
      const result = await inventoryApi.getRegistrationRequests();
      setItems(Array.isArray(result.items) ? result.items : []);
    } catch (error) {
      pushToast('error', 'Failed to load', error?.message || 'Could not load registration requests.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleApprove(item) {
    const ok = await confirm({
      title: `Approve ${item.name}?`,
      description: 'The business becomes active immediately and the owner can log in with the password they chose at registration.',
      tone: 'emerald',
    });
    if (!ok) return;
    setBusyId(item.id);
    try {
      await inventoryApi.approveRegistration(item.id);
      pushToast('success', 'Registration approved', `${item.name} is now active.`);
      await load();
    } catch (error) {
      pushToast('error', 'Approval failed', error?.message);
    } finally {
      setBusyId('');
    }
  }

  async function handleReject(item) {
    const ok = await confirm({
      title: `Reject ${item.name}?`,
      description: 'The owner will not be able to log in. You can still approve this registration later.',
      tone: 'rose',
    });
    if (!ok) return;
    setBusyId(item.id);
    try {
      await inventoryApi.rejectRegistration(item.id);
      pushToast('success', 'Registration rejected', `${item.name} was rejected.`);
      await load();
    } catch (error) {
      pushToast('error', 'Rejection failed', error?.message);
    } finally {
      setBusyId('');
    }
  }

  return (
    <div className="page-container">
      <SectionHeader
        title="Registration Requests"
        description="Businesses that signed up from the landing page and are waiting for activation."
        actions={
          <button type="button" className="btn-secondary" onClick={load} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        }
      />

      {loading ? (
        <div className="mt-8 flex justify-center">
          <RefreshCw size={20} className="animate-spin text-slate-400" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="No pending registrations" description="New signups from the landing page will appear here." />
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <RegistrationCard
              key={item.id}
              item={item}
              language={language}
              busy={busyId === item.id}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      )}
    </div>
  );
}
