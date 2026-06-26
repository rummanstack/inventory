import { useState } from 'react';
import { ArrowLeftRight, Boxes, Download, FileSpreadsheet, HandCoins, Landmark, Plus, Printer, Scale, Trash2, Wallet } from 'lucide-react';
import { Alert, Badge, EmptyState, Pagination, SectionHeader, StatCard, StatCardSkeleton, TableSkeleton } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { downloadSheetPdf } from '../../../services/printService.js';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { formatCurrency, formatDate, formatDateTime } from '../../../utils/calculations.js';
import { useFinanceAccountsViewModel } from '../viewmodels/useFinanceAccountsViewModel';
import AccountTransactionFormModal from '../components/AccountTransactionFormModal';
import AccountTransferFormModal from '../components/AccountTransferFormModal';

const FINANCE_ACCOUNTS_PRINT_ID = 'finance-accounts-print';

const TYPE_TONES = {
  DEPOSIT: 'emerald',
  WITHDRAWAL: 'rose',
  TRANSFER_IN: 'blue',
  TRANSFER_OUT: 'amber',
};


export default function FinanceAccountsPage() {
  const { t, can, confirm, productDirectory } = useInventoryApp();
  const vm = useFinanceAccountsViewModel({ confirm });
  const [modal, setModal] = useState(null);
  const canManage = can('manage_finance_accounts');

  const cashBalance = vm.accounts.find((a) => a.type === 'CASH')?.balance || 0;
  const bankBalance = vm.accounts.find((a) => a.type === 'BANK')?.balance || 0;
  const stockValue = productDirectory.reduce((sum, product) => sum + (product.stockPieces + Number(product.damagedPieces || 0)) * Number(product.purchasePrice || 0), 0);
  const dueTotal = vm.totalDsrDue + vm.totalCustomerDue;
  const totalCashPosition = cashBalance + bankBalance + stockValue + dueTotal;

  async function handleExportExcel() {
    const { utils, writeFile } = await import('xlsx');
    const header = [t('financeAccounts.date'), t('financeAccounts.account'), t('financeAccounts.type'), t('financeAccounts.amount'), t('financeAccounts.balanceAfter'), t('financeAccounts.note'), t('financeAccounts.createdBy')];
    const data = vm.items.map((transaction) => [
      formatDateTime(transaction.transactionDate),
      transaction.accountName,
      t(`financeAccounts.${transaction.type === 'DEPOSIT' ? 'deposit' : transaction.type === 'WITHDRAWAL' ? 'withdrawal' : transaction.type === 'TRANSFER_IN' ? 'transferIn' : 'transferOut'}`),
      transaction.debit > 0 ? Number(transaction.debit) : -Number(transaction.credit),
      Number(transaction.balanceAfter),
      transaction.note || '',
      transaction.createdByName || '',
    ]);
    const ws = utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [{ wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 24 }, { wch: 18 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, t('financeAccounts.sheetName'));
    writeFile(wb, 'finance-accounts.xlsx');
  }

  return (
    <div>
      <SectionHeader
        eyebrow={t('financeAccounts.eyebrow')}
        title={t('financeAccounts.title')}
        description={t('financeAccounts.description')}
        action={canManage ? (
          <div className="flex gap-2">
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {vm.accountsLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              title={t('financeAccounts.cashInHand')}
              value={formatCurrency(cashBalance)}
              icon={Wallet}
              tone={cashBalance < 0 ? 'rose' : 'emerald'}
            />
            <StatCard
              title={t('financeAccounts.bank')}
              value={formatCurrency(bankBalance)}
              icon={Landmark}
              tone={bankBalance < 0 ? 'rose' : 'indigo'}
            />
            <StatCard
              title={t('financeAccounts.cashInStock')}
              value={formatCurrency(stockValue)}
              helper={t('financeAccounts.cashInStockHelper')}
              icon={Boxes}
              tone="blue"
            />
            <StatCard
              title={t('financeAccounts.cashInDue')}
              value={formatCurrency(dueTotal)}
              helper={t('financeAccounts.cashInDueHelper')}
              icon={HandCoins}
              tone="amber"
            />
            <StatCard
              title={t('financeAccounts.totalCashPosition')}
              value={formatCurrency(totalCashPosition)}
              helper={t('financeAccounts.totalCashPositionHelper')}
              icon={Scale}
              tone="slate"
            />
          </>
        )}
      </div>

      <div id={FINANCE_ACCOUNTS_PRINT_ID} className="surface mt-6 overflow-hidden print-target">
        <div className="border-b border-slate-100 p-5 no-print">
          <div className="grid gap-3 sm:grid-cols-3">
            <select className="input" value={vm.accountType} onChange={(event) => vm.setAccountType(event.target.value)}>
              <option value="">{t('financeAccounts.allAccounts')}</option>
              {vm.accounts.map((account) => (
                <option key={account.type} value={account.type}>{account.name}</option>
              ))}
            </select>
            <DatePickerField value={vm.dateFrom} onChange={vm.setDateFrom} placeholder={t('financeAccounts.dateFrom')} />
            <DatePickerField value={vm.dateTo} onChange={vm.setDateTo} placeholder={t('financeAccounts.dateTo')} min={vm.dateFrom} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary py-1.5 text-xs"
              onClick={() => { inventoryApi.recordPrint({ entityType: 'finance_accounts', entityId: null, label: 'pdf' }).catch(() => {}); downloadSheetPdf(FINANCE_ACCOUNTS_PRINT_ID, 'finance-accounts.pdf'); }}
            >
              <Download size={14} />
              {t('purchaseReceive.downloadPdf')}
            </button>
            <button type="button" className="btn-secondary py-1.5 text-xs" onClick={handleExportExcel}>
              <FileSpreadsheet size={14} />
              {t('common.exportExcel')}
            </button>
            <button
              type="button"
              className="btn-secondary py-1.5 text-xs"
              onClick={() => { inventoryApi.recordPrint({ entityType: 'finance_accounts', entityId: null, label: 'print' }).catch(() => {}); window.print(); }}
            >
              <Printer size={14} />
              {t('common.print')}
            </button>
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
                  <th className="px-4 py-3">{t('financeAccounts.note')}</th>
                  <th className="px-4 py-3">{t('financeAccounts.createdBy')}</th>
                  {canManage ? <th className="px-4 py-3 text-right no-print">{t('common.actions')}</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vm.items.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-slate-50">
                    <td className="table-cell">{formatDateTime(transaction.transactionDate)}</td>
                    <td className="table-cell font-semibold text-slate-950">
                      {transaction.accountName}
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
                      <td className="table-cell no-print">
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
          <div className="border-t border-slate-100 px-5 py-4 no-print">
            <Pagination page={vm.page} totalPages={vm.totalPages} onPageChange={vm.setPage} />
          </div>
        ) : null}
      </div>

      {modal?.type === 'transaction' ? (
        <AccountTransactionFormModal
          onClose={() => setModal(null)}
          onSave={async (value) => {
            const result = await vm.saveTransaction(value);
            if (result.ok) setModal(null);
            return result;
          }}
        />
      ) : null}

      {modal?.type === 'transfer' ? (
        <AccountTransferFormModal
          accounts={vm.accounts}
          onClose={() => setModal(null)}
          onSave={async (value) => {
            const result = await vm.saveTransfer(value);
            if (result.ok) setModal(null);
            return result;
          }}
        />
      ) : null}

    </div>
  );
}
