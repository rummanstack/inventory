import { useState } from 'react';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { Alert, Badge, Modal } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { quotationStatusTone } from '../../../models/inventoryViewData.js';

const PAYMENT_METHODS = ['CASH', 'CARD', 'MOBILE_BANKING', 'BANK_TRANSFER', 'CREDIT'];

export default function QuotationViewModal({ quotation, onClose, onConverted }) {
  const { t, convertQuotation } = useInventoryApp();
  const [showConvert, setShowConvert] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paidAmount, setPaidAmount] = useState(String(quotation?.totalAmount ?? 0));
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [converting, setConverting] = useState(false);
  const [convertError, setConvertError] = useState('');

  const canConvert = ['DRAFT', 'SENT', 'ACCEPTED'].includes(quotation?.status);

  async function handleConvert() {
    setConverting(true);
    setConvertError('');
    const result = await convertQuotation(quotation.id, {
      paymentMethod,
      paidAmount: Number(paidAmount) || 0,
      invoiceDate,
    });
    setConverting(false);
    if (result.ok) {
      onConverted?.();
      onClose();
    } else {
      setConvertError(result.message || t('quotations.convertFailed'));
    }
  }

  const items = quotation?.items || [];
  const tone = quotationStatusTone(quotation?.status);

  return (
    <Modal
      title={t('quotations.viewTitle')}
      description={`${quotation?.quoteNumber} · ${quotation?.quoteDate}`}
      onClose={onClose}
      width="max-w-2xl"
    >
      <div className="space-y-5">
        {/* Header chips */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={tone}>{t(`quotations.statuses.${quotation?.status}`)}</Badge>
          {quotation?.validUntil && (
            <span className="text-xs text-slate-500">
              {t('quotations.validUntilLabel')}: {String(quotation.validUntil).slice(0, 10)}
            </span>
          )}
          {quotation?.convertedInvoiceNumber && (
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
              {t('quotations.linkedInvoiceLabel')}: {quotation.convertedInvoiceNumber}
            </span>
          )}
        </div>

        {/* Customer info */}
        {(quotation?.customerName || quotation?.customerPhone || quotation?.customerEmail) && (
          <div className="grid gap-3 sm:grid-cols-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            {quotation?.customerName && (
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">{t('quotations.customerNameLabel')}</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">{quotation.customerName}</p>
              </div>
            )}
            {quotation?.customerPhone && (
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">{t('quotations.customerPhoneLabel')}</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">{quotation.customerPhone}</p>
              </div>
            )}
            {quotation?.customerEmail && (
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">{t('quotations.customerEmailLabel')}</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">{quotation.customerEmail}</p>
              </div>
            )}
          </div>
        )}

        {/* Items */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
              <tr>
                <th className="px-3 py-2">{t('quotations.itemProductLabel')}</th>
                <th className="px-3 py-2 text-right">{t('quotations.itemQtyLabel')}</th>
                <th className="px-3 py-2 text-right">{t('quotations.itemPriceLabel')}</th>
                <th className="px-3 py-2 text-right">{t('quotations.itemDiscountLabel')}</th>
                <th className="px-3 py-2 text-right">{t('quotations.itemTotalLabel')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium text-slate-900">{item.productName}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{item.quantity}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{Number(item.unitPrice).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-slate-400">{Number(item.discountAmount || 0) > 0 ? Number(item.discountAmount).toLocaleString() : '—'}</td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-900">{Number(item.lineTotal).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>{t('quotations.subtotalLabel')}</span>
              <span>{Number(quotation?.subtotal || 0).toLocaleString()}</span>
            </div>
            {Number(quotation?.discountAmount || 0) > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>{t('quotations.discountLabel')}</span>
                <span>−{Number(quotation.discountAmount).toLocaleString()}</span>
              </div>
            )}
            {Number(quotation?.taxAmount || 0) > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>{t('quotations.taxAmountLabel')} ({quotation?.taxRate}%)</span>
                <span>{Number(quotation.taxAmount).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1">
              <span>{t('quotations.totalLabel')}</span>
              <span>{Number(quotation?.totalAmount || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {quotation?.notes && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-amber-500 mb-1">{t('quotations.notesLabel')}</p>
            <p className="text-sm text-amber-900 whitespace-pre-wrap">{quotation.notes}</p>
          </div>
        )}

        {/* Convert section */}
        {canConvert && !showConvert && (
          <div className="flex justify-end">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowConvert(true)}
            >
              <ArrowRight className="h-4 w-4" />
              {t('quotations.convertButton')}
            </button>
          </div>
        )}

        {canConvert && showConvert && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 space-y-4">
            <div>
              <p className="text-sm font-semibold text-indigo-900">{t('quotations.convertTitle')}</p>
              <p className="text-xs text-indigo-600">{t('quotations.convertDescription')}</p>
            </div>
            {convertError && <Alert type="error">{convertError}</Alert>}
            <div className="grid gap-4 sm:grid-cols-3">
              <DatePickerField
                label={t('quotations.invoiceDateLabel')}
                value={invoiceDate}
                onChange={setInvoiceDate}
              />
              <div>
                <label className="label">{t('quotations.paymentMethodLabel')}</label>
                <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>{m.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">{t('quotations.paidAmountLabel')}</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="any"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" className="btn btn-ghost" onClick={() => setShowConvert(false)} disabled={converting}>
                {t('common.cancel')}
              </button>
              <button type="button" className="btn btn-primary" onClick={handleConvert} disabled={converting}>
                {converting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {converting ? t('common.saving') : t('quotations.convertButton')}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
