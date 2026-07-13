import { useMemo, useState } from 'react';
import { Alert, Modal } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { addCalendarMonths, round2 } from '../utils/scheduleMath.js';
import SchedulePreviewTable from './SchedulePreviewTable.jsx';

function buildPreviewRows(remainingAmount, numberOfMonths, firstPaymentDate) {
  const months = Math.max(0, Math.trunc(Number(numberOfMonths || 0)));
  if (!months || !firstPaymentDate) return [];
  const baseInstallment = Math.floor((remainingAmount / months) * 100) / 100;
  const rows = [];
  let allocatedSoFar = 0;
  for (let i = 1; i <= months; i += 1) {
    const isLast = i === months;
    const dueAmount = isLast ? round2(remainingAmount - allocatedSoFar) : baseInstallment;
    allocatedSoFar = round2(allocatedSoFar + dueAmount);
    const dueDate = i === 1 ? firstPaymentDate : addCalendarMonths(firstPaymentDate, i - 1);
    rows.push({ installmentNo: i, dueDate, dueAmount });
  }
  return rows;
}

export default function RescheduleModal({ plan, onClose, onSave }) {
  const { t } = useInventoryApp();
  const [reason, setReason] = useState('');
  const [numberOfMonths, setNumberOfMonths] = useState(plan.numberOfMonths);
  const [firstPaymentDate, setFirstPaymentDate] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const previewRows = useMemo(
    () => buildPreviewRows(plan.outstandingAmount, numberOfMonths, firstPaymentDate),
    [plan.outstandingAmount, numberOfMonths, firstPaymentDate],
  );

  async function submitForm(event) {
    event.preventDefault();
    setError('');

    if (!reason.trim()) {
      setError(t('installments.detail.rescheduleValidation.reasonRequired'));
      return;
    }
    if (Number(numberOfMonths) <= 0) {
      setError(t('installments.createPlan.validation.monthsRequired'));
      return;
    }
    if (!firstPaymentDate) {
      setError(t('installments.createPlan.validation.firstPaymentDateRequired'));
      return;
    }

    setSaving(true);
    const result = await onSave({
      reason: reason.trim(),
      numberOfMonths: Number(numberOfMonths),
      firstPaymentDate,
    });
    setSaving(false);
    if (!result?.ok) {
      setError(result?.message || t('installments.detail.rescheduleFailed'));
    }
  }

  return (
    <Modal title={t('installments.detail.reschedule')} description={plan.planNumber} onClose={onClose} width="max-w-2xl">
      <form className="space-y-4" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <div>
          <label className="label">{t('installments.detail.rescheduleReason')}</label>
          <textarea className="input min-h-20" value={reason} onChange={(event) => setReason(event.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">{t('installments.plans.numberOfMonths')}</label>
            <input className="input" type="number" min="1" step="1" value={numberOfMonths} onChange={(event) => setNumberOfMonths(event.target.value)} />
          </div>
          <div>
            <label className="label">{t('installments.plans.firstPaymentDate')}</label>
            <DatePickerField value={firstPaymentDate} onChange={setFirstPaymentDate} />
          </div>
        </div>
        {previewRows.length ? (
          <div>
            <label className="label">{t('installments.createPlan.schedulePreview')}</label>
            <SchedulePreviewTable rows={previewRows} />
          </div>
        ) : null}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>{t('common.cancel')}</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? t('common.saving') : t('common.save')}</button>
        </div>
      </form>
    </Modal>
  );
}
