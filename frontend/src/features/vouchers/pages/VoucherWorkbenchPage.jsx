import { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, BookOpen, HandCoins, Receipt, Wallet } from 'lucide-react';
import TableReportActions from '../../../components/TableReportActions.jsx';
import { Alert, Badge, CopyableText, EmptyState, SectionHeader, TableSkeleton } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { formatCurrency, formatDate, formatDateTime } from '../../../utils/calculations.js';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import VoucherFormModal from '../components/VoucherFormModal.jsx';
import VoucherDetailModal from '../components/VoucherDetailModal.jsx';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getActiveTenantId } from '../../../services/api/client.js';
import { transactionKeys } from '../../transactions/queries/transactionQueries.js';
import { useTenantReportQuery } from '../../reports/queries/useTenantReportQuery.js';

const REPORT_ID_BY_TYPE = {
  JOURNAL: 'journal-vouchers-report',
  RECEIPT: 'receipt-vouchers-report',
  PAYMENT: 'payment-vouchers-report',
  CONTRA: 'contra-vouchers-report',
};

const TITLE_BY_TYPE = {
  JOURNAL: 'Journal Vouchers',
  RECEIPT: 'Receipt Vouchers',
  PAYMENT: 'Payment Vouchers',
  CONTRA: 'Contra Vouchers',
};

const DESCRIPTION_BY_TYPE = {
  JOURNAL: 'Manual debit and credit vouchers for adjustments, accruals, and corrections.',
  RECEIPT: 'Cash and bank receipts against customers, income, recoveries, and other inflows.',
  PAYMENT: 'Cash and bank payments against suppliers, expenses, payroll, advances, and loans.',
  CONTRA: 'Transfers between cash and bank accounts without bypassing the journal engine.',
};

const ICON_BY_TYPE = {
  JOURNAL: BookOpen,
  RECEIPT: Receipt,
  PAYMENT: Wallet,
  CONTRA: ArrowLeftRight,
};

const TYPE_PERMISSION_BY_VOUCHER_TYPE = {
  JOURNAL: 'journal.create',
  RECEIPT: 'voucher.receipt',
  PAYMENT: 'voucher.payment',
  CONTRA: 'voucher.contra',
};

function toneForStatus(status) {
  if (status === 'POSTED') return 'emerald';
  if (status === 'APPROVED') return 'blue';
  if (status === 'SUBMITTED') return 'amber';
  if (status === 'REVERSED') return 'rose';
  return 'slate';
}

