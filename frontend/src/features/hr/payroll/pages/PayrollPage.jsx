import { useState } from 'react';
import { CheckCircle, CreditCard, Eye, Plus, Trash2 } from 'lucide-react';
import { Alert, EmptyState, Modal, Pagination, SectionHeader, TableSkeleton } from '../../../../components/ui.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../../services/inventoryApi.js';
import { formatCurrency } from '../../../../utils/calculations.js';
import { usePayrollViewModel } from '../viewmodels/usePayrollViewModel.js';
import PayrollDetailModal from '../components/PayrollDetailModal.jsx';
import GeneratePayrollModal from '../components/GeneratePayrollModal.jsx';
import PayPayrollModal from '../components/PayPayrollModal.jsx';

const STATUS_COLORS = {
  DRAFT: 'text-slate-500',
  APPROVED: 'text-amber-600',
  PAID: 'text-emerald-700',
};

export default function PayrollPage() {
  const { t, can, language, confirm } = useInventoryApp();
  const vm = usePayrollViewModel();
  const [generateModal, setGenerateModal] = useState(false);
  const [detailModal, setDetailModal] = useState(null);
  const [payModal, setPayModal] = useState(null);
  const canManage = can('manage_payroll');

  async function handleApprove(payroll) {
    const { confirmed } = await confirm({
      title: t('payroll.approveTitle'),
      description: t('payroll.approveConfirm'),
      confirmLabel: t('payroll.approve'),
    });
    if (!confirmed) return;
    try {
      await inventoryApi.approvePayroll(payroll.id);
      vm.reload();
    } catch (err) { alert(err.message); }
  }

  async function handleDelete(payroll) {
    const { confirmed } = await confirm({
      title: t('payroll.deleteTitle'),
      description: t('payroll.deleteConfirm'),
      confirmLabel: t('common.delete'),
      tone: 'rose',
    });
    if (!confirmed) return;
    try {
      await inventoryApi.deletePayroll(payroll.id);
      vm.reload();
    } catch (err) { alert(err.message); }
  }

  return (
    <div>
      <SectionHeader
        eyebrow={t('payroll.eyebrow')}
        title={t('payroll.title')}
        description={t('payroll.description')}
        action={canManage ? (
          <button type="button" className="btn-primary" onClick={() => setGenerateModal(true)}>
            <Plus size={18} />
            {t('payroll.generate')}
          </button>
        ) : null}
      />

      <div className="surface overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">{t('payroll.eyebrow')}</p>
        </div>

        {vm.loading ? (
          <div className="p-5"><TableSkeleton columns={5} /></div>
        ) : vm.error ? (
          <div className="p-5"><Alert type="error">{vm.error}</Alert></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">{t('payroll.number')}</th>
                  <th className="px-4 py-3">{t('payroll.month')}</th>
                  <th className="px-4 py-3">{t('payroll.status')}</th>
                  <th className="px-4 py-3 text-right">{t('payroll.totalNetPay')}</th>
                  <th className="px-4 py-3 text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vm.items.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="table-cell font-black text-slate-400">{(vm.page - 1) * vm.pageSize + idx + 1}</td>
                    <td className="table-cell font-mono text-xs">{p.payrollNumber}</td>
                    <td className="table-cell font-semibold text-slate-950">{p.month}</td>
                    <td className="table-cell">
                      <span className={`muted-chip font-bold ${STATUS_COLORS[p.status] || ''}`}>{p.status}</span>
                    </td>
                    <td className="table-cell text-right font-bold text-emerald-700">
                      {formatCurrency(p.totalNetPay, language)}
                    </td>
                    <td className="table-cell">
                      <div className="flex justify-end gap-1.5">
                        <button type="button" className="icon-btn" title={t('common.view')}
                          onClick={() => setDetailModal(p)}>
                          <Eye size={16} />
                        </button>
                        {canManage && p.status === 'DRAFT' ? (
                          <button type="button" className="icon-btn text-amber-600" title={t('payroll.approve')}
                            onClick={() => handleApprove(p)}>
                            <CheckCircle size={16} />
                          </button>
                        ) : null}
                        {canManage && p.status === 'APPROVED' ? (
                          <button type="button" className="icon-btn text-emerald-700" title={t('payroll.pay')}
                            onClick={() => setPayModal(p)}>
                            <CreditCard size={16} />
                          </button>
                        ) : null}
                        {canManage && p.status !== 'PAID' ? (
                          <button type="button" className="icon-btn text-rose-600" title={t('common.delete')}
                            onClick={() => handleDelete(p)}>
                            <Trash2 size={16} />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!vm.loading && !vm.error && !vm.items.length ? (
          <div className="p-5">
            <EmptyState title={t('payroll.noPayrolls')} description={t('payroll.noPayrollsDesc')} icon={CreditCard} />
          </div>
        ) : null}

        {!vm.loading && !vm.error && vm.items.length > 0 ? (
          <div className="border-t border-slate-100 px-5 py-4">
            <Pagination page={vm.page} totalPages={vm.totalPages} onPageChange={vm.setPage} />
          </div>
        ) : null}
      </div>

      {generateModal ? (
        <GeneratePayrollModal
          onClose={() => setGenerateModal(false)}
          onGenerated={() => { setGenerateModal(false); vm.reload(); }}
        />
      ) : null}

      {detailModal ? (
        <PayrollDetailModal
          payrollSummary={detailModal}
          onClose={() => setDetailModal(null)}
          onChanged={vm.reload}
          canManage={canManage}
        />
      ) : null}

      {payModal ? (
        <PayPayrollModal
          payroll={payModal}
          onClose={() => setPayModal(null)}
          onPaid={() => { setPayModal(null); vm.reload(); }}
        />
      ) : null}
    </div>
  );
}
