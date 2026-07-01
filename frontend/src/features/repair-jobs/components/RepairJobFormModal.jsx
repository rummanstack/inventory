import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Alert, Modal, Select } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { useFormState } from '../../../hooks/useFormState';
import { inventoryApi } from '../../../services/inventoryApi';

const JOB_STATUS_VALUES = ['RECEIVED', 'DIAGNOSING', 'AWAITING_PARTS', 'IN_REPAIR', 'READY', 'DELIVERED', 'CANCELLED'];
const APPROVAL_STATUS_VALUES = ['PENDING', 'APPROVED', 'DECLINED'];

export default function RepairJobFormModal({ job, onClose, onSave }) {
  const { t } = useInventoryApp();
  const isEdit = Boolean(job);
  const { form, updateField, error, setError, saving, setSaving } = useFormState({
    customerName: job?.customerName || '',
    customerPhone: job?.customerPhone || '',
    deviceName: job?.deviceName || '',
    serialNumber: job?.serialNumber || '',
    problemDescription: job?.problemDescription || '',
    estimatedCost: job?.estimatedCost ?? '',
    laborCost: job?.laborCost ?? '',
    actualCost: job?.actualCost ?? '',
    partsUsed: job?.partsUsed || '',
    technicianId: job?.technicianId || '',
    status: job?.status || 'RECEIVED',
    approvalStatus: job?.approvalStatus || 'PENDING',
    receivedDate: job?.receivedDate || new Date().toISOString().slice(0, 10),
    promisedDate: job?.promisedDate || '',
    deliveredDate: job?.deliveredDate || '',
    resolutionNote: job?.resolutionNote || '',
  });

  const [technicians, setTechnicians] = useState([]);

  useEffect(() => {
    inventoryApi.listUsers().then((result) => {
      setTechnicians(Array.isArray(result) ? result : (result?.items || []));
    }).catch(() => {});
  }, []);

  async function submitForm(event) {
    event.preventDefault();

    if (!form.customerName.trim()) {
      setError(t('repairJobs.customerRequired'));
      return;
    }
    if (!form.problemDescription.trim()) {
      setError(t('repairJobs.problemRequired'));
      return;
    }
    if (!isEdit && !form.receivedDate) {
      setError(t('repairJobs.receivedDateRequired'));
      return;
    }

    const payload = isEdit
      ? {
          id: job.id,
          status: form.status,
          approvalStatus: form.approvalStatus,
          technicianId: form.technicianId || null,
          laborCost: form.laborCost === '' ? 0 : Number(form.laborCost),
          actualCost: form.actualCost === '' ? 0 : Number(form.actualCost),
          partsUsed: form.partsUsed,
          promisedDate: form.promisedDate || null,
          deliveredDate: form.deliveredDate || null,
          resolutionNote: form.resolutionNote,
        }
      : {
          customerName: form.customerName.trim(),
          customerPhone: form.customerPhone.trim(),
          deviceName: form.deviceName.trim(),
          serialNumber: form.serialNumber.trim(),
          problemDescription: form.problemDescription.trim(),
          estimatedCost: form.estimatedCost === '' ? 0 : Number(form.estimatedCost),
          technicianId: form.technicianId || null,
          receivedDate: form.receivedDate,
          promisedDate: form.promisedDate || null,
        };

    setSaving(true);
    setError('');
    const result = await onSave(payload);
    setSaving(false);

    if (!result?.ok) {
      setError(result?.message || t('repairJobs.saveFailed'));
    }
  }

  return (
    <Modal
      title={isEdit ? t('repairJobs.editTitle') : t('repairJobs.addTitle')}
      description={t('repairJobs.modalDescription')}
      onClose={onClose}
      width="max-w-2xl"
    >
      <form className="space-y-4" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}

        {isEdit ? (
          <div className="grid gap-4 sm:grid-cols-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{t('repairJobs.jobNumberLabel')}</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">{job.jobNumber}</p>
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{t('repairJobs.customerLabel')}</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">{job.customerName}</p>
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{t('repairJobs.receivedDateLabel')}</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">{job.receivedDate}</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">{t('repairJobs.customerNameLabel')} *</label>
              <input
                className="input"
                value={form.customerName}
                onChange={(event) => updateField('customerName', event.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="label">{t('repairJobs.customerPhoneLabel')}</label>
              <input
                className="input"
                value={form.customerPhone}
                onChange={(event) => updateField('customerPhone', event.target.value)}
                placeholder="+880..."
              />
            </div>
            <div>
              <label className="label">{t('repairJobs.deviceNameLabel')}</label>
              <input
                className="input"
                value={form.deviceName}
                onChange={(event) => updateField('deviceName', event.target.value)}
                placeholder="e.g. iPhone 13, Samsung A54"
              />
            </div>
            <div>
              <label className="label">{t('repairJobs.serialLabel')}</label>
              <input
                className="input"
                value={form.serialNumber}
                onChange={(event) => updateField('serialNumber', event.target.value)}
                placeholder="IMEI or serial number"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">{t('repairJobs.problemDescriptionLabel')} *</label>
              <textarea
                className="input min-h-[80px]"
                value={form.problemDescription}
                onChange={(event) => updateField('problemDescription', event.target.value)}
              />
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {isEdit ? (
            <>
              <div>
                <label className="label">{t('repairJobs.statusLabel')}</label>
                <Select className="input" value={form.status} onChange={(event) => updateField('status', event.target.value)}>
                  {JOB_STATUS_VALUES.map((value) => (
                    <option key={value} value={value}>{t(`repairJobs.statuses.${value}`)}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="label">{t('repairJobs.approvalStatusLabel')}</label>
                <Select className="input" value={form.approvalStatus} onChange={(event) => updateField('approvalStatus', event.target.value)}>
                  {APPROVAL_STATUS_VALUES.map((value) => (
                    <option key={value} value={value}>{t(`repairJobs.approvalStatuses.${value}`)}</option>
                  ))}
                </Select>
              </div>
            </>
          ) : null}

          <div>
            <label className="label">{t('repairJobs.technicianLabel')}</label>
            <Select className="input" value={form.technicianId} onChange={(event) => updateField('technicianId', event.target.value)}>
              <option value="">{t('repairJobs.noTechnician')}</option>
              {technicians.map((user) => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </Select>
          </div>

          {!isEdit ? (
            <>
              <div>
                <label className="label">{t('repairJobs.estimatedCostLabel')}</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.estimatedCost}
                  onChange={(event) => updateField('estimatedCost', event.target.value)}
                />
              </div>
              <div>
                <label className="label">{t('repairJobs.receivedDateLabel')}</label>
                <DatePickerField value={form.receivedDate} onChange={(value) => updateField('receivedDate', value)} max={new Date().toISOString().slice(0, 10)} />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="label">{t('repairJobs.laborCostLabel')}</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.laborCost}
                  onChange={(event) => updateField('laborCost', event.target.value)}
                />
              </div>
              <div>
                <label className="label">{t('repairJobs.actualCostLabel')}</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.actualCost}
                  onChange={(event) => updateField('actualCost', event.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">{t('repairJobs.partsUsedLabel')}</label>
                <textarea
                  className="input min-h-[60px]"
                  value={form.partsUsed}
                  onChange={(event) => updateField('partsUsed', event.target.value)}
                />
              </div>
            </>
          )}

          <div>
            <label className="label">{t('repairJobs.promisedDateLabel')}</label>
            <DatePickerField value={form.promisedDate} onChange={(value) => updateField('promisedDate', value)} min={form.receivedDate} />
          </div>

          {isEdit ? (
            <div>
              <label className="label">{t('repairJobs.deliveredDateLabel')}</label>
              <DatePickerField value={form.deliveredDate} onChange={(value) => updateField('deliveredDate', value)} min={form.receivedDate} max={new Date().toISOString().slice(0, 10)} />
            </div>
          ) : null}

          {isEdit ? (
            <div className="sm:col-span-2">
              <label className="label">{t('repairJobs.resolutionNoteLabel')}</label>
              <textarea
                className="input min-h-[80px]"
                value={form.resolutionNote}
                onChange={(event) => updateField('resolutionNote', event.target.value)}
              />
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save size={18} />
            {saving ? t('common.saving') : t('repairJobs.saveJob')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

