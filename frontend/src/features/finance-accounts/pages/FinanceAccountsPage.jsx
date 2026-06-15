import { useState } from 'react';
import { ArrowLeftRight, Landmark, Plus, Trash2, Wallet } from 'lucide-react';
import { Alert, Badge, EmptyState, LoadingState, Pagination, SectionHeader, StatCard, TableSkeleton } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency, formatDate } from '../../../utils/calculations.js';
import { useFinanceAccountsViewModel } from '../viewmodels/useFinanceAccountsViewModel';
import AccountTransactionFormModal from '../components/AccountTransactionFormModal';
import AccountTransferFormModal from '../components/AccountTransferFormModal';

const TYPE_TONES = {
  DEPOSIT: 'emerald',
  WITHDRAWAL: 'rose',
  TRANSFER_IN: 'blue',
  TRANSFER_OUT: 'amber',
};

export default function FinanceAccountsPage() {
  const { t, can, confirm } = useInventoryApp();
  const vm = useFinanceAccountsViewModel({ confirm });
  const [modal, setModal] = useState(null);
  const canManage = can('manage_finance_accounts');

  const cashInHand = vm.accounts.find((account) => account.type === 'CASH')?.balance || 0;
  const bankBalance = vm.accounts.find((account) => account.type === 'BANK')?.balance || 0;

  return (
    <div>
      <SectionHeader
        eyebrow={t('financeAccounts.eyebrow')}
        title={t('financeAccounts.title')}
        description={t('financeAccounts.description')}
        action={canManage ? (
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={() => setModal({ type: 'transfer' })}>
              <ArrowLeftRight size={18} />
              {t('financeAccounts.transfer')}
            </button>
            <button type="button" className="btn-primary" onClick={() => setModal({ type: 'transaction' })}>
              <Plus size={18} />
              {t('financeAccounts.addTransaction')}
            </button>
          </div>
        ) : null}
      />

      {vm.accountsError ? (
        <div className="mb-6">
          <Alert type="error">{vm.accountsError}</Alert>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {vm.accountsLoading ? (
          <>
            <LoadingState compact />
            <LoadingState compact />
          </>
        ) : (
          <>
            <StatCard title={t('financeAccounts.cashInHand')} value={formatCurrency(cashInHand)} icon={Wallet} tone="emerald" />
            <StatCard title={t('financeAccounts.bank')} value={formatCurrency(bankBalance)} icon={Landmark} tone="blue" />
          </>
        )}
      </div>

      <div className="surface mt-6 overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <select className="input" value={vm.accountType} onChange={(event) => vm.setAccountType(event.target.value)}>
              <option value="">{t('financeAccounts.allAccounts')}</option>
              <option value="CASH">{t('financeAccounts.cashInHand')}</option>
              <option value="BANK">{t('financeAccounts.bank')}</option>
            </select>
            <DatePickerField value={vm.dateFrom} onChange={vm.setDateFrom} placeholder={t('financeAccounts.dateFrom')} />
            <DatePickerField value={vm.dateTo} onChange={vm.setDateTo} placeholder={t('financeAccounts.dateTo')} />
          </div>
        </div>

        {vm.loading ? (
          <div className="p-5">
            <TableSkeleton columns={7} showHeader={false} />
          </div>
        ) : vm.error ? (
          <div className="p-5">
            <Alert type="error">{vm.error}</Alert>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">{t('financeAccounts.date')}</th>
                  <th className="px-4 py-3">{t('financeAccounts.account')}</th>
                  <th className="px-4 py-3">{t('financeAccounts.type')}</th>
                  <th className="px-4 py-3 text-right">{t('financeAccounts.amount')}</th>
                  <th className="px-4 py-3 text-right">{t('financeAccounts.balanceAfter')}</th>
                  <th className="hidden px-4 py-3 lg:table-cell">{t('financeAccounts.note')}</th>
                  <th className="hidden px-4 py-3 md:table-cell">{t('financeAccounts.createdBy')}</th>
                  {canManage ? <th className="px-4 py-3 text-right">{t('common.actions')}</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vm.items.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-slate-50">
                    <td className="table-cell">{formatDate(transaction.transactionDate)}</td>
                    <td className="table-cell font-semibold text-slate-950">
                      {transaction.accountType === 'CASH' ? t('financeAccounts.cashInHand') : t('financeAccounts.bank')}
                    </td>
                    <td className="table-cell">
                      <Badge tone={TYPE_TONES[transaction.type] || 'slate'}>{t(`financeAccounts.${transaction.type === 'DEPOSIT' ? 'deposit' : transaction.type === 'WITHDRAWAL' ? 'withdrawal' : transaction.type === 'TRANSFER_IN' ? 'transferIn' : 'transferOut'}`)}</Badge>
                    </td>
                    <td className={`table-cell text-right font-bold ${transaction.debit > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {transaction.debit > 0 ? `+${formatCurrency(transaction.debit)}` : `-${formatCurrency(transaction.credit)}`}
                    </td>
                    <td className="table-cell text-right font-semibold">{formatCurrency(transaction.balanceAfter)}</td>
                    <td className="hidden table-cell lg:table-cell max-w-64">
                      <p className="truncate">{transaction.note || '-'}</p>
                    </td>
                    <td className="hidden table-cell md:table-cell">{transaction.createdByName || '-'}</td>
                    {canManage ? (
                      <td className="table-cell">
                        <div className="flex justify-end gap-2">
                          <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" title={t('common.delete')} onClick={() => vm.deleteTransaction(transaction.id)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!vm.loading && !vm.error && !vm.items.length ? (
          <div className="p-5">
            <EmptyState title={t('financeAccounts.noMatchTitle')} description={t('financeAccounts.noMatchDescription')} icon={Wallet} />
          </div>
        ) : null}

        {!vm.loading && !vm.error && vm.items.length ? (
          <div className="border-t border-slate-100 px-5 py-4">
            <Pagination page={vm.page} totalPages={vm.totalPages} onPageChange={vm.setPage} />
          </div>
        ) : null}
      </div>

      {modal?.type === 'transaction' ? (
        <AccountTransactionFormModal
          onClose={() => setModal(null)}
          onSave={async (value) => {
            const result = await vm.saveTransaction(value);
            if (result.ok) {
              setModal(null);
            }
            return result;
          }}
        />
      ) : null}

      {modal?.type === 'transfer' ? (
        <AccountTransferFormModal
          onClose={() => setModal(null)}
          onSave={async (value) => {
            const result = await vm.saveTransfer(value);
            if (result.ok) {
              setModal(null);
            }
            return result;
          }}
        />
      ) : null}
    </div>
  );
}
