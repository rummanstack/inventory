import { useEffect, useState } from 'react';
import { Alert, CopyableText, MobileCardList, MobileListCard, Modal, SectionHeader } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { formatCurrency } from '../../../utils/calculations.js';
import { useTenantApiQuery } from '../../../queries/useTenantApiQuery.js';

function OpeningBalanceFormModal({ item, accounts, customers, suppliers, financeAccounts, onClose, onSave }) {
  const [form, setForm] = useState({
    referenceType: item?.referenceType || 'ACCOUNT',
    referenceId: item?.referenceId || '',
    accountCode: item?.accountCode || '',
    balanceDate: item?.balanceDate || '',
    amount: item?.amount || '',
    balanceSide: item?.balanceSide || 'DEBIT',
    note: item?.note || '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    const result = await onSave(form);
    setSaving(false);
    if (result?.error) setError(result.error);
  }

  const referenceOptions = form.referenceType === 'CUSTOMER'
    ? customers
    : form.referenceType === 'SUPPLIER'
      ? suppliers
      : financeAccounts;

  return (
    <Modal title={item ? 'Edit Opening Balance' : 'Add Opening Balance'} onClose={onClose} width="max-w-2xl">
      <form className="space-y-4" onSubmit={submit}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="label">Type</span>
            <select className="input" value={form.referenceType} onChange={(e) => setForm((cur) => ({ ...cur, referenceType: e.target.value, referenceId: '', accountCode: '' }))}>
              <option value="ACCOUNT">General Ledger Account</option>
              <option value="CUSTOMER">Customer</option>
              <option value="SUPPLIER">Supplier</option>
              <option value="FINANCE_ACCOUNT">Cash / Bank Account</option>
            </select>
          </label>
          <label>
            <span className="label">Date</span>
            <input type="date" className="input" value={form.balanceDate} onChange={(e) => setForm((cur) => ({ ...cur, balanceDate: e.target.value }))} required />
          </label>
          {form.referenceType === 'ACCOUNT' ? (
            <label className="sm:col-span-2">
              <span className="label">Account</span>
              <select className="input" value={form.accountCode} onChange={(e) => setForm((cur) => ({ ...cur, accountCode: e.target.value }))} required>
                <option value="">Select account</option>
                {accounts.map((account) => <option key={account.code} value={account.code}>{account.code} - {account.name}</option>)}
              </select>
            </label>
          ) : (
            <label className="sm:col-span-2">
              <span className="label">Reference</span>
              <select className="input" value={form.referenceId} onChange={(e) => setForm((cur) => ({ ...cur, referenceId: e.target.value }))} required>
                <option value="">Select reference</option>
                {referenceOptions.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
              </select>
            </label>
          )}
          <label>
            <span className="label">Amount</span>
            <input type="number" min="0" step="0.01" className="input" value={form.amount} onChange={(e) => setForm((cur) => ({ ...cur, amount: e.target.value }))} required />
          </label>
          <label>
            <span className="label">Balance Side</span>
            <select className="input" value={form.balanceSide} onChange={(e) => setForm((cur) => ({ ...cur, balanceSide: e.target.value }))}>
              <option value="DEBIT">Debit</option>
              <option value="CREDIT">Credit</option>
            </select>
          </label>
          <label className="sm:col-span-2">
            <span className="label">Note</span>
            <textarea className="input min-h-[88px]" value={form.note} onChange={(e) => setForm((cur) => ({ ...cur, note: e.target.value }))} />
          </label>
        </div>
        <div className="flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={onClose}>Cancel</button><button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button></div>
      </form>
    </Modal>
  );
}

export default function OpeningBalancesPage() {
  const { can, language, pushToast } = useInventoryApp();
  const canManage = can('manage_opening_balances');
  const [modal, setModal] = useState(null);
  const balancesQuery = useTenantApiQuery({
    scope: 'opening-balances',
    queryFn: async () => {
      const [balances, coa, retailCustomers, supplierRows, accountRows] = await Promise.all([
        inventoryApi.listOpeningBalances(),
        inventoryApi.listChartAccounts(),
        inventoryApi.getActiveRetailCustomers(),
        inventoryApi.getActiveSuppliers(),
        inventoryApi.listFinanceAccounts(),
      ]);
      return { balances, coa, retailCustomers, supplierRows, accountRows };
    },
  });
  const items = balancesQuery.data?.balances?.openingBalances || [];
  const accounts = balancesQuery.data?.coa?.accounts || [];
  const customers = balancesQuery.data?.retailCustomers?.items || balancesQuery.data?.retailCustomers?.customers || [];
  const suppliers = balancesQuery.data?.supplierRows?.items || [];
  const financeAccounts = balancesQuery.data?.accountRows?.accounts || [];
  const error = balancesQuery.error?.message || '';
  const load = () => balancesQuery.refetch();

  async function handleSave(form) {
    try {
      if (modal?.item) {
        await inventoryApi.updateOpeningBalance(modal.item.id, form);
      } else {
        await inventoryApi.createOpeningBalance(form);
      }
      setModal(null);
      await load();
      pushToast('success', 'Opening Balances', modal?.item ? 'Opening balance updated.' : 'Opening balance created.');
      return { ok: true };
    } catch (err) {
      return { error: err?.message || 'Request failed.' };
    }
  }

  return (
    <div>
      <SectionHeader eyebrow="Accounting" title="Opening Balances" description="Each opening balance posts a proper journal entry against owner�s equity and stays inside the journal engine." action={canManage ? <button type="button" className="btn-primary" onClick={() => setModal({})}>Add Opening Balance</button> : null} />
      {error ? <Alert type="error">{error}</Alert> : null}
      <div className="surface overflow-hidden">
        <MobileCardList>
          {items.map((item) => (
            <MobileListCard
              key={item.id}
              onClick={canManage ? () => setModal({ item }) : undefined}
              title={`${item.accountCode} - ${item.accountName}`}
              subtitle={`${item.referenceType} · ${item.balanceDate}`}
              value={formatCurrency(item.amount, language)}
              valueSub={item.balanceSide}
            />
          ))}
        </MobileCardList>
        <div className="hidden overflow-x-auto md:block">
        <table className="w-full">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Side</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Journal</th>
              {canManage ? <th className="px-4 py-3 text-right">Actions</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="table-cell font-semibold text-slate-950">{item.referenceType} {item.referenceId || item.accountCode}</td>
                <td className="table-cell">{item.accountCode} - {item.accountName}</td>
                <td className="table-cell">{item.balanceDate}</td>
                <td className="table-cell">{item.balanceSide}</td>
                <td className="table-cell text-right">{formatCurrency(item.amount, language)}</td>
                <td className="table-cell font-mono text-xs"><CopyableText value={item.journalEntryId} displayValue={item.journalEntryId.slice(0, 16)} copyLabel="journal entry id" /></td>
                {canManage ? <td className="table-cell text-right"><button type="button" className="btn-secondary" onClick={() => setModal({ item })}>Edit</button></td> : null}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
      {modal ? <OpeningBalanceFormModal item={modal.item} accounts={accounts} customers={customers} suppliers={suppliers} financeAccounts={financeAccounts} onClose={() => setModal(null)} onSave={handleSave} /> : null}
    </div>
  );
}
