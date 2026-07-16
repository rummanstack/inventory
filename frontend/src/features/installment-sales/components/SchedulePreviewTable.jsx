import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { Badge, MobileCardList, MobileListCard } from '../../../components/ui.jsx';
import { formatCurrency, formatDate } from '../../../utils/calculations.js';

const STATUS_TONES = {
  PENDING: 'slate',
  PARTIAL: 'amber',
  PAID: 'emerald',
  RESTRUCTURED: 'slate',
  WAIVED: 'slate',
};

export default function SchedulePreviewTable({ rows = [] }) {
  const { t, language } = useInventoryApp();

  if (!rows.length) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <MobileCardList>
        {rows.map((row) => (
          <MobileListCard
            key={row.installmentNo}
            title={`#${row.installmentNo} · ${formatDate(row.dueDate, language)}`}
            badge={row.status ? <Badge tone={STATUS_TONES[row.status] || 'slate'}>{t(`installments.plans.scheduleStatus.${row.status}`)}</Badge> : null}
            value={formatCurrency(row.dueAmount, language)}
            valueSub={row.lateFeeApplied != null && row.lateFeeApplied > 0 ? formatCurrency(row.lateFeeApplied, language) : null}
          />
        ))}
      </MobileCardList>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">{t('installments.plans.dueDate')}</th>
              <th className="px-4 py-2 text-right">{t('installments.plans.dueAmount')}</th>
              {rows[0].status ? <th className="px-4 py-2">{t('installments.plans.statusLabel')}</th> : null}
              {rows[0].lateFeeApplied != null ? <th className="px-4 py-2 text-right">{t('installments.reports.lateFeeApplied')}</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.installmentNo}>
                <td className="table-cell font-semibold text-slate-500">{row.installmentNo}</td>
                <td className="table-cell">{formatDate(row.dueDate, language)}</td>
                <td className="table-cell text-right font-semibold text-slate-950">{formatCurrency(row.dueAmount, language)}</td>
                {row.status ? (
                  <td className="table-cell">
                    <Badge tone={STATUS_TONES[row.status] || 'slate'}>{t(`installments.plans.scheduleStatus.${row.status}`)}</Badge>
                  </td>
                ) : null}
                {row.lateFeeApplied != null ? (
                  <td className="table-cell text-right text-amber-600">{row.lateFeeApplied > 0 ? formatCurrency(row.lateFeeApplied, language) : '-'}</td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
