import { useState } from 'react';
import { ArrowLeftRight, Boxes, Download, FileSpreadsheet, HandCoins, Landmark, Loader2, Plus, Printer, Scale, Trash2, Wallet } from 'lucide-react';
import { Alert, Badge, CopyableText, EmptyState, MobileCardList, MobileListCard, Pagination, SectionHeader, StatCard, StatCardSkeleton, TableSkeleton, Select } from '../../../components/ui.jsx';
import { DateRangePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { downloadSheetPdf } from '../../../services/printService.js';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { formatCurrency, formatDate, formatDateTime } from '../../../utils/calculations.js';
import { useFinanceAccountsViewModel } from '../viewmodels/useFinanceAccountsViewModel';
import { useAsyncAction } from '../../../hooks/useAsyncAction.js';
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
  const [downloadingPdf, downloadPdf] = useAsyncAction();

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
        title={t('financeAccounts.title')}
        compact
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
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 no-print sm:flex-row sm:items-center sm:flex-wrap">
          <Select className="input sm:w-72" value={vm.accountType} onChange={(event) => vm.setAccountType(event.target.value)}>
            <option value="">{t('financeAccounts.allAccounts')}</option>
            {vm.accounts.map((account) => (
              <option key={account.type} value={account.type}>{account.name}</option>
            ))}
          </Select>
          <DateRangePickerField
            className="sm:w-80"
            from={vm.dateFrom}
            to={vm.dateTo}
            onChange={(from, to) => { vm.setDateFrom(from); vm.setDateTo(to); }}
            placeholder={`${t('financeAccounts.dateFrom')} - ${t('financeAccounts.dateTo')}`}
          />
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            <button
              type="button"
              className="btn-secondary h-10 gap-1.5 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => downloadPdf(async () => {
                await inventoryApi.recordPrint({ entityType: 'finance_accounts', entityId: null, label: 'pdf' }).catch(() => {});
                await downloadSheetPdf(FINANCE_ACCOUNTS_PRINT_ID, 'finance-accounts.pdf');
              })}
              disabled={downloadingPdf}
            >
              {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {t('purchaseReceive.downloadPdf')}
            </button>
            <button type="button" className="btn-secondary h-10 gap-1.5 px-3 text-xs" onClick={handleExportExcel}>
              <FileSpreadsheet size={14} />
              {t('common.exportExcel')}
            </button>
            <button
              type="button"
              className="btn-secondary h-10 gap-1.5 px-3 text-xs"
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
          <>
          <MobileCardList>
            {vm.items.map((transaction) => (
              <MobileListCard
                key={transaction.id}
                title={transaction.accountName}
                badge={<Badge tone={TYPE_TONES[transaction.type] || 'slate'}>{t(`financeAccounts.${transaction.type === 'DEPOSIT' ? 'deposit' : transaction.type === 'WITHDRAWAL' ? 'withdrawal' : transaction.type === 'TRANSFER_IN' ? 'transferIn' : 'transferOut'}`)}</Badge>}
                subtitle={`${formatDateTime(transaction.transactionDate)}${transaction.note ? ` · ${transaction.note}` : ''}`}
                value={transaction.debit > 0 ? `+${formatCurrency(transaction.debit)}` : `-${formatCurrency(transaction.credit)}`}
                valueClass={transaction.debit > 0 ? 'text-emerald-700' : 'text-rose-600'}
                valueSub={formatCurrency(transaction.balanceAfter)}
                action={canManage ? (
                  <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" title={t('common.delete')} onClick={() => vm.deleteTransaction(transaction.id)}>
                    <Trash2 size={16} />
                  </button>
                ) : null}
              />
            ))}
          </MobileCardList>
          <div className="hidden overflow-x-auto md:block">
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
                    <td className="table-cell">
                      <div>{formatDateTime(transaction.transactionDate)}</div>
                      <div className="mt-1"><CopyableText value={transaction.id} copyLabel="transaction ID" displayValue={transaction.id.slice(0, 10)} textClassName="text-xs font-medium text-slate-500" buttonClassName="h-5 w-5" /></div>
                    </td>
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
                    <td className="table-cell max-w-64">
                      <p className="truncate">{transaction.note || '-'}</p>
                    </td>
                    <td className="table-cell">{transaction.createdByName || '-'}</td>
                    {canManage ? (
                      <td className="table-cell no-print">
                        <div className="row-actions flex justify-end gap-2">
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
          </>
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

