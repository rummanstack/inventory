import { useState } from 'react';
import { Alert, Modal, Select } from '../../../../components/ui.jsx';
import { DatePickerField } from '../../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { formatCurrency, formatNumber } from '../../../../utils/calculations.js';

function allowedMethods(earning) {
  if (earning.rewardKind === 'QUANTITY') return ['STOCK'];
  if (earning.settlementMethod === 'MULTIPLE') return ['CASH', 'CREDIT_NOTE'];
  return [earning.settlementMethod];
}

export default function TradePromotionSettleModal({ earning, onClose, onSettle }) {
  const { t, today } = useInventoryApp();
  const methods = allowedMethods(earning);
  const [method, setMethod] = useState(methods[0]);
  const [settlementDate, setSettlementDate] = useState(today);
  const [quantityPieces, setQuantityPieces] = useState(earning.remainingQuantityPieces || '');
  const [amount, setAmount] = useState(earning.remainingAmount || '');
  const [financeAccountType, setFinanceAccountType] = useState('CASH');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const isQuantity = earning.rewardKind === 'QUANTITY';

  async function submitForm(event) {
    event.preventDefault();
    setError('');

    if (isQuantity) {
      const qty = Number(quantityPieces || 0);
      if (qty <= 0 || qty > earning.remainingQuantityPieces) {
        setError(t('tradePromotions.earnings.settle.validation.quantityRange', { max: formatNumber(earning.remainingQuantityPieces) }));
        return;
      }
    } else {
      const amt = Number(amount || 0);
      if (amt <= 0 || amt > earning.remainingAmount) {
        setError(t('tradePromotions.earnings.settle.validation.amountRange', { max: formatCurrency(earning.remainingAmount) }));
        return;
      }
    }

    setSaving(true);
    const payload = {
      earningId: earning.id,
      method,
      settlementDate,
      quantityPieces: isQuantity ? Number(quantityPieces || 0) : 0,
      amount: !isQuantity ? Number(amount || 0) : 0,
      financeAccountType: method === 'CASH' ? financeAccountType : undefined,
      note: note.trim(),
    };
    const result = await onSettle(payload);
    setSaving(false);
    if (!result?.ok) {
      setError(result?.message || t('tradePromotions.earnings.settle.failed'));
    }
  }

  return (
    <Modal title={t('tradePromotions.earnings.settle.title')} description={t('tradePromotions.earnings.settle.description')} onClose={onClose} width="max-w-lg">
      <form className="space-y-4" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          <p className="font-semibold text-slate-950">{earning.ruleName || '-'}</p>
          <p className="text-slate-600">{earning.supplierName} · {earning.productName || t('tradePromotions.rules.targetTypes.ALL')}</p>
          <p className="mt-2 font-semibold text-slate-950">
            {isQuantity
              ? `${t('tradePromotions.earnings.remaining')}: ${formatNumber(earning.remainingQuantityPieces)} ${t('tradePromotions.rules.units.PIECE')}`
              : `${t('tradePromotions.earnings.remaining')}: ${formatCurrency(earning.remainingAmount)}`}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">{t('tradePromotions.settlements.method')}</label>
            <Select className="input" value={method} onChange={(event) => setMethod(event.target.value)} disabled={methods.length === 1}>
              {methods.map((value) => (
                <option key={value} value={value}>{t(`tradePromotions.settlements.methods.${value}`)}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="label">{t('tradePromotions.settlements.settlementDate')}</label>
            <DatePickerField value={settlementDate} onChange={setSettlementDate} />
          </div>

          {isQuantity ? (
            <div>
              <label className="label">{t('tradePromotions.settlements.quantityPieces')}</label>
              <input className="input" type="number" inputMode="numeric" min="1" max={earning.remainingQuantityPieces} step="1" value={quantityPieces} onChange={(event) => setQuantityPieces(event.target.value)} />
            </div>
          ) : (
            <div>
              <label className="label">{t('tradePromotions.settlements.amount')}</label>
              <input className="input" type="number" inputMode="decimal" min="0" max={earning.remainingAmount} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} />
            </div>
          )}

          {method === 'CASH' ? (
            <div>
              <label className="label">{t('tradePromotions.settlements.financeAccountType')}</label>
              <Select className="input" value={financeAccountType} onChange={(event) => setFinanceAccountType(event.target.value)}>
                <option value="CASH">{t('tradePromotions.settlements.accountTypes.CASH')}</option>
                <option value="BANK">{t('tradePromotions.settlements.accountTypes.BANK')}</option>
              </Select>
            </div>
          ) : null}

          <div className="sm:col-span-2">
            <label className="label">{t('tradePromotions.settlements.note')}</label>
            <textarea className="input min-h-16" value={note} onChange={(event) => setNote(event.target.value)} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>{t('common.cancel')}</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? t('common.saving') : t('tradePromotions.earnings.settle.confirm')}</button>
        </div>
      </form>
    </Modal>
  );
}
