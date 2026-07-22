import { useEffect, useMemo, useState } from 'react';
import { at } from '../accountingTranslations.js';
import { Badge, CopyableText, MobileCardList, MobileListCard, Modal, SectionHeader, Alert } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { useMutation } from '@tanstack/react-query';
import { useTenantReportQuery } from '../../reports/queries/useTenantReportQuery.js';
import { transactionKeys } from '../../transactions/queries/transactionQueries.js';
import { getActiveTenantId } from '../../../services/api/client.js';

const ACCOUNT_TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];

function AccountFormModal({ account, accounts, onClose, onSave }) {
  const [form, setForm] = useState({
    code: account?.code || '',
    name: account?.name || '',
    type: account?.type || 'ASSET',
    parentCode: account?.parentCode || '',
    accountGroup: account?.accountGroup || '',
    isActive: account?.isActive !== false,
    isCashAccount: Boolean(account?.isCashAccount),
    isBankAccount: Boolean(account?.isBankAccount),
    isReceivableAccount: Boolean(account?.isReceivableAccount),
    isPayableAccount: Boolean(account?.isPayableAccount),
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const result = await onSave(form);
    setSaving(false);
    if (result?.error) setError(result.error);
  }

  return (
    <Modal title={account ? 'Edit Account' : 'Add Account'} onClose={onClose} width="max-w-2xl">
      <form className="space-y-4" onSubmit={submit}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="label">{at('Code')}</span>
            <input className="input" value={form.code} disabled={Boolean(account)} onChange={(e) => setForm((cur) => ({ ...cur, code: e.target.value }))} required />
          </label>
          <label>
            <span className="label">{at('Type')}</span>
            <select className="input" value={form.type} onChange={(e) => setForm((cur) => ({ ...cur, type: e.target.value }))}>
              {ACCOUNT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <label className="sm:col-span-2">
            <span className="label">{at('Name')}</span>
            <input className="input" value={form.name} onChange={(e) => setForm((cur) => ({ ...cur, name: e.target.value }))} required />
          </label>
          <label>
            <span className="label">{at('Parent Account')}</span>
            <select className="input" value={form.parentCode} onChange={(e) => setForm((cur) => ({ ...cur, parentCode: e.target.value }))}>
              <option value="">{at('None')}</option>
              {accounts.filter((item) => item.code !== account?.code).map((item) => <option key={item.code} value={item.code}>{item.code} - {item.name}</option>)}
            </select>
          </label>
          <label>
            <span className="label">{at('Account Group')}</span>
            <input className="input" value={form.accountGroup} onChange={(e) => setForm((cur) => ({ ...cur, accountGroup: e.target.value }))} />
          </label>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            ['isCashAccount', 'Cash Account'],
            ['isBankAccount', 'Bank Account'],
            ['isReceivableAccount', 'Receivable'],
            ['isPayableAccount', 'Payable'],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <input type="checkbox" checked={form[key]} onChange={(e) => setForm((cur) => ({ ...cur, [key]: e.target.checked }))} />
              {label}
            </label>
          ))}
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((cur) => ({ ...cur, isActive: e.target.checked }))} />
            Active
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>{at('Cancel')}</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? at('Saving...') : at('Save')}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function ChartOfAccountsPage() {
  const { can, pushToast } = useInventoryApp();
  const [modal, setModal] = useState(null);
  const canManage = can('manage_chart_of_accounts');
  const accountsQuery = useTenantReportQuery({
    scope: 'chart-of-accounts-admin',
    queryFn: () => inventoryApi.listChartAccounts(),
    staleTime: 60_000,
  });
  const saveMutation = useMutation({
    mutationKey: transactionKeys.mutation(getActiveTenantId(), 'save-chart-account'),
    mutationFn: ({ code, form }) => code
      ? inventoryApi.updateChartAccount(code, form)
      : inventoryApi.createChartAccount(form),
  });
  const rows = useMemo(() => accountsQuery.data?.accounts || [], [accountsQuery.data]);
  const error = accountsQuery.error?.message || '';

  async function handleSave(form) {
    try {
      await saveMutation.mutateAsync({ code: modal?.account?.code, form });
      setModal(null);
      await accountsQuery.refetch();
      pushToast('success', at('Chart of Accounts'), modal?.account ? at('Account updated.') : at('Account created.'));
      return { ok: true };
    } catch (err) {
      return { error: err?.message || at('Request failed.') };
    }
  }

  return (
    <div>
      <SectionHeader
        eyebrow={at('Accounting')}
        title={at(at('Chart of Accounts'))}
        description={at('Manage parent and child accounts without touching the existing system account codes.')}
        action={canManage ? <button type="button" className="btn-primary" onClick={() => setModal({})}>{at('Add Account')}</button> : null}
      />
      {error ? <Alert type="error">{error}</Alert> : null}
      <div className="surface overflow-hidden">
        <MobileCardList>
          {rows.map((account) => (
            <MobileListCard
              key={account.code}
              onClick={canManage ? () => setModal({ account }) : undefined}
              title={account.name}
              badge={<Badge tone={account.isActive ? 'emerald' : 'slate'}>{account.isActive ? 'Active' : 'Inactive'}</Badge>}
              subtitle={`${account.code} · ${at(account.type)}`}
              value={account.isSystem ? 'System' : null}
            />
          ))}
        </MobileCardList>
        <div className="hidden overflow-x-auto md:block">
        <table className="w-full">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3">{at('Code')}</th>
              <th className="px-4 py-3">{at('Name')}</th>
              <th className="px-4 py-3">{at('Type')}</th>
              <th className="px-4 py-3">{at('Group')}</th>
              <th className="px-4 py-3">{at('Parent')}</th>
              <th className="px-4 py-3">{at('Flags')}</th>
              <th className="px-4 py-3">{at('Status')}</th>
              {canManage ? <th className="px-4 py-3 text-right">{at('Actions')}</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((account) => (
              <tr key={account.code} className="hover:bg-slate-50">
                <td className="table-cell font-mono text-xs"><CopyableText value={account.code} displayValue={account.code} copyLabel="account code" /></td>
                <td className="table-cell font-semibold text-slate-950">{account.name}</td>
                <td className="table-cell">{at(account.type)}</td>
                <td className="table-cell">{account.accountGroup || '-'}</td>
                <td className="table-cell font-mono text-xs">{account.parentCode || '-'}</td>
                <td className="table-cell">
                  <div className="flex flex-wrap gap-1">
                    {account.isSystem ? <Badge tone="slate">{at('System')}</Badge> : null}
                    {account.isCashAccount ? <Badge tone="emerald">{at('Cash')}</Badge> : null}
                    {account.isBankAccount ? <Badge tone="blue">{at('Bank')}</Badge> : null}
                    {account.isReceivableAccount ? <Badge tone="amber">{at('Receivable')}</Badge> : null}
                    {account.isPayableAccount ? <Badge tone="rose">{at('Payable')}</Badge> : null}
                  </div>
                </td>
                <td className="table-cell">{account.isActive ? 'Active' : 'Inactive'}</td>
                {canManage ? <td className="table-cell text-right"><button type="button" className="btn-secondary" onClick={() => setModal({ account })}>{at('Edit')}</button></td> : null}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
      {modal ? <AccountFormModal account={modal.account} accounts={rows} onClose={() => setModal(null)} onSave={handleSave} /> : null}
    </div>
  );
}
