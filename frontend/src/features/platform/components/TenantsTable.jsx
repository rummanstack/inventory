import { LayoutGrid, Loader2, Pencil } from 'lucide-react';
import { Badge, cx } from '../../../components/ui.jsx';

export default function TenantsTable({ tenants, togglingId, t, onEdit, onFeatures, onToggleStatus }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">{t('organizations.table.organization')}</th>
            <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">{t('organizations.table.code')}</th>
            <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">{t('organizations.table.plan')}</th>
            <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">{t('organizations.table.status')}</th>
            <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wider text-slate-500">{t('organizations.table.edit')}</th>
            <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wider text-slate-500">{t('organizations.table.features')}</th>
            <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wider text-slate-500">{t('organizations.table.toggle')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tenants.map((tenant) => (
            <tr key={tenant.id} className="hover:bg-slate-50/50">
              <td className="px-4 py-3">
                <p className="font-bold text-slate-950">{tenant.name}</p>
                <p className="text-xs text-slate-500">{tenant.email}</p>
              </td>
              <td className="px-4 py-3 font-mono text-slate-700">{tenant.slug}</td>
              <td className="px-4 py-3">
                <Badge tone="blue">{tenant.plan}</Badge>
              </td>
              <td className="px-4 py-3">
                <Badge tone={tenant.status === 'active' ? 'emerald' : 'rose'}>{tenant.status}</Badge>
              </td>
              <td className="px-4 py-3 text-right">
                <button type="button" className="icon-btn" title={t('common.edit')} onClick={() => onEdit(tenant)}>
                  <Pencil size={16} />
                </button>
              </td>
              <td className="px-4 py-3 text-right">
                <button type="button" className="icon-btn" title={t('organizations.featuresTitle')} onClick={() => onFeatures(tenant)}>
                  <LayoutGrid size={16} />
                </button>
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  type="button"
                  role="switch"
                  aria-checked={tenant.status === 'active'}
                  title={tenant.status === 'active' ? t('organizations.deactivate') : t('organizations.activate')}
                  disabled={togglingId === tenant.id}
                  onClick={() => onToggleStatus(tenant)}
                  className={cx(
                    'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60',
                    tenant.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300',
                  )}
                >
                  <span
                    className={cx(
                      'inline-flex h-4 w-4 items-center justify-center rounded-full bg-white shadow transition-transform',
                      tenant.status === 'active' ? 'translate-x-6' : 'translate-x-1',
                    )}
                  >
                    {togglingId === tenant.id ? <Loader2 size={12} className="animate-spin text-slate-400" /> : null}
                  </span>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