export default function VoucherWorkbenchPage({ voucherType }) {
  const queryClient = useQueryClient();
  const { can, language, pushToast, confirm } = useInventoryApp();
  const [filters, setFilters] = useState({ voucherNumber: '', status: '', dateFrom: '', dateTo: '' });
  const [formModal, setFormModal] = useState(null);
  const [detailVoucher, setDetailVoucher] = useState(null);
  const reportId = REPORT_ID_BY_TYPE[voucherType];
  const title = TITLE_BY_TYPE[voucherType];
  const description = DESCRIPTION_BY_TYPE[voucherType];
  const Icon = ICON_BY_TYPE[voucherType];
  const typePermission = TYPE_PERMISSION_BY_VOUCHER_TYPE[voucherType];
  const hasTypePermission = can(typePermission);
  const canCreate = hasTypePermission;
  const canEditDraft = voucherType === 'JOURNAL' ? can('journal.edit') : hasTypePermission;
  const canSubmitDraft = canEditDraft;
  const canApprove = can('journal.approve') && (voucherType === 'JOURNAL' || hasTypePermission);
  const canPost = can('journal.post') && (voucherType === 'JOURNAL' || hasTypePermission);
  const canReverse = can('journal.reverse') && (voucherType === 'JOURNAL' || hasTypePermission);
  const lookupsQuery = useTenantReportQuery({
    scope: 'voucher-lookups',
    queryFn: async () => {
      const [coa, retailCustomers, supplierRows, accountRows] = await Promise.all([
        inventoryApi.listChartAccounts(),
        inventoryApi.getActiveRetailCustomers(),
        inventoryApi.getActiveSuppliers(),
        inventoryApi.listFinanceAccounts(),
      ]);
      return {
        accounts: coa.accounts || [],
        customers: retailCustomers.items || retailCustomers.customers || [],
        suppliers: supplierRows.items || [],
        financeAccounts: accountRows.accounts || [],
      };
    },
    staleTime: 60_000,
  });
  const vouchersQuery = useTenantReportQuery({
    scope: 'voucher-list',
    params: { voucherType, ...filters },
    queryFn: () => inventoryApi.listVouchers({ voucherType, ...filters }),
    keepPrevious: true,
  });
  const rows = vouchersQuery.data?.vouchers || [];
  const accounts = lookupsQuery.data?.accounts || [];
  const customers = lookupsQuery.data?.customers || [];
  const suppliers = lookupsQuery.data?.suppliers || [];
  const financeAccounts = lookupsQuery.data?.financeAccounts || [];
  const loading = vouchersQuery.isPending;
  const error = vouchersQuery.error?.message || lookupsQuery.error?.message || '';
  const voucherMutation = useMutation({
    mutationKey: transactionKeys.mutation(getActiveTenantId(), 'voucher-workflow'),
    mutationFn: async ({ action, id, payload, reason }) => {
      if (action === 'create') return inventoryApi.createVoucher(payload);
      if (action === 'update') return inventoryApi.updateVoucher(id, payload);
      if (action === 'delete') return inventoryApi.deleteVoucher(id, reason);
      if (action === 'submit') return inventoryApi.submitVoucher(id);
      if (action === 'approve') return inventoryApi.approveVoucher(id);
      if (action === 'post') return inventoryApi.postVoucher(id);
      if (action === 'reverse') return inventoryApi.reverseVoucher(id, reason);
      throw new Error('Unsupported voucher action.');
    },
  });

  const stats = useMemo(() => ({
    total: rows.length,
    draft: rows.filter((row) => row.status === 'DRAFT').length,
    posted: rows.filter((row) => row.status === 'POSTED').length,
    value: rows.reduce((sum, row) => sum + Number(row.totalDebit || 0), 0),
  }), [rows]);

  async function openDetails(id) {
    try {
      const result = await queryClient.fetchQuery({
        queryKey: transactionKeys.detail(getActiveTenantId(), 'voucher', id),
        queryFn: () => inventoryApi.getVoucher(id),
        staleTime: 30_000,
      });
      setDetailVoucher(result.voucher);
    } catch (loadError) {
      pushToast('error', title, loadError?.message || 'Failed to load voucher details.');
    }
  }

  async function handleSave(payload) {
    try {
      if (formModal?.voucher) {
        await voucherMutation.mutateAsync({ action: 'update', id: formModal.voucher.id, payload });
      } else {
        await voucherMutation.mutateAsync({ action: 'create', payload });
      }
      setFormModal(null);
      await vouchersQuery.refetch();
      pushToast('success', title, formModal?.voucher ? 'Voucher updated.' : 'Voucher created.');
      return { ok: true };
    } catch (saveError) {
      return { error: saveError?.message || 'Request failed.' };
    }
  }

  async function confirmDelete(voucher) {
    const { confirmed, reason } = await confirm({
      title: 'Delete voucher',
      description: `Delete draft voucher ${voucher.voucherNumber}?`,
      confirmLabel: 'Delete',
      tone: 'rose',
      requireReason: true,
      reasonLabel: 'Reason',
      reasonPlaceholder: 'Optional note for the audit trail',
    });
    if (!confirmed) return;
    try {
      await voucherMutation.mutateAsync({ action: 'delete', id: voucher.id, reason });
      await vouchersQuery.refetch();
      pushToast('success', title, 'Voucher deleted.');
    } catch (deleteError) {
      pushToast('error', title, deleteError?.message || 'Failed to delete voucher.');
    }
  }

  async function runAction(voucher, action) {
    try {
      if (action === 'submit') await voucherMutation.mutateAsync({ action, id: voucher.id });
      if (action === 'approve') await voucherMutation.mutateAsync({ action, id: voucher.id });
      if (action === 'post') await voucherMutation.mutateAsync({ action, id: voucher.id });
      if (action === 'reverse') {
        const { confirmed, reason } = await confirm({
          title: 'Reverse voucher',
          description: `Reverse posted voucher ${voucher.voucherNumber}?`,
          confirmLabel: 'Reverse',
          tone: 'amber',
          requireReason: true,
          reasonLabel: 'Reason',
          reasonPlaceholder: 'Reason for reversal',
        });
        if (!confirmed) return;
        await voucherMutation.mutateAsync({ action, id: voucher.id, reason });
      }
      await vouchersQuery.refetch();
      if (detailVoucher?.id === voucher.id) {
        const refreshed = await queryClient.fetchQuery({
          queryKey: transactionKeys.detail(getActiveTenantId(), 'voucher', voucher.id),
          queryFn: () => inventoryApi.getVoucher(voucher.id),
          staleTime: 0,
        });
        setDetailVoucher(refreshed.voucher);
      }
      pushToast('success', title, `Voucher ${action}ed.`);
    } catch (actionError) {
      pushToast('error', title, actionError?.message || `Failed to ${action} voucher.`);
    }
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="Accounting"
        title={title}
        description={description}
        action={canCreate ? <button type="button" className="btn-primary" onClick={() => setFormModal({ voucher: null })}>New Voucher</button> : null}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="surface px-5 py-4"><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Total</div><div className="mt-2 text-2xl font-semibold text-slate-950">{stats.total}</div></div>
        <div className="surface px-5 py-4"><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Draft</div><div className="mt-2 text-2xl font-semibold text-amber-600">{stats.draft}</div></div>
        <div className="surface px-5 py-4"><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Posted</div><div className="mt-2 text-2xl font-semibold text-emerald-600">{stats.posted}</div></div>
        <div className="surface px-5 py-4"><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Value</div><div className="mt-2 text-2xl font-semibold text-slate-950">{formatCurrency(stats.value, language)}</div></div>
      </div>

      <div className="surface overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 no-print">
          <div className="grid flex-1 gap-3 md:grid-cols-4">
            <input className="input" placeholder="Voucher number" value={filters.voucherNumber} onChange={(event) => setFilters((current) => ({ ...current, voucherNumber: event.target.value }))} />
            <select className="input" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
              <option value="">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="APPROVED">Approved</option>
              <option value="POSTED">Posted</option>
              <option value="REVERSED">Reversed</option>
            </select>
            <DatePickerField value={filters.dateFrom} onChange={(value) => setFilters((current) => ({ ...current, dateFrom: value }))} placeholder="Date from" />
            <DatePickerField value={filters.dateTo} onChange={(value) => setFilters((current) => ({ ...current, dateTo: value }))} placeholder="Date to" min={filters.dateFrom || null} />
          </div>
          <TableReportActions targetId={reportId} title={title} fileName={title.toLowerCase().replace(/\s+/g, '-')} entityType="vouchers" t={(key) => key === 'common.print' ? 'Print' : key} />
        </div>

        {error ? <div className="p-5"><Alert type="error">{error}</Alert></div> : null}
        {loading ? (
          <div className="p-5"><TableSkeleton columns={8} /></div>
        ) : rows.length ? (
          <div id={reportId}>
            <div className="divide-y divide-slate-100 md:hidden">
              {rows.map((voucher) => (
                <div key={voucher.id} className="px-4 py-3">
                  <button type="button" onClick={() => openDetails(voucher.id)} className="flex w-full items-center gap-3 text-left">
                    <Icon size={16} className="shrink-0 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-bold text-slate-950">{voucher.voucherNumber}</p>
                        <Badge tone={toneForStatus(voucher.status)}>{voucher.status}</Badge>
                      </div>
                      <p className="mt-0.5 truncate text-xs font-medium text-slate-500">{formatDate(voucher.voucherDate, language)} · {voucher.counterpartyName || voucher.referenceNumber || '-'}</p>
                    </div>
                    <p className="shrink-0 text-sm font-bold tabular-nums text-slate-950">{formatCurrency(voucher.totalDebit, language)}</p>
                  </button>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" className="btn-secondary h-8 px-2.5 text-xs" onClick={() => openDetails(voucher.id)}>View</button>
                    {voucher.status === 'DRAFT' && canEditDraft ? <button type="button" className="btn-secondary h-8 px-2.5 text-xs" onClick={() => setFormModal({ voucher })}>Edit</button> : null}
                    {voucher.status === 'DRAFT' && canEditDraft ? <button type="button" className="btn-secondary h-8 px-2.5 text-xs text-rose-600" onClick={() => confirmDelete(voucher)}>Delete</button> : null}
                    {voucher.status === 'DRAFT' && canSubmitDraft ? <button type="button" className="btn-secondary h-8 px-2.5 text-xs" onClick={() => runAction(voucher, 'submit')}>Submit</button> : null}
                    {voucher.status === 'SUBMITTED' && canApprove ? <button type="button" className="btn-secondary h-8 px-2.5 text-xs" onClick={() => runAction(voucher, 'approve')}>Approve</button> : null}
                    {voucher.status === 'APPROVED' && canPost ? <button type="button" className="btn-secondary h-8 px-2.5 text-xs" onClick={() => runAction(voucher, 'post')}>Post</button> : null}
                    {voucher.status === 'POSTED' && canReverse ? <button type="button" className="btn-secondary h-8 px-2.5 text-xs text-amber-700" onClick={() => runAction(voucher, 'reverse')}>Reverse</button> : null}
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1120px]">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3 text-left">Voucher</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Reference</th>
                  <th className="px-4 py-3 text-left">Counterparty</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((voucher) => (
                  <tr key={voucher.id} className="hover:bg-slate-50">
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <Icon size={14} className="text-slate-400" />
                        <div>
                          <CopyableText value={voucher.voucherNumber} displayValue={voucher.voucherNumber} copyLabel="voucher number" textClassName="font-semibold text-slate-950" />
                          <div className="mt-1 text-xs text-slate-500">{voucher.voucherType}</div>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">{formatDate(voucher.voucherDate, language)}</td>
                    <td className="table-cell text-sm text-slate-600">{voucher.referenceNumber || '-'}</td>
                    <td className="table-cell text-sm text-slate-600">{voucher.counterpartyName || '-'}</td>
                    <td className="table-cell text-right font-semibold text-slate-950">{formatCurrency(voucher.totalDebit, language)}</td>
                    <td className="table-cell"><Badge tone={toneForStatus(voucher.status)}>{voucher.status}</Badge></td>
                    <td className="table-cell text-sm text-slate-500">{formatDateTime(voucher.createdAt, language)}</td>
                    <td className="table-cell">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button type="button" className="btn-secondary" onClick={() => openDetails(voucher.id)}>View</button>
                        {voucher.status === 'DRAFT' && canEditDraft ? <button type="button" className="btn-secondary" onClick={() => setFormModal({ voucher })}>Edit</button> : null}
                        {voucher.status === 'DRAFT' && canEditDraft ? <button type="button" className="btn-secondary text-rose-600" onClick={() => confirmDelete(voucher)}>Delete</button> : null}
                        {voucher.status === 'DRAFT' && canSubmitDraft ? <button type="button" className="btn-secondary" onClick={() => runAction(voucher, 'submit')}>Submit</button> : null}
                        {voucher.status === 'SUBMITTED' && canApprove ? <button type="button" className="btn-secondary" onClick={() => runAction(voucher, 'approve')}>Approve</button> : null}
                        {voucher.status === 'APPROVED' && canPost ? <button type="button" className="btn-secondary" onClick={() => runAction(voucher, 'post')}>Post</button> : null}
                        {voucher.status === 'POSTED' && canReverse ? <button type="button" className="btn-secondary text-amber-700" onClick={() => runAction(voucher, 'reverse')}>Reverse</button> : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        ) : (
          <div className="p-10">
            <EmptyState icon={voucherType === 'RECEIPT' ? Receipt : voucherType === 'PAYMENT' ? HandCoins : voucherType === 'CONTRA' ? ArrowLeftRight : BookOpen} title={`No ${title.toLowerCase()} found`} description="Create the first voucher or widen the filters." />
          </div>
        )}
      </div>

      {formModal ? (
        <VoucherFormModal
          voucherType={voucherType}
          voucher={formModal.voucher}
          accounts={accounts}
          customers={customers}
          suppliers={suppliers}
          financeAccounts={financeAccounts}
          onClose={() => setFormModal(null)}
          onSave={handleSave}
        />
      ) : null}

      {detailVoucher ? <VoucherDetailModal voucher={detailVoucher} onClose={() => setDetailVoucher(null)} onRefresh={() => openDetails(detailVoucher.id)} /> : null}
    </div>
  );
}
