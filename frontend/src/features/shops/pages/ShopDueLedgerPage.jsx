import { useState } from 'react';
import { Download, FileSpreadsheet, HandCoins, Plus, Printer, RefreshCw, Wallet } from 'lucide-react';
import { Alert, Badge, EmptyState, Modal, SectionHeader, StatCard, StatCardSkeleton, TableSkeleton, Select } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { downloadSheetPdf } from '../../../services/printService.js';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { formatCurrency, formatDate, formatDateTime, reverseEntries } from '../../../utils/calculations.js';
import { useShopDueStatementViewModel } from '../viewmodels/useShopDueStatementViewModel.js';

const PRINT_ID = 'shop-due-statement-print';

function ledgerTone(type) {
  if (type === 'COLLECTION') return 'emerald';
  if (type === 'SALE_DUE') return 'rose';
  if (type === 'OPENING') return 'blue';
  if (type === 'MANUAL_ADJUSTMENT') return 'amber';
  return 'slate';
}

function EntryModal({ title, description, balance, balanceLabel, balanceNote, amountLabel, noteLabel, notePlaceholder, submitLabel, onClose, onSave, t }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [businessDate, setBusinessDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submitForm(event) {
    event.preventDefault();
    const amountValue = Number(amount);
    if (!(amountValue > 0)) {
      setError(t('shopDueLedger.amountRequired'));
      return;
    }
    setSaving(true);
    setError('');
    const result = await onSave({ amount: amountValue, note: note.trim(), businessDate });
    setSaving(false);
    if (!result?.ok) {
      setError(result?.error || t('shopDueLedger.saveFailed'));
    }
  }

  return (
    <Modal title={title} description={description} onClose={onClose} width="max-w-lg">
      <form className="space-y-4" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase text-slate-500">{balanceLabel}</p>
          <p className="mt-1 text-lg font-bold text-slate-950">{formatCurrency(balance || 0)}</p>
          {balanceNote ? <p className="mt-1 text-xs text-slate-500">{balanceNote}</p> : null}
        </div>
        <div>
          <label className="label">{t('shopDueLedger.date')}</label>
          <DatePickerField value={businessDate} onChange={setBusinessDate} max={new Date().toISOString().slice(0, 10)} />
        </div>
        <div>
          <label className="label">{amountLabel}</label>
          <input className="input" type="number" inputMode="decimal" min="0" step="0.0001" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <label className="label">{noteLabel}</label>
          <textarea className="input min-h-20" value={note} onChange={(e) => setNote(e.target.value)} placeholder={notePlaceholder} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <HandCoins size={18} />
            {saving ? t('common.saving') : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function ShopDueLedgerPage() {
  const { t, can, shopDirectory, language } = useInventoryApp();
  const vm = useShopDueStatementViewModel({ shops: shopDirectory });
  const entries = reverseEntries(vm.statement?.entries);
  const [modal, setModal] = useState(null); // 'due' | 'collect' | null

  const selectedShop = shopDirectory.find((s) => s.id === vm.shopId);
  const canManage = can('manage_customers');

  async function handleExportExcel() {
    const { utils, writeFile } = await import('xlsx');
    const header = [
      t('shopDueLedger.date'),
      t('shopDueLedger.type'),
      t('shopDueLedger.debit'),
      t('shopDueLedger.credit'),
      t('shopDueLedger.balance'),
      t('shopDueLedger.note'),
      t('shopDueLedger.createdBy'),
    ];
    const data = (entries || []).map((e) => [
      e.businessDate || String(e.createdAt || '').slice(0, 10),
      e.type,
      Number(e.debit || 0),
      Number(e.credit || 0),
      Number(e.balanceAfter),
      e.note || '',
      e.createdByName || '',
    ]);
    const ws = utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [{ wch: 14 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 28 }, { wch: 18 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, t('shopDueLedger.sheetName'));
    writeFile(wb, `shop-due-${selectedShop?.shopName || vm.shopId}.xlsx`);
  }

  async function handleRecordDue(payload) {
    const result = await vm.recordDue(payload);
    if (result.ok) setModal(null);
    return result;
  }

  async function handleCollect(payload) {
    const result = await vm.collectDue(payload);
    if (result.ok) setModal(null);
    return result;
  }

  return (
    <div>
      <SectionHeader
        eyebrow={t('shopDueLedger.eyebrow')}
        title={t('shopDueLedger.title')}
        description={t('shopDueLedger.description')}
        action={canManage && vm.shopId ? (
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={() => setModal('due')}>
              <Plus size={18} />
              {t('shopDueLedger.recordDue')}
            </button>
            <button type="button" className="btn-primary" onClick={() => setModal('collect')}>
              <HandCoins size={18} />
              {t('shopDueLedger.collectDue')}
            </button>
          </div>
        ) : null}
      />

      <div className="surface p-5">
        <div className="grid gap-3 sm:grid-cols-4">
          <Select
            className="input sm:col-span-2"
            value={vm.shopId}
            onChange={(e) => vm.setShopId(e.target.value)}
          >
            <option value="">{t('shopDueLedger.selectShop')}</option>
            {shopDirectory.map((shop) => (
              <option key={shop.id} value={shop.id}>{shop.shopName || shop.name}</option>
            ))}
          </Select>
          <DatePickerField
            value={vm.dateFrom}
            onChange={vm.setDateFrom}
            placeholder={t('supplierStatement.dateFrom')}
          />
          <DatePickerField
            value={vm.dateTo}
            onChange={vm.setDateTo}
            placeholder={t('supplierStatement.dateTo')}
            min={vm.dateFrom}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={vm.refresh}>
            <RefreshCw size={18} />
            {t('supplierStatement.refresh')}
          </button>
          {vm.statement ? (
            <>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  inventoryApi.recordPrint({ entityType: 'shop_due_statement', entityId: vm.shopId, label: 'pdf' }).catch(() => {});
                  downloadSheetPdf(PRINT_ID, `shop-due-${selectedShop?.shopName || vm.shopId}.pdf`);
                }}
              >
                <Download size={18} />
                {t('purchaseReceive.downloadPdf')}
              </button>
              <button type="button" className="btn-secondary" onClick={handleExportExcel}>
                <FileSpreadsheet size={18} />
                {t('common.exportExcel')}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  inventoryApi.recordPrint({ entityType: 'shop_due_statement', entityId: vm.shopId, label: 'print' }).catch(() => {});
                  window.print();
                }}
              >
                <Printer size={18} />
                {t('common.print')}
              </button>
            </>
          ) : null}
        </div>
      </div>

      {vm.loading ? (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
          </div>
          <div className="surface mt-6 overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="h-4 w-40 animate-pulse rounded-full bg-slate-200" />
            </div>
            <TableSkeleton rows={6} columns={7} />
          </div>
        </>
      ) : vm.error ? (
        <div className="surface mt-6 p-5">
          <EmptyState title={t('shopDueLedger.emptyTitle')} description={vm.error} icon={Wallet} />
        </div>
      ) : !vm.statement ? (
        <div className="surface mt-6 p-5">
          <EmptyState title={t('shopDueLedger.emptyTitle')} description={t('shopDueLedger.emptyDescription')} icon={Wallet} />
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title={t('supplierStatement.openingBalance')} value={formatCurrency(vm.statement.openingBalance, language)} icon={Wallet} tone="slate" />
            <StatCard title={t('shopDueLedger.totalDebit')} value={formatCurrency(vm.statement.totalDebit, language)} icon={Wallet} tone="rose" />
            <StatCard title={t('shopDueLedger.totalCredit')} value={formatCurrency(vm.statement.totalCredit, language)} icon={Wallet} tone="emerald" />
            <StatCard title={t('supplierStatement.closingBalance')} value={formatCurrency(vm.statement.closingBalance, language)} icon={Wallet} tone="blue" />
          </div>

          {vm.statement.shop ? (
            <div className="surface mt-4 px-5 py-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{t('shopDueLedger.shop')}</p>
                  <p className="mt-1 font-bold text-slate-950">{vm.statement.shop.shopName}</p>
                  {vm.statement.shop.ownerName ? <p className="text-sm text-slate-600">{vm.statement.shop.ownerName}</p> : null}
                </div>
                {vm.statement.shop.market ? (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{t('shopDueLedger.market')}</p>
                    <p className="mt-1 font-semibold text-slate-700">{vm.statement.shop.market}</p>
                  </div>
                ) : null}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{t('shopDueLedger.currentDue')}</p>
                  <p className={`mt-1 text-lg font-semibold ${vm.statement.shop.currentDue > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {formatCurrency(vm.statement.shop.currentDue, language)}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div id={PRINT_ID} className="surface mt-6 overflow-hidden print-target">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="section-title">{t('shopDueLedger.entriesTitle')}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-3">{t('shopDueLedger.date')}</th>
                    <th className="px-4 py-3">{t('shopDueLedger.type')}</th>
                    <th className="px-4 py-3 text-right">{t('shopDueLedger.debit')}</th>
                    <th className="px-4 py-3 text-right">{t('shopDueLedger.credit')}</th>
                    <th className="px-4 py-3 text-right">{t('shopDueLedger.balance')}</th>
                    <th className="px-4 py-3">{t('shopDueLedger.note')}</th>
                    <th className="hidden px-4 py-3 xl:table-cell">{t('shopDueLedger.createdBy')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(entries || []).map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className="table-cell whitespace-nowrap text-sm font-semibold text-slate-700">
                        {entry.businessDate ? formatDate(entry.businessDate) : formatDateTime(entry.createdAt, language)}
                      </td>
                      <td className="table-cell">
                        <Badge tone={ledgerTone(entry.type)}>{t(`shopDueLedger.types.${entry.type}`)}</Badge>
                      </td>
                      <td className="table-cell text-right font-semibold text-rose-700">
                        {entry.debit ? formatCurrency(entry.debit, language) : '-'}
                      </td>
                      <td className="table-cell text-right font-semibold text-emerald-700">
                        {entry.credit ? formatCurrency(entry.credit, language) : '-'}
                      </td>
                      <td className="table-cell text-right font-semibold text-slate-950">
                        {formatCurrency(entry.balanceAfter, language)}
                      </td>
                      <td className="hidden table-cell lg:table-cell max-w-52">
                        <p className="truncate text-sm text-slate-600">{entry.note || '-'}</p>
                      </td>
                      <td className="hidden table-cell xl:table-cell">
                        <p className="font-semibold text-slate-950">{entry.createdByName || '-'}</p>
                        <p className="text-xs text-slate-500">{entry.createdByRole || ''}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!entries?.length ? (
              <div className="p-5">
                <EmptyState title={t('shopDueLedger.emptyTitle')} description={t('shopDueLedger.emptyDescription')} icon={Wallet} />
              </div>
            ) : null}
          </div>
        </>
      )}

      {modal === 'due' && vm.statement ? (
        <EntryModal
          title={t('shopDueLedger.recordDueTitle')}
          description={vm.statement.shop?.shopName || ''}
          balance={vm.statement.closingBalance}
          balanceLabel={t('shopDueLedger.currentBalance')}
          amountLabel={t('shopDueLedger.dueAmount')}
          noteLabel={t('shopDueLedger.note')}
          notePlaceholder={t('shopDueLedger.notePlaceholder')}
          submitLabel={t('shopDueLedger.recordDue')}
          onClose={() => setModal(null)}
          onSave={handleRecordDue}
          t={t}
        />
      ) : null}

      {modal === 'collect' && vm.statement ? (
        <EntryModal
          title={t('shopDueLedger.collectDueTitle')}
          description={vm.statement.shop?.shopName || ''}
          balance={vm.statement.closingBalance}
          balanceLabel={t('shopDueLedger.currentBalance')}
          balanceNote={vm.statement.closingBalance <= 0 ? t('shopDueLedger.noBalanceNote') : null}
          amountLabel={t('shopDueLedger.collectAmount')}
          noteLabel={t('shopDueLedger.note')}
          notePlaceholder={t('shopDueLedger.notePlaceholder')}
          submitLabel={t('shopDueLedger.collectDue')}
          onClose={() => setModal(null)}
          onSave={handleCollect}
          t={t}
        />
      ) : null}
    </div>
  );
}

