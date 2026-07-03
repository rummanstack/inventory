import { formatCurrency, formatDate } from '../../../utils/calculations.js';
import { cx } from '../../../components/ui.jsx';

export default function QuotationPrintSheet({
  quotation,
  businessName = '',
  businessAddress = '',
  businessPhone = '',
  businessEmail = '',
  printTarget = false,
  targetId,
  t,
  language = 'en',
}) {
  const items = quotation?.items || [];

  const subtotal = Number(quotation?.subtotal || 0);
  const discountAmount = Number(quotation?.discountAmount || 0);
  const taxAmount = Number(quotation?.taxAmount || 0);
  const totalAmount = Number(quotation?.totalAmount || 0);

  const contactLine = [businessPhone, businessEmail].filter(Boolean).join(' · ');

  return (
    <div id={targetId} className={cx('mx-auto w-full max-w-[210mm] bg-white p-8 font-sans text-slate-950', printTarget && 'print-target')}>

      {/* Header */}
      <div className="flex items-start justify-between pb-5 border-b-2 border-slate-950">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950">{businessName}</h1>
          {businessAddress ? <p className="mt-1 text-xs text-slate-500">{businessAddress}</p> : null}
          {contactLine ? <p className="mt-0.5 text-xs text-slate-500">{contactLine}</p> : null}
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{t('quotations.printLabel')}</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{quotation?.quoteNumber}</p>
          <div className="mt-2 space-y-0.5 text-xs text-slate-500">
            <p>{t('quotations.printDateLabel')} <span className="font-semibold text-slate-800">{formatDate(quotation?.quoteDate, language)}</span></p>
            {quotation?.validUntil ? (
              <p>{t('quotations.printValidUntilLabel')} <span className="font-semibold text-slate-800">{formatDate(quotation.validUntil, language)}</span></p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Bill to */}
      {(quotation?.customerName || quotation?.customerPhone || quotation?.customerEmail) ? (
        <div className="mt-5 grid grid-cols-2 gap-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{t('quotations.printPreparedFor')}</p>
            {quotation.customerName ? (
              <p className="mt-1 text-sm font-bold text-slate-950">{quotation.customerName}</p>
            ) : null}
            {quotation.customerPhone ? (
              <p className="mt-0.5 text-xs text-slate-600">{quotation.customerPhone}</p>
            ) : null}
            {quotation.customerEmail ? (
              <p className="mt-0.5 text-xs text-slate-600">{quotation.customerEmail}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Items table */}
      <table className="mt-6 w-full border-collapse text-[10px]">
        <thead>
          <tr className="bg-slate-950 text-white">
            <th className="border border-slate-800 px-2 py-2 text-left font-bold">#</th>
            <th className="border border-slate-800 px-2 py-2 text-left font-bold">{t('quotations.printProductDescription')}</th>
            <th className="border border-slate-800 px-2 py-2 text-right font-bold">{t('quotations.printQty')}</th>
            <th className="border border-slate-800 px-2 py-2 text-right font-bold">{t('quotations.printUnitPrice')}</th>
            <th className="border border-slate-800 px-2 py-2 text-right font-bold">{t('quotations.printDiscount')}</th>
            <th className="border border-slate-800 px-2 py-2 text-right font-bold">{t('quotations.printTotal')}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
              <td className="border border-slate-200 px-2 py-1.5 text-slate-400">{i + 1}</td>
              <td className="border border-slate-200 px-2 py-1.5 font-semibold text-slate-950">{item.productName}</td>
              <td className="border border-slate-200 px-2 py-1.5 text-right text-slate-700">{item.quantity}</td>
              <td className="border border-slate-200 px-2 py-1.5 text-right">{formatCurrency(item.unitPrice, language)}</td>
              <td className="border border-slate-200 px-2 py-1.5 text-right text-rose-700">
                {Number(item.discountAmount || 0) > 0 ? `- ${formatCurrency(item.discountAmount, language)}` : '—'}
              </td>
              <td className="border border-slate-200 px-2 py-1.5 text-right font-bold">{formatCurrency(item.lineTotal, language)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="mt-4 flex justify-end">
        <div className="w-60 space-y-1.5 text-[11px]">
          <div className="flex justify-between">
            <span className="text-slate-500">{t('quotations.printSubtotal')}</span>
            <span className="font-semibold">{formatCurrency(subtotal, language)}</span>
          </div>
          {discountAmount > 0 ? (
            <div className="flex justify-between text-rose-700">
              <span>{t('quotations.printDiscount')}</span>
              <span className="font-semibold">− {formatCurrency(discountAmount, language)}</span>
            </div>
          ) : null}
          {taxAmount > 0 ? (
            <div className="flex justify-between">
              <span className="text-slate-500">{t('quotations.printTaxLabel', { rate: quotation?.taxRate })}</span>
              <span className="font-semibold">{formatCurrency(taxAmount, language)}</span>
            </div>
          ) : null}
          <div className="flex justify-between border-t-2 border-slate-950 pt-2 text-[13px] font-black">
            <span>{t('quotations.printTotal')}</span>
            <span>{formatCurrency(totalAmount, language)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {quotation?.notes ? (
        <div className="mt-6 rounded border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-600">{t('quotations.printNotes')}</p>
          <p className="mt-1 text-xs text-slate-800 whitespace-pre-wrap">{quotation.notes}</p>
        </div>
      ) : null}

      {/* Terms */}
      <div className="mt-6 border-t border-slate-200 pt-4 text-[10px] text-slate-500">
        <p className="font-bold uppercase tracking-[0.14em]">{t('quotations.printTermsTitle')}</p>
        <p className="mt-1">
          {quotation?.validUntil
            ? t('quotations.printValidUntilNote', { date: formatDate(quotation.validUntil, language) })
            : ''}
          {t('quotations.printTermsText')}
        </p>
      </div>

      {/* Signature */}
      <div className="mt-10 flex justify-between text-[11px] font-semibold text-slate-950">
        <div className="w-40">
          <div className="border-t border-slate-900 pt-2">{t('quotations.printCustomerAcceptance')}</div>
        </div>
        <div className="w-40">
          <div className="border-t border-slate-900 pt-2 text-right">{t('quotations.printAuthorizedSignature')}</div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 border-t border-slate-200 pt-3 text-center text-[9px] text-slate-400">
        <p className="font-semibold">{businessName}{contactLine ? ` · ${contactLine}` : ''}</p>
        <p className="mt-0.5">{t('quotations.printThankYou')}</p>
      </div>
    </div>
  );
}
