import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { Badge, EmptyState, MobileCardList, MobileListCard } from '../../../components/ui.jsx';
import { CalendarClock } from 'lucide-react';
import { formatCurrency, formatDate } from '../../../utils/calculations.js';

const STATUS_TONES = {
  PENDING: 'slate',
  PARTIAL: 'amber',
  PAID: 'emerald',
  RESTRUCTURED: 'slate',
  WAIVED: 'slate',
};

export default function PlanScheduleTable({ schedule = [] }) {
  const { t, language } = useInventoryApp();

  if (!schedule.length) {
    return <EmptyState title={t('installments.detail.noSchedule')} icon={CalendarClock} />;
  }

  return (
    <>
    <MobileCardList>
      {schedule.map((row) => (
        <MobileListCard
          key={row.id}
          title={`#${row.installmentNo} · ${formatDate(row.dueDate, language)}`}
          badge={<Badge tone={STATUS_TONES[row.status] || 'slate'}>{t(`installments.plans.scheduleStatus.${row.status}`)}</Badge>}
          subtitle={`${t('installments.detail.paidAmount')}: ${formatCurrency(row.paidAmount, language)}`}
          value={formatCurrency(row.dueAmount, language)}
          valueSub={formatCurrency(row.remainingAmount, language)}
          valueClass="text-slate-950"
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
            <th className="px-4 py-2 text-right">{t('installments.detail.paidAmount')}</th>
            <th className="px-4 py-2 text-right">{t('installments.detail.remainingAmount')}</th>
            <th className="px-4 py-2 text-right">{t('installments.reports.lateFeeApplied')}</th>
            <th className="px-4 py-2">{t('installments.plans.statusLabel')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {schedule.map((row) => (
            <tr key={row.id} className="hover:bg-slate-50">
              <td className="table-cell font-semibold text-slate-500">{row.installmentNo}</td>
              <td className="table-cell">{formatDate(row.dueDate, language)}</td>
              <td className="table-cell text-right font-semibold text-slate-950">{formatCurrency(row.dueAmount, language)}</td>
              <td className="table-cell text-right text-emerald-600">{formatCurrency(row.paidAmount, language)}</td>
              <td className="table-cell text-right text-amber-600">{formatCurrency(row.remainingAmount, language)}</td>
              <td className="table-cell text-right text-slate-500">{row.lateFeeApplied > 0 ? formatCurrency(row.lateFeeApplied, language) : '-'}</td>
              <td className="table-cell">
                <Badge tone={STATUS_TONES[row.status] || 'slate'}>{t(`installments.plans.scheduleStatus.${row.status}`)}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </>
  );
}
