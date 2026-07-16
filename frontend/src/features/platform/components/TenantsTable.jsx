import { LayoutGrid, Loader2, Pencil } from 'lucide-react';
import { Badge, MobileCardList, MobileListCard, cx } from '../../../components/ui.jsx';
import TableReportActions from '../../../components/TableReportActions.jsx';

const TENANTS_REPORT_ID = 'platform-tenants-report';

export default function TenantsTable({ tenants, togglingId, t, onEdit, onFeatures, onToggleStatus }) {
  return (
    <div id={TENANTS_REPORT_ID} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 no-print">
        <span className="text-sm font-bold text-slate-700">{t('nav.platform')}</span>
        <TableReportActions targetId={TENANTS_REPORT_ID} title={t('nav.platform')} fileName="platform-tenants" entityType="platform_tenants" t={t} />
      </div>
      <MobileCardList>
        {tenants.map((tenant) => (
          <MobileListCard
            key={tenant.id}
            title={tenant.name}
            badge={<Badge tone={tenant.status === 'active' ? 'emerald' : 'rose'}>{tenant.status}</Badge>}
            subtitle={`${tenant.email} · ${tenant.slug}`}
            value={<Badge tone="blue">{tenant.plan}</Badge>}
            action={(
              <div className="flex items-center gap-1">
                <button type="button" className="icon-btn" title={t('common.edit')} onClick={() => onEdit(tenant)}>
                  <Pencil size={16} />
                </button>
                <button type="button" className="icon-btn" title={t('organizations.featuresTitle')} onClick={() => onFeatures(tenant)}>
                  <LayoutGrid size={16} />
                </button>
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
              </div>
            )}
          />
        ))}
      </MobileCardList>
      <div className="hidden overflow-x-auto md:block">
      <table className="w-full text-sm">
        <thead className="table-head">
          <tr className="border-b border-slate-200">
            <th className="px-4 py-3">{t('organizations.table.organization')}</th>
            <th className="px-4 py-3">{t('organizations.table.code')}</th>
            <th className="px-4 py-3">{t('organizations.table.plan')}</th>
            <th className="px-4 py-3">{t('organizations.table.status')}</th>
            <th className="px-4 py-3 text-right no-print">{t('organizations.table.edit')}</th>
            <th className="px-4 py-3 text-right no-print">{t('organizations.table.features')}</th>
            <th className="px-4 py-3 text-right no-print">{t('organizations.table.toggle')}</th>
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
              <td className="px-4 py-3 text-right no-print">
                <button type="button" className="icon-btn" title={t('common.edit')} onClick={() => onEdit(tenant)}>
                  <Pencil size={16} />
                </button>
              </td>
              <td className="px-4 py-3 text-right no-print">
                <button type="button" className="icon-btn" title={t('organizations.featuresTitle')} onClick={() => onFeatures(tenant)}>
                  <LayoutGrid size={16} />
                </button>
              </td>
              <td className="px-4 py-3 text-right no-print">
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
    </div>
  );
}
