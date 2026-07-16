import { Badge, MobileCardList, MobileListCard, Modal } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { tradeInConditionTone } from '../../../models/inventoryViewData.js';
import { formatCurrency, formatDate } from '../../../utils/calculations.js';

export default function TradeInViewModal({ tradeIn, onClose }) {
  const { t, language } = useInventoryApp();

  const received = tradeIn?.receivedItems || [];
  const sold = tradeIn?.soldItems || [];
  const paymentAmount = Number(tradeIn?.paymentAmount ?? 0);

  return (
    <Modal
      title={t('tradeIns.addTitle')}
      description={`${tradeIn?.tradeInNumber} · ${String(tradeIn?.tradeInDate || '').slice(0, 10)}`}
      onClose={onClose}
      width="max-w-2xl"
    >
      <div className="space-y-5">
        {/* Customer + date */}
        {(tradeIn?.customerName || tradeIn?.customerPhone) && (
          <div className="grid gap-3 sm:grid-cols-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            {tradeIn?.customerName && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{t('tradeIns.customerNameLabel')}</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">{tradeIn.customerName}</p>
              </div>
            )}
            {tradeIn?.customerPhone && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{t('tradeIns.customerPhoneLabel')}</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">{tradeIn.customerPhone}</p>
              </div>
            )}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{t('tradeIns.paymentMethodLabel')}</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">{tradeIn?.paymentMethod}</p>
            </div>
          </div>
        )}

        {/* Received devices */}
        <div>
          <p className="text-sm font-semibold text-emerald-700 mb-2">{t('tradeIns.receivedSectionLabel')}</p>
          <MobileCardList className="rounded-xl border border-emerald-200">
            {received.map((item, i) => (
              <MobileListCard
                key={i}
                title={item.productName}
                badge={<Badge tone={tradeInConditionTone(item.condition)}>{t(`tradeIns.conditions.${item.condition}`)}</Badge>}
                subtitle={item.serialNumber || undefined}
                value={formatCurrency(item.tradeInValue, language)}
                valueClass="text-emerald-700"
                valueSub={`${t('tradeIns.qtyLabel')}: ${item.quantity}`}
              />
            ))}
          </MobileCardList>
          <div className="hidden overflow-hidden rounded-xl border border-emerald-200 md:block">
            <table className="w-full text-sm">
              <thead className="bg-emerald-50 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-600">
                <tr>
                  <th className="px-3 py-2">{t('tradeIns.productLabel')}</th>
                  <th className="px-3 py-2">{t('tradeIns.serialLabel')}</th>
                  <th className="px-3 py-2">{t('tradeIns.conditionLabel')}</th>
                  <th className="px-3 py-2 text-right">{t('tradeIns.qtyLabel')}</th>
                  <th className="px-3 py-2 text-right">{t('tradeIns.tradeInValueLabel')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-100">
                {received.map((item, i) => (
                  <tr key={i} className="hover:bg-emerald-50">
                    <td className="px-3 py-2 font-medium text-slate-900">{item.productName}</td>
                    <td className="px-3 py-2 text-slate-500 font-mono text-xs">{item.serialNumber || '—'}</td>
                    <td className="px-3 py-2">
                      <Badge tone={tradeInConditionTone(item.condition)}>
                        {t(`tradeIns.conditions.${item.condition}`)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right text-slate-600">{item.quantity}</td>
                    <td className="px-3 py-2 text-right font-semibold text-emerald-700">{formatCurrency(item.tradeInValue, language)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sold devices */}
        <div>
          <p className="text-sm font-semibold text-indigo-700 mb-2">{t('tradeIns.soldSectionLabel')}</p>
          <MobileCardList className="rounded-xl border border-indigo-200">
            {sold.map((item, i) => (
              <MobileListCard
                key={i}
                title={item.productName}
                subtitle={`${item.quantity} × ${formatCurrency(item.unitPrice, language)}`}
                value={formatCurrency(item.lineTotal, language)}
                valueClass="text-indigo-700"
              />
            ))}
          </MobileCardList>
          <div className="hidden overflow-hidden rounded-xl border border-indigo-200 md:block">
            <table className="w-full text-sm">
              <thead className="bg-indigo-50 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-600">
                <tr>
                  <th className="px-3 py-2">{t('tradeIns.productLabel')}</th>
                  <th className="px-3 py-2 text-right">{t('tradeIns.qtyLabel')}</th>
                  <th className="px-3 py-2 text-right">{t('tradeIns.unitPriceLabel')}</th>
                  <th className="px-3 py-2 text-right">{t('tradeIns.lineTotalLabel')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-100">
                {sold.map((item, i) => (
                  <tr key={i} className="hover:bg-indigo-50">
                    <td className="px-3 py-2 font-medium text-slate-900">{item.productName}</td>
                    <td className="px-3 py-2 text-right text-slate-600">{item.quantity}</td>
                    <td className="px-3 py-2 text-right text-slate-600">{formatCurrency(item.unitPrice, language)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-indigo-700">{formatCurrency(item.lineTotal, language)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-500">{t('tradeIns.totalTradeInValueLabel')}</p>
            <p className="text-lg font-bold text-emerald-700">{formatCurrency(tradeIn?.totalTradeInValue, language)}</p>
          </div>
          <div className="rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-3 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-500">{t('tradeIns.totalSaleAmountLabel')}</p>
            <p className="text-lg font-bold text-indigo-700">{formatCurrency(tradeIn?.totalSaleAmount, language)}</p>
          </div>
          <div className={`rounded-xl border px-4 py-3 text-center ${paymentAmount >= 0 ? 'bg-slate-900 border-slate-900' : 'bg-amber-50 border-amber-200'}`}>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${paymentAmount >= 0 ? 'text-slate-400' : 'text-amber-500'}`}>{t('tradeIns.paymentAmountLabel')}</p>
            <p className={`text-lg font-bold ${paymentAmount >= 0 ? 'text-white' : 'text-amber-700'}`}>{formatCurrency(Math.abs(paymentAmount), language)}</p>
          </div>
        </div>

        {tradeIn?.notes && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-500 mb-1">{t('tradeIns.notesLabel')}</p>
            <p className="text-sm text-amber-900">{tradeIn.notes}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
