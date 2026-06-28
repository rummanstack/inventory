import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { EmptyState, SectionHeader } from '../../../components/ui.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatDateTime } from '../../../utils/calculations.js';

function ContactMessageRow({ item, language }) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-black text-slate-900">{item.name}</p>
          <p className="mt-0.5 text-sm font-semibold text-[var(--brand)]">{item.phone}</p>
        </div>
        <p className="text-xs font-semibold text-slate-400">{formatDateTime(item.createdAt, language)}</p>
      </div>
      <p className="mt-3 text-sm font-medium leading-6 text-slate-700">{item.message}</p>
    </div>
  );
}

export default function ContactMessagesPage() {
  const { t, language, pushToast } = useInventoryApp();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const result = await inventoryApi.getContactMessages();
      setItems(Array.isArray(result.items) ? result.items : []);
    } catch (error) {
      pushToast('error', 'Failed to load', error?.message || 'Could not load contact messages.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="page-container">
      <SectionHeader
        title="Contact Messages"
        description="Everyone who reached out via the landing page contact form."
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
        <EmptyState title="No messages yet" description="Contact form submissions will appear here." />
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ContactMessageRow key={item.id} item={item} language={language} />
          ))}
        </div>
      )}
    </div>
  );
}
