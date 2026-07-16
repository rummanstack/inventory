import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { EmptyState, MobileCardList, MobileListCard } from '../../../components/ui.jsx';
import { Receipt } from 'lucide-react';
import { formatCurrency, formatDate } from '../../../utils/calculations.js';

export default function PlanPaymentsTable({ payments = [] }) {
  const { t, language } = useInventoryApp();

  if (!payments.length) {
    return <EmptyState title={t('installments.detail.noPayments')} icon={Receipt} />;
  }

  return (
    <>
    <MobileCardList>
      {payments.map((payment) => (
        <MobileListCard
          key={payment.id}
          title={formatDate(payment.paymentDate, language)}
          subtitle={`${t(`installments.payment.methods.${payment.paymentMethod}`)}${payment.note ? ` · ${payment.note}` : ''}`}
          value={formatCurrency(payment.amount, language)}
          valueClass="text-emerald-600"
        />
      ))}
    </MobileCardList>
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full text-sm">
        <thead className="table-head">
          <tr>
            <th className="px-4 py-2">{t('installments.payment.date')}</th>
            <th className="px-4 py-2 text-right">{t('installments.payment.amount')}</th>
            <th className="px-4 py-2">{t('installments.payment.method')}</th>
            <th className="px-4 py-2">{t('installments.payment.note')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {payments.map((payment) => (
            <tr key={payment.id} className="hover:bg-slate-50">
              <td className="table-cell">{formatDate(payment.paymentDate, language)}</td>
              <td className="table-cell text-right font-semibold text-emerald-600">{formatCurrency(payment.amount, language)}</td>
              <td className="table-cell">{t(`installments.payment.methods.${payment.paymentMethod}`)}</td>
              <td className="table-cell text-slate-500">{payment.note || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </>
  );
}
