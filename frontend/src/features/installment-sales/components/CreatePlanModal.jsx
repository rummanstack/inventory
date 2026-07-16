import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Alert, Modal, SearchableSelect, Select } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { formatCurrency, todayISO } from '../../../utils/calculations.js';
import { computeSchedulePreview } from '../utils/scheduleMath.js';
import CreditCheckPanel from './CreditCheckPanel.jsx';
import SchedulePreviewTable from './SchedulePreviewTable.jsx';
import { useTenantReportQuery } from '../../reports/queries/useTenantReportQuery.js';

const MARKUP_TYPES = ['PERCENT', 'FIXED'];

function emptyItem() {
  return { productId: '', quantityPieces: 1, actualSalePrice: '' };
}

export default function CreatePlanModal({ onClose, onSave }) {
  const { t, language, can, productDirectory, retailCustomerDirectory } = useInventoryApp();
  const canOverride = can('override_installment_credit_limit');

  const [customerId, setCustomerId] = useState('');
  const [saleDate, setSaleDate] = useState(todayISO());
  const [items, setItems] = useState([emptyItem()]);
  const [discount, setDiscount] = useState(0);
  const [downPayment, setDownPayment] = useState(0);
  const [markupType, setMarkupType] = useState('PERCENT');
  const [markupValue, setMarkupValue] = useState(0);
  const [numberOfMonths, setNumberOfMonths] = useState(6);
  const [firstPaymentDate, setFirstPaymentDate] = useState('');
  const [overrideCreditLimit, setOverrideCreditLimit] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const customerOptions = retailCustomerDirectory.map((customer) => ({
    value: customer.id,
    label: customer.name,
    sublabel: customer.phone || '',
  }));
  const productOptions = productDirectory.map((product) => ({
    value: product.id,
    label: product.name,
    sublabel: formatCurrency(product.retailPrice || 0, language),
  }));

  const creditQuery = useTenantReportQuery({
    scope: 'installment-credit-check',
    params: { customerId },
    queryFn: () => inventoryApi.getInstallmentCreditCheck({ customerId }),
    enabled: Boolean(customerId),
    staleTime: 30_000,
  });
  const creditCheck = creditQuery.data || null;

  function updateItem(index, field, value) {
    setItems((current) => current.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  function addItemRow() {
    setItems((current) => [...current, emptyItem()]);
  }

  function removeItemRow(index) {
    setItems((current) => current.filter((_, i) => i !== index));
  }

  function onSelectProduct(index, productId) {
    const product = productDirectory.find((p) => p.id === productId);
    setItems((current) => current.map((item, i) => (i === index ? {
      ...item,
      productId,
      actualSalePrice: item.actualSalePrice || product?.retailPrice || 0,
    } : item)));
  }

  const preview = useMemo(() => computeSchedulePreview({
    items,
    discount: Number(discount || 0),
    downPayment: Number(downPayment || 0),
    markupType,
    markupValue: Number(markupValue || 0),
    numberOfMonths: Number(numberOfMonths || 0),
    firstPaymentDate,
  }), [items, discount, downPayment, markupType, markupValue, numberOfMonths, firstPaymentDate]);

  const showOverride = creditCheck && (creditCheck.overLimit || creditCheck.isBlocked) && canOverride && !creditCheck.isBlocked;

  async function submitForm(event) {
    event.preventDefault();
    setError('');

    if (!customerId) {
      setError(t('installments.createPlan.validation.customerRequired'));
      return;
    }
    const validItems = items.filter((item) => item.productId && Number(item.quantityPieces) > 0);
    if (!validItems.length) {
      setError(t('installments.createPlan.validation.itemsRequired'));
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
    const payload = {
      customerId,
      saleDate,
      items: validItems.map((item) => ({
        productId: item.productId,
        quantityPieces: Number(item.quantityPieces),
        actualSalePrice: Number(item.actualSalePrice),
      })),
      discount: Number(discount || 0),
      downPayment: Number(downPayment || 0),
      markupType,
      markupValue: Number(markupValue || 0),
      numberOfMonths: Number(numberOfMonths),
      firstPaymentDate,
      overrideCreditLimit: showOverride ? overrideCreditLimit : undefined,
    };

    const result = await onSave(payload);
    setSaving(false);
    if (!result?.ok) {
      setError(result?.message || t('installments.createPlan.saveFailed'));
    }
  }

  return (
    <Modal title={t('installments.createPlan.title')} description={t('installments.createPlan.description')} onClose={onClose} width="max-w-4xl">
      <form className="space-y-4" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">{t('installments.createPlan.selectCustomer')}</label>
            <SearchableSelect
              options={customerOptions}
              value={customerId}
              onChange={setCustomerId}
              placeholder={t('installments.createPlan.selectCustomer')}
            />
          </div>
          <div>
            <label className="label">{t('installments.plans.saleDate')}</label>
            <DatePickerField value={saleDate} onChange={setSaleDate} />
          </div>
        </div>

        <CreditCheckPanel creditCheck={creditCheck} />

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="label mb-0">{t('installments.createPlan.items')}</label>
            <button type="button" className="btn-secondary py-1.5 text-xs" onClick={addItemRow}>
              <Plus size={14} />
              {t('installments.createPlan.addItem')}
            </button>
          </div>
          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-[1fr_100px_140px_auto] sm:items-center">
                <SearchableSelect
                  options={productOptions}
                  value={item.productId}
                  onChange={(value) => onSelectProduct(index, value)}
                  placeholder={t('installments.createPlan.selectProduct')}
                />
                <input
                  className="input"
                  type="number"
                  min="1"
                  step="1"
                  value={item.quantityPieces}
                  onChange={(event) => updateItem(index, 'quantityPieces', event.target.value)}
                />
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.actualSalePrice}
                  onChange={(event) => updateItem(index, 'actualSalePrice', event.target.value)}
                />
                <button
                  type="button"
                  className="icon-btn text-rose-600 hover:text-rose-700"
                  onClick={() => removeItemRow(index)}
                  disabled={items.length <= 1}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="label">{t('installments.plans.discount')}</label>
            <input className="input" type="number" min="0" step="0.01" value={discount} onChange={(event) => setDiscount(event.target.value)} />
          </div>
          <div>
            <label className="label">{t('installments.plans.downPayment')}</label>
            <input className="input" type="number" min="0" step="0.01" value={downPayment} onChange={(event) => setDownPayment(event.target.value)} />
          </div>
          <div>
            <label className="label">{t('installments.plans.numberOfMonths')}</label>
            <input className="input" type="number" min="1" step="1" value={numberOfMonths} onChange={(event) => setNumberOfMonths(event.target.value)} />
          </div>
          <div>
            <label className="label">{t('installments.plans.markupType')}</label>
            <Select className="input" value={markupType} onChange={(event) => setMarkupType(event.target.value)}>
              {MARKUP_TYPES.map((value) => (
                <option key={value} value={value}>{t(`installments.plans.markupTypes.${value}`)}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="label">{t('installments.plans.markupValue')}</label>
            <input className="input" type="number" min="0" step="0.01" value={markupValue} onChange={(event) => setMarkupValue(event.target.value)} />
          </div>
          <div>
            <label className="label">{t('installments.plans.firstPaymentDate')}</label>
            <DatePickerField value={firstPaymentDate} onChange={setFirstPaymentDate} min={saleDate} />
          </div>
        </div>

        {preview.rows.length ? (
          <div>
            <div className="mb-2 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-500">{t('installments.plans.financeAmount')}</p>
                <p className="text-sm font-bold text-slate-950">{formatCurrency(preview.financeAmount, language)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-500">{t('installments.plans.finalPayableAmount')}</p>
                <p className="text-sm font-bold text-slate-950">{formatCurrency(preview.finalPayableAmount, language)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-500">{t('installments.plans.monthlyInstallmentAmount')}</p>
                <p className="text-sm font-bold text-slate-950">{formatCurrency(preview.monthlyInstallmentAmount, language)}</p>
              </div>
            </div>
            <label className="label">{t('installments.createPlan.schedulePreview')}</label>
            <SchedulePreviewTable rows={preview.rows} />
          </div>
        ) : null}

        {showOverride ? (
          <label className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <input
              className="mt-1 h-4 w-4 rounded border-amber-300 text-brand focus:ring-brand"
              type="checkbox"
              checked={overrideCreditLimit}
              onChange={(event) => setOverrideCreditLimit(event.target.checked)}
            />
            <span className="text-sm font-semibold text-amber-800">{t('installments.createPlan.overrideCreditLimit')}</span>
          </label>
        ) : null}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>{t('common.cancel')}</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? t('common.saving') : t('installments.createPlan.submit')}</button>
        </div>
      </form>
    </Modal>
  );
}
