import { useEffect, useState } from 'react';
import { Check, Plus, X, CalendarOff } from 'lucide-react';
import { Alert, EmptyState, MobileCardList, MobileListCard, SectionHeader, Select, TableSkeleton } from '../../../../components/ui.jsx';
import TableReportActions from '../../../../components/TableReportActions.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../../services/inventoryApi.js';
import { useMutation } from '@tanstack/react-query';
import { useTenantApiQuery } from '../../../../queries/useTenantApiQuery.js';
import { transactionKeys } from '../../../transactions/queries/transactionQueries.js';
import { getActiveTenantId } from '../../../../services/api/client.js';

const today = () => new Date().toISOString().slice(0, 10);
const LEAVE_REQUESTS_REPORT_ID = 'leave-requests-report';
const LEAVE_REPORT_SHORTCUTS = {
  pdf: { alt: true, key: 'd', label: 'Alt+D' },
  excel: { alt: true, key: 'e', label: 'Alt+E' },
  csv: { alt: true, key: 'c', label: 'Alt+C' },
  print: { alt: true, key: 'p', label: 'Alt+P' },
};

export default function LeavePage() {
  const { t, can, pushToast } = useInventoryApp();
  const [status, setStatus] = useState('');
  const [typeForm, setTypeForm] = useState({ name: '', code: '', annualDays: 0, paid: true });
  const [requestForm, setRequestForm] = useState({ employeeId: '', leaveTypeId: '', startDate: today(), endDate: today(), reason: '' });
  const canManage = can('leave.manage');
  const canApprove = can('leave.approve');

  const leaveQuery = useTenantApiQuery({
    scope: 'leave-management',
    params: { status },
    queryFn: async () => {
      const [employees, types, requests] = await Promise.all([
        inventoryApi.getActiveEmployees(),
        inventoryApi.listLeaveTypes({ pageSize: 200 }),
        inventoryApi.listLeaveRequests({ status, pageSize: 200 }),
      ]);
      return { employees, types: types.items || [], requests: requests.items || [] };
    },
    keepPrevious: true,
  });
  const actionMutation = useMutation({
    mutationKey: transactionKeys.mutation(getActiveTenantId(), 'leave-action'),
    mutationFn: ({ action, id, payload }) => {
      if (action === 'type') return inventoryApi.createLeaveType(payload);
      if (action === 'apply') return inventoryApi.applyLeave(payload);
      if (action === 'approve') return inventoryApi.approveLeave(id);
      return inventoryApi.rejectLeave(id);
    },
  });
  const employees = Array.isArray(leaveQuery.data?.employees) ? leaveQuery.data.employees : [];
  const types = leaveQuery.data?.types || [];
  const requests = leaveQuery.data?.requests || [];
  const loading = leaveQuery.isPending;
  const error = leaveQuery.error?.message || '';

  async function saveType(event) {
    event.preventDefault();
    try {
      await actionMutation.mutateAsync({ action: 'type', payload: typeForm });
      setTypeForm({ name: '', code: '', annualDays: 0, paid: true });
      pushToast('success', t('leave.title'), t('leave.typeCreated'));
      leaveQuery.refetch();
    } catch (err) {
      pushToast('error', t('leave.title'), err?.message || t('alerts.requestFailed'));
    }
  }

  async function applyLeave(event) {
    event.preventDefault();
    try {
      await actionMutation.mutateAsync({ action: 'apply', payload: requestForm });
      setRequestForm({ employeeId: '', leaveTypeId: '', startDate: today(), endDate: today(), reason: '' });
      pushToast('success', t('leave.title'), t('leave.applyCreated'));
      leaveQuery.refetch();
    } catch (err) {
      pushToast('error', t('leave.title'), err?.message || t('alerts.requestFailed'));
    }
  }

  async function decide(id, approved) {
    try {
      if (approved) await actionMutation.mutateAsync({ action: 'approve', id });
      else await actionMutation.mutateAsync({ action: 'reject', id });
      pushToast('success', t('leave.title'), approved ? t('leave.approvedToast') : t('leave.rejectedToast'));
      leaveQuery.refetch();
    } catch (err) {
      pushToast('error', t('leave.title'), err?.message || t('alerts.requestFailed'));
    }
  }

  return (
    <div>
      <SectionHeader eyebrow={t('leave.eyebrow')} title={t('leave.title')} description={t('leave.description')} />
      {error ? <Alert type="error">{error}</Alert> : null}

      {canManage ? (
        <div className="mb-5 grid gap-4 lg:grid-cols-2">
          <form className="surface p-5" onSubmit={saveType}>
            <h2 className="section-title mb-4">{t('leave.typesTitle')}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="input" placeholder={t('leave.nameLabel')} value={typeForm.name} onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })} />
              <input className="input" placeholder={t('leave.codeLabel')} value={typeForm.code} onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value })} />
              <input className="input" type="number" min="0" placeholder={t('leave.annualDaysLabel')} value={typeForm.annualDays} onChange={(e) => setTypeForm({ ...typeForm, annualDays: e.target.value })} />
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                <input type="checkbox" checked={typeForm.paid} onChange={(e) => setTypeForm({ ...typeForm, paid: e.target.checked })} />
                {t('leave.paidLeaveLabel')}
              </label>
            </div>
            <button type="submit" className="btn-primary mt-4"><Plus size={16} /> {t('leave.addType')}</button>
          </form>

          <form className="surface p-5" onSubmit={applyLeave}>
            <h2 className="section-title mb-4">{t('leave.applyTitle')}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select className="input" value={requestForm.employeeId} onChange={(e) => setRequestForm({ ...requestForm, employeeId: e.target.value })}>
                <option value="">{t('leave.employeeLabel')}</option>
                {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
              </Select>
              <Select className="input" value={requestForm.leaveTypeId} onChange={(e) => setRequestForm({ ...requestForm, leaveTypeId: e.target.value })}>
                <option value="">{t('leave.leaveTypeLabel')}</option>
                {types.filter((type) => type.status === 'ACTIVE').map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
              </Select>
              <input className="input" type="date" value={requestForm.startDate} onChange={(e) => setRequestForm({ ...requestForm, startDate: e.target.value })} />
              <input className="input" type="date" value={requestForm.endDate} onChange={(e) => setRequestForm({ ...requestForm, endDate: e.target.value })} />
              <input className="input sm:col-span-2" placeholder={t('leave.reasonLabel')} value={requestForm.reason} onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })} />
            </div>
            <button type="submit" className="btn-primary mt-4"><Plus size={16} /> {t('leave.apply')}</button>
          </form>
        </div>
      ) : null}

      <div id={LEAVE_REQUESTS_REPORT_ID} className="surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="section-title">{t('leave.requestsTitle')}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <TableReportActions targetId={LEAVE_REQUESTS_REPORT_ID} title={t('leave.requestsTitle')} fileName="leave-requests" entityType="leave_requests" t={t} shortcuts={LEAVE_REPORT_SHORTCUTS} />
            <Select className="input w-full sm:w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">{t('leave.allStatuses')}</option>
              <option value="PENDING">{t('leave.statusPending')}</option>
              <option value="APPROVED">{t('leave.statusApproved')}</option>
              <option value="REJECTED">{t('leave.statusRejected')}</option>
            </Select>
          </div>
        </div>
        {loading ? <div className="p-5"><TableSkeleton columns={7} /></div> : requests.length === 0 ? (
          <div className="p-5"><EmptyState title={t('leave.noRequestsTitle')} description={t('leave.noRequestsDesc')} icon={CalendarOff} /></div>
        ) : (
          <>
          <MobileCardList>
            {requests.map((request) => (
              <MobileListCard
                key={request.id}
                title={request.employeeName}
                badge={<span className="muted-chip">{request.status}</span>}
                subtitle={`${request.leaveTypeName} · ${request.startDate} - ${request.endDate}`}
                value={request.totalDays}
                action={canApprove && request.status === 'PENDING' ? (
                  <>
                    <button type="button" className="icon-btn text-emerald-600" onClick={() => decide(request.id, true)} title={t('leave.approve')}><Check size={16} /></button>
                    <button type="button" className="icon-btn text-rose-600" onClick={() => decide(request.id, false)} title={t('leave.reject')}><X size={16} /></button>
                  </>
                ) : null}
              />
            ))}
          </MobileCardList>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">{t('leave.columnEmployee')}</th>
                  <th className="px-4 py-3">{t('leave.columnType')}</th>
                  <th className="px-4 py-3">{t('leave.columnFrom')}</th>
                  <th className="px-4 py-3">{t('leave.columnTo')}</th>
                  <th className="px-4 py-3">{t('leave.columnDays')}</th>
                  <th className="px-4 py-3">{t('leave.columnStatus')}</th>
                  {canApprove ? <th className="px-4 py-3 text-right no-print">{t('common.actions')}</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td className="table-cell font-semibold">{request.employeeName}</td>
                    <td className="table-cell">{request.leaveTypeName}</td>
                    <td className="table-cell">{request.startDate}</td>
                    <td className="table-cell">{request.endDate}</td>
                    <td className="table-cell">{request.totalDays}</td>
                    <td className="table-cell"><span className="muted-chip">{request.status}</span></td>
                    {canApprove ? (
                      <td className="table-cell no-print">
                        {request.status === 'PENDING' ? (
                          <div className="flex justify-end gap-2">
                            <button type="button" className="icon-btn text-emerald-600" onClick={() => decide(request.id, true)} title={t('leave.approve')}><Check size={16} /></button>
                            <button type="button" className="icon-btn text-rose-600" onClick={() => decide(request.id, false)} title={t('leave.reject')}><X size={16} /></button>
                          </div>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
