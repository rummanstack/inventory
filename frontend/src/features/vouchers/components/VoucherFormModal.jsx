import { useMemo, useState } from 'react';
import { vt } from '../voucherTranslations.js';
import { Alert, Modal } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';

const REFERENCE_TYPE_OPTIONS = [
  { value: '', label: 'No reference' },
  { value: 'CUSTOMER', label: 'Customer' },
  { value: 'SUPPLIER', label: 'Supplier' },
  { value: 'FINANCE_ACCOUNT', label: 'Cash / Bank Account' },
];

function buildReferenceOptions(referenceType, { customers, suppliers, financeAccounts }) {
  if (referenceType === 'CUSTOMER') return customers;
  if (referenceType === 'SUPPLIER') return suppliers;
  if (referenceType === 'FINANCE_ACCOUNT') return financeAccounts;
  return [];
}

function JournalLineEditor({ lines, setLines, accounts, directories }) {
  function updateLine(index, patch) {
    setLines((current) => current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)));
  }

  function addLine() {
    setLines((current) => [...current, { accountCode: '', debit: '', credit: '', note: '', referenceType: '', referenceId: '' }]);
  }

  function removeLine(index) {
    setLines((current) => current.filter((_, lineIndex) => lineIndex !== index));
  }

  return (
    <div className="space-y-3">
      <div className="space-y-3 md:hidden">
        {lines.map((line, index) => {
          const referenceOptions = buildReferenceOptions(line.referenceType, directories);
          return (
            <div key={index} className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <select className="input" value={line.accountCode} onChange={(event) => updateLine(index, { accountCode: event.target.value })}>
                <option value="">{vt(language, 'Select account')}</option>
                {accounts.map((account) => <option key={account.code} value={account.code}>{account.code} - {account.name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <select className="input" value={line.referenceType} onChange={(event) => updateLine(index, { referenceType: event.target.value, referenceId: '' })}>
                  {REFERENCE_TYPE_OPTIONS.map((option) => <option key={option.value || 'none'} value={option.value}>{option.label}</option>)}
                </select>
                <select className="input" value={line.referenceId} onChange={(event) => updateLine(index, { referenceId: event.target.value })} disabled={!line.referenceType}>
                  <option value="">{vt(language, 'Select reference')}</option>
                  {referenceOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" min="0" step="0.01" placeholder={vt(language, 'Debit')} className="input text-right" value={line.debit} onChange={(event) => updateLine(index, { debit: event.target.value, credit: event.target.value ? '' : line.credit })} />
                <input type="number" min="0" step="0.01" placeholder={vt(language, 'Credit')} className="input text-right" value={line.credit} onChange={(event) => updateLine(index, { credit: event.target.value, debit: event.target.value ? '' : line.debit })} />
              </div>
              <input placeholder={vt(language, 'Note')} className="input" value={line.note} onChange={(event) => updateLine(index, { note: event.target.value })} />
              <button type="button" className="btn-secondary w-full justify-center" onClick={() => removeLine(index)} disabled={lines.length <= 2}>{vt(language, 'Remove')}</button>
            </div>
          );
        })}
      </div>
      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 md:block">
        <table className="w-full min-w-[840px]">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3 text-left">{vt(language, 'Account')}</th>
              <th className="px-4 py-3 text-left">{vt(language, 'Reference Type')}</th>
              <th className="px-4 py-3 text-left">{vt(language, 'Reference')}</th>
              <th className="px-4 py-3 text-right">{vt(language, 'Debit')}</th>
              <th className="px-4 py-3 text-right">{vt(language, 'Credit')}</th>
              <th className="px-4 py-3 text-left">{vt(language, 'Note')}</th>
              <th className="px-4 py-3 text-right">{vt(language, 'Action')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {lines.map((line, index) => {
              const referenceOptions = buildReferenceOptions(line.referenceType, directories);
              return (
                <tr key={index}>
                  <td className="p-2">
                    <select className="input min-w-[220px]" value={line.accountCode} onChange={(event) => updateLine(index, { accountCode: event.target.value })}>
                      <option value="">{vt(language, 'Select account')}</option>
                      {accounts.map((account) => <option key={account.code} value={account.code}>{account.code} - {account.name}</option>)}
                    </select>
                  </td>
                  <td className="p-2">
                    <select className="input min-w-[150px]" value={line.referenceType} onChange={(event) => updateLine(index, { referenceType: event.target.value, referenceId: '' })}>
                      {REFERENCE_TYPE_OPTIONS.map((option) => <option key={option.value || 'none'} value={option.value}>{option.label}</option>)}
                    </select>
                  </td>
                  <td className="p-2">
                    <select className="input min-w-[170px]" value={line.referenceId} onChange={(event) => updateLine(index, { referenceId: event.target.value })} disabled={!line.referenceType}>
                      <option value="">{vt(language, 'Select reference')}</option>
                      {referenceOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                  </td>
                  <td className="p-2"><input type="number" min="0" step="0.01" className="input text-right" value={line.debit} onChange={(event) => updateLine(index, { debit: event.target.value, credit: event.target.value ? '' : line.credit })} /></td>
                  <td className="p-2"><input type="number" min="0" step="0.01" className="input text-right" value={line.credit} onChange={(event) => updateLine(index, { credit: event.target.value, debit: event.target.value ? '' : line.debit })} /></td>
                  <td className="p-2"><input className="input min-w-[180px]" value={line.note} onChange={(event) => updateLine(index, { note: event.target.value })} /></td>
                  <td className="p-2 text-right"><button type="button" className="btn-secondary" onClick={() => removeLine(index)} disabled={lines.length <= 2}>{vt(language, 'Remove')}</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end"><button type="button" className="btn-secondary" onClick={addLine}>{vt(language, 'Add Line')}</button></div>
    </div>
  );
}

function AllocationLineEditor({ lines, setLines, accounts, directories, sideLabel }) {
  function updateLine(index, patch) {
    setLines((current) => current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)));
  }

  function addLine() {
    setLines((current) => [...current, { accountCode: '', amount: '', note: '', referenceType: '', referenceId: '' }]);
  }

  function removeLine(index) {
    setLines((current) => current.filter((_, lineIndex) => lineIndex !== index));
  }

  return (
    <div className="space-y-3">
      <div className="space-y-3 md:hidden">
        {lines.map((line, index) => {
          const referenceOptions = buildReferenceOptions(line.referenceType, directories);
          return (
            <div key={index} className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <select className="input" value={line.accountCode} onChange={(event) => updateLine(index, { accountCode: event.target.value })}>
                <option value="">Select {sideLabel.toLowerCase()} account</option>
                {accounts.map((account) => <option key={account.code} value={account.code}>{account.code} - {account.name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <select className="input" value={line.referenceType} onChange={(event) => updateLine(index, { referenceType: event.target.value, referenceId: '' })}>
                  {REFERENCE_TYPE_OPTIONS.map((option) => <option key={option.value || 'none'} value={option.value}>{option.label}</option>)}
                </select>
                <select className="input" value={line.referenceId} onChange={(event) => updateLine(index, { referenceId: event.target.value })} disabled={!line.referenceType}>
                  <option value="">{vt(language, 'Select reference')}</option>
                  {referenceOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
              <input type="number" min="0" step="0.01" placeholder={vt(language, 'Amount')} className="input text-right" value={line.amount} onChange={(event) => updateLine(index, { amount: event.target.value })} />
              <input placeholder={vt(language, 'Note')} className="input" value={line.note} onChange={(event) => updateLine(index, { note: event.target.value })} />
              <button type="button" className="btn-secondary w-full justify-center" onClick={() => removeLine(index)} disabled={lines.length <= 1}>{vt(language, 'Remove')}</button>
            </div>
          );
        })}
      </div>
      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 md:block">
        <table className="w-full min-w-[760px]">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3 text-left">{sideLabel} Account</th>
              <th className="px-4 py-3 text-left">{vt(language, 'Reference Type')}</th>
              <th className="px-4 py-3 text-left">{vt(language, 'Reference')}</th>
              <th className="px-4 py-3 text-right">{vt(language, 'Amount')}</th>
              <th className="px-4 py-3 text-left">{vt(language, 'Note')}</th>
              <th className="px-4 py-3 text-right">{vt(language, 'Action')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {lines.map((line, index) => {
              const referenceOptions = buildReferenceOptions(line.referenceType, directories);
              return (
                <tr key={index}>
                  <td className="p-2">
                    <select className="input min-w-[240px]" value={line.accountCode} onChange={(event) => updateLine(index, { accountCode: event.target.value })}>
                      <option value="">{vt(language, 'Select account')}</option>
                      {accounts.map((account) => <option key={account.code} value={account.code}>{account.code} - {account.name}</option>)}
                    </select>
                  </td>
                  <td className="p-2">
                    <select className="input min-w-[150px]" value={line.referenceType} onChange={(event) => updateLine(index, { referenceType: event.target.value, referenceId: '' })}>
                      {REFERENCE_TYPE_OPTIONS.map((option) => <option key={option.value || 'none'} value={option.value}>{option.label}</option>)}
                    </select>
                  </td>
                  <td className="p-2">
                    <select className="input min-w-[170px]" value={line.referenceId} onChange={(event) => updateLine(index, { referenceId: event.target.value })} disabled={!line.referenceType}>
                      <option value="">{vt(language, 'Select reference')}</option>
                      {referenceOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                  </td>
                  <td className="p-2"><input type="number" min="0" step="0.01" className="input text-right" value={line.amount} onChange={(event) => updateLine(index, { amount: event.target.value })} /></td>
                  <td className="p-2"><input className="input min-w-[180px]" value={line.note} onChange={(event) => updateLine(index, { note: event.target.value })} /></td>
                  <td className="p-2 text-right"><button type="button" className="btn-secondary" onClick={() => removeLine(index)} disabled={lines.length <= 1}>{vt(language, 'Remove')}</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end"><button type="button" className="btn-secondary" onClick={addLine}>{vt(language, 'Add Line')}</button></div>
    </div>
  );
}

function totalForJournal(lines, key) {
  return lines.reduce((sum, line) => sum + Number(line[key] || 0), 0);
}

function totalForAllocation(lines) {
  return lines.reduce((sum, line) => sum + Number(line.amount || 0), 0);
}

export default function VoucherFormModal({
  voucherType,
  voucher,
  accounts,
  customers,
  suppliers,
  financeAccounts,
  onClose,
  onSave,
}) {
  const { language } = useInventoryApp();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    voucherDate: voucher?.voucherDate || new Date().toISOString().slice(0, 10),
    referenceNumber: voucher?.referenceNumber || '',
    narration: voucher?.narration || '',
    notes: voucher?.notes || '',
    counterpartyName: voucher?.counterpartyName || '',
    cashBankAccountCode: voucher?.cashBankAccountCode || '',
    fromAccountCode: voucher?.fromAccountCode || '',
    toAccountCode: voucher?.toAccountCode || '',
    amount: voucherType === 'CONTRA' ? Number(voucher?.lines?.[0]?.amount || voucher?.totalDebit || 0) || '' : '',
  });
  const [journalLines, setJournalLines] = useState(
    voucherType === 'JOURNAL'
      ? (voucher?.lines?.map((line) => ({
        accountCode: line.accountCode,
        debit: line.side === 'DEBIT' ? String(line.amount) : '',
        credit: line.side === 'CREDIT' ? String(line.amount) : '',
        note: line.note || '',
        referenceType: line.referenceType || '',
        referenceId: line.referenceId || '',
      })) || [
        { accountCode: '', debit: '', credit: '', note: '', referenceType: '', referenceId: '' },
        { accountCode: '', debit: '', credit: '', note: '', referenceType: '', referenceId: '' },
      ])
      : [],
  );
  const [allocationLines, setAllocationLines] = useState(
    voucherType === 'RECEIPT' || voucherType === 'PAYMENT'
      ? (voucher?.lines?.filter((line) => (voucherType === 'RECEIPT' ? line.side === 'CREDIT' : line.side === 'DEBIT')).map((line) => ({
        accountCode: line.accountCode,
        amount: String(line.amount),
        note: line.note || '',
        referenceType: line.referenceType || '',
        referenceId: line.referenceId || '',
      })) || [{ accountCode: '', amount: '', note: '', referenceType: '', referenceId: '' }])
      : [],
  );

  const directories = useMemo(() => ({ customers, suppliers, financeAccounts }), [customers, suppliers, financeAccounts]);
  const cashBankAccounts = useMemo(() => accounts.filter((account) => account.isCashAccount || account.isBankAccount), [accounts]);
  const debitTotal = voucherType === 'JOURNAL' ? totalForJournal(journalLines, 'debit') : voucherType === 'PAYMENT' ? totalForAllocation(allocationLines) : Number(form.amount || totalForAllocation(allocationLines) || 0);
  const creditTotal = voucherType === 'JOURNAL' ? totalForJournal(journalLines, 'credit') : voucherType === 'RECEIPT' ? totalForAllocation(allocationLines) : Number(form.amount || totalForAllocation(allocationLines) || 0);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      voucherType,
      voucherDate: form.voucherDate,
      referenceNumber: form.referenceNumber,
      narration: form.narration,
      notes: form.notes,
      counterpartyName: form.counterpartyName,
    };

    if (voucherType === 'JOURNAL') {
      payload.lines = journalLines.map((line) => ({
        accountCode: line.accountCode,
        debit: line.debit,
        credit: line.credit,
        note: line.note,
        referenceType: line.referenceType,
        referenceId: line.referenceId,
      }));
    } else if (voucherType === 'RECEIPT' || voucherType === 'PAYMENT') {
      payload.cashBankAccountCode = form.cashBankAccountCode;
      payload.lines = allocationLines.map((line) => ({
        accountCode: line.accountCode,
        amount: line.amount,
        note: line.note,
        referenceType: line.referenceType,
        referenceId: line.referenceId,
      }));
    } else {
      payload.fromAccountCode = form.fromAccountCode;
      payload.toAccountCode = form.toAccountCode;
      payload.amount = form.amount;
    }

    const result = await onSave(payload);
    setSaving(false);
    if (result?.error) {
      setError(result.error);
    }
  }

  return (
    <Modal title={voucher ? `Edit ${voucherType} Voucher` : `New ${voucherType} Voucher`} description={vt(language, 'All voucher types post through the shared journal service.')} onClose={onClose} width="max-w-6xl">
      <form className="space-y-5" onSubmit={handleSubmit}>
        {error ? <Alert type="error">{error}</Alert> : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <label>
            <span className="label">{vt(language, 'Voucher Date')}</span>
            <input type="date" className="input" value={form.voucherDate} onChange={(event) => setForm((current) => ({ ...current, voucherDate: event.target.value }))} required />
          </label>
          <label>
            <span className="label">{vt(language, 'Reference Number')}</span>
            <input className="input" value={form.referenceNumber} onChange={(event) => setForm((current) => ({ ...current, referenceNumber: event.target.value }))} />
          </label>
          {(voucherType === 'RECEIPT' || voucherType === 'PAYMENT') ? (
            <label>
              <span className="label">{vt(language, 'Cash / Bank Account')}</span>
              <select className="input" value={form.cashBankAccountCode} onChange={(event) => setForm((current) => ({ ...current, cashBankAccountCode: event.target.value }))}>
                <option value="">{vt(language, 'Select account')}</option>
                {cashBankAccounts.map((account) => <option key={account.code} value={account.code}>{account.code} - {account.name}</option>)}
              </select>
            </label>
          ) : null}
          {voucherType === 'CONTRA' ? (
            <>
              <label>
                <span className="label">{vt(language, 'From Account')}</span>
                <select className="input" value={form.fromAccountCode} onChange={(event) => setForm((current) => ({ ...current, fromAccountCode: event.target.value }))}>
                  <option value="">{vt(language, 'Select account')}</option>
                  {cashBankAccounts.map((account) => <option key={account.code} value={account.code}>{account.code} - {account.name}</option>)}
                </select>
              </label>
              <label>
                <span className="label">{vt(language, 'To Account')}</span>
                <select className="input" value={form.toAccountCode} onChange={(event) => setForm((current) => ({ ...current, toAccountCode: event.target.value }))}>
                  <option value="">{vt(language, 'Select account')}</option>
                  {cashBankAccounts.map((account) => <option key={account.code} value={account.code}>{account.code} - {account.name}</option>)}
                </select>
              </label>
              <label>
                <span className="label">{vt(language, 'Amount')}</span>
                <input type="number" min="0" step="0.01" className="input" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} />
              </label>
            </>
          ) : null}
          <label className={voucherType === 'CONTRA' ? '' : 'lg:col-span-2'}>
            <span className="label">{vt(language, 'Counterparty / Received From / Paid To')}</span>
            <input className="input" value={form.counterpartyName} onChange={(event) => setForm((current) => ({ ...current, counterpartyName: event.target.value }))} />
          </label>
          <label className="lg:col-span-2">
            <span className="label">{vt(language, 'Narration')}</span>
            <textarea className="input min-h-[88px]" value={form.narration} onChange={(event) => setForm((current) => ({ ...current, narration: event.target.value }))} />
          </label>
          <label className="lg:col-span-2">
            <span className="label">{vt(language, 'Notes')}</span>
            <textarea className="input min-h-[88px]" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
          </label>
        </div>

        {voucherType === 'JOURNAL' ? <JournalLineEditor lines={journalLines} setLines={setJournalLines} accounts={accounts} directories={directories} /> : null}
        {voucherType === 'RECEIPT' ? <AllocationLineEditor lines={allocationLines} setLines={setAllocationLines} accounts={accounts} directories={directories} sideLabel="Credit" /> : null}
        {voucherType === 'PAYMENT' ? <AllocationLineEditor lines={allocationLines} setLines={setAllocationLines} accounts={accounts} directories={directories} sideLabel="Debit" /> : null}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          <div className="flex flex-wrap items-center gap-4">
            <span><strong>{vt(language, 'Debit:')}</strong> {debitTotal.toFixed(2)}</span>
            <span><strong>{vt(language, 'Credit:')}</strong> {creditTotal.toFixed(2)}</span>
          </div>
          <div className={Math.abs(debitTotal - creditTotal) < 0.001 ? 'font-semibold text-emerald-700' : 'font-semibold text-rose-600'}>
            {Math.abs(debitTotal - creditTotal) < 0.001 ? 'Balanced' : 'Not balanced'}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>{vt(language, 'Cancel')}</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? vt(language, 'Saving...') : vt(language, 'Save Voucher')}</button>
        </div>
      </form>
    </Modal>
  );
}
