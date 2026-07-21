import { useEffect, useState } from 'react';
import { Columns3, GripVertical, List, Pencil, Plus, RotateCcw, Search, ShieldAlert, Trash2, Wrench } from 'lucide-react';
import { Alert, Badge, CopyableText, EmptyState, MobileCardList, MobileListCard, Pagination, SectionHeader, TableSkeleton, Select, cx } from '../../../components/ui.jsx';
import TableReportActions from '../../../components/TableReportActions.jsx';
import { DateRangePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { useTenantApiQuery } from '../../../queries/useTenantApiQuery.js';
import { formatDate, formatDateTime, todayISO } from '../../../utils/calculations.js';
import { repairJobStatusTone, repairJobApprovalTone } from '../../../models/inventoryViewData.js';
import RepairJobFormModal from '../components/RepairJobFormModal';
import WarrantyClaimFormModal from '../../warranty-claims/components/WarrantyClaimFormModal';
import { useRepairJobsViewModel } from '../viewmodels/useRepairJobsViewModel';

const JOB_STATUS_VALUES = ['RECEIVED', 'DIAGNOSING', 'AWAITING_PARTS', 'IN_REPAIR', 'READY', 'DELIVERED', 'CANCELLED'];
const REPAIR_JOBS_REPORT_ID = 'repair-jobs-report';
const REPAIR_JOBS_REPORT_SHORTCUTS = {
  pdf: { alt: true, key: 'd', label: 'Alt+D' },
  excel: { alt: true, key: 'e', label: 'Alt+E' },
  csv: { alt: true, key: 'c', label: 'Alt+C' },
  print: { alt: true, key: 'p', label: 'Alt+P' },
};
const REPAIR_JOBS_ADD_SHORTCUT = { alt: true, key: 'a', label: 'Alt+A' };

function matchesShortcut(event, shortcut) {
  return (
    event.key.toLowerCase() === shortcut.key &&
    Boolean(event.altKey) === Boolean(shortcut.alt) &&
    Boolean(event.shiftKey) === Boolean(shortcut.shift) &&
    Boolean(event.ctrlKey || event.metaKey) === Boolean(shortcut.ctrlOrMeta)
  );
}

function RepairJobsKanban({ items, loading, error, canManage, t, onEdit, onMove }) {
  if (loading) return <div className="p-5"><TableSkeleton columns={4} showHeader={false} /></div>;
  if (error) return <div className="p-5"><Alert type="error">{error}</Alert></div>;

  return (
    <div className="overflow-x-auto bg-slate-50/60 p-4">
      <div className="flex min-w-max items-start gap-4">
        {JOB_STATUS_VALUES.map((status) => {
          const jobs = items.filter((job) => job.status === status);
          return (
            <section
              key={status}
              className="w-[300px] shrink-0 rounded-card border border-slate-200 bg-slate-100/80 p-3"
              onDragOver={(event) => { if (canManage) event.preventDefault(); }}
              onDrop={(event) => {
                if (!canManage) return;
                event.preventDefault();
                const jobId = event.dataTransfer.getData('text/repair-job');
                if (jobId) onMove(jobId, status);
              }}
            >
              <div className="mb-3 flex items-center justify-between gap-2 px-1">
                <h3 className="text-xs font-black uppercase tracking-[0.14em] text-slate-700">{t('repairJobs.statuses.' + status)}</h3>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-black text-slate-500 ring-1 ring-slate-200">{jobs.length}</span>
              </div>
              <div className="space-y-2.5">
                {jobs.map((job) => (
                  <article
                    key={job.id}
                    draggable={canManage}
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/repair-job', String(job.id));
                    }}
                    className={cx('rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition', canManage && 'cursor-grab hover:border-[rgba(var(--brand),0.35)] hover:shadow-card active:cursor-grabbing')}
                  >
                    <button type="button" className="w-full text-left disabled:cursor-default" disabled={!canManage} onClick={() => onEdit(job)}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-black text-slate-950">{job.jobNumber}</p>
                        {canManage ? <GripVertical size={15} className="mt-0.5 shrink-0 text-slate-400" /> : null}
                      </div>
                      <p className="mt-2 truncate text-sm font-bold text-slate-700">{job.customerName || '-'}</p>
                      <p className="mt-1 truncate text-xs font-medium text-slate-500">{job.productName || job.serialNumber || '-'}</p>
                      <p className="mt-2 truncate text-xs font-medium text-slate-500">
                        {formatDate(job.receivedDate)} · {job.technicianName || t('repairJobs.noTechnician')}
                      </p>
                    </button>
                    {canManage ? (
                      <select className="input mt-3 h-9 py-1 text-xs font-bold" value={job.status} aria-label={t('repairJobs.changeStatus')} onChange={(event) => onMove(String(job.id), event.target.value)}>
                        {JOB_STATUS_VALUES.map((value) => <option key={value} value={value}>{t('repairJobs.statuses.' + value)}</option>)}
                      </select>
                    ) : null}
                  </article>
                ))}
                {!jobs.length ? <div className="rounded-xl border border-dashed border-slate-300 px-3 py-8 text-center text-xs font-bold text-slate-400">{t('repairJobs.dropHere')}</div> : null}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
export default function RepairJobsPage() {
  const { saveRepairJob, deleteRepairJob, saveWarrantyClaim, t, can } = useInventoryApp();
  const vm = useRepairJobsViewModel();
  const [viewMode, setViewMode] = useState('table');
  const [formModal, setFormModal] = useState(null);
  const [escalateModal, setEscalateModal] = useState(null);
  const [boardJobs, setBoardJobs] = useState([]);
  const [boardVersion, setBoardVersion] = useState(0);
  const canManage = can('manage_repair_jobs');
  const hasFilters = Boolean(vm.search || vm.status || vm.technicianId || vm.dateFrom || vm.dateTo);

  const techniciansQuery = useTenantApiQuery({
    scope: 'repair-technicians',
    queryFn: () => inventoryApi.listUsers(),
    staleTime: 30_000,
  });
const boardQuery = useTenantApiQuery({
    scope: 'repair-jobs-board',
    params: { boardVersion, search: vm.search, technicianId: vm.technicianId, dateFrom: vm.dateFrom, dateTo: vm.dateTo },
    queryFn: () => inventoryApi.listRepairJobs({
      page: 1,
      pageSize: 10000,
      search: vm.search || undefined,
      technicianId: vm.technicianId || undefined,
      dateFrom: vm.dateFrom || undefined,
      dateTo: vm.dateTo || undefined,
    }),
    enabled: viewMode === 'board',
  });
  const techniciansResult = techniciansQuery.data;
  const technicians = Array.isArray(techniciansResult)
    ? techniciansResult
    : (techniciansResult?.users || techniciansResult?.items || []);
  const boardLoading = boardQuery.isLoading || boardQuery.isFetching;

  useEffect(() => {
    if (boardQuery.data) setBoardJobs(boardQuery.data.items || []);
  }, [boardQuery.data]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (matchesShortcut(event, REPAIR_JOBS_ADD_SHORTCUT) && canManage && !formModal && !escalateModal) {
        event.preventDefault();
        setFormModal({ mode: 'add' });
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [canManage, formModal, escalateModal]);

  async function handleSave(value) {
    const result = await saveRepairJob(value);
    if (result.ok) {
      setFormModal(null);
      vm.reload();
      setBoardVersion((v) => v + 1);
    }
    return result;
  }

  async function handleDelete(job) {
    const result = await deleteRepairJob(job);
    if (result.ok) {
      vm.reload();
      setBoardVersion((v) => v + 1);
    }
  }

  async function handleStatusChange(job, newStatus) {
    if (job.status === newStatus) return;
    const previousStatus = job.status;
    setBoardJobs((prev) => prev.map((j) => j.id === job.id ? { ...j, status: newStatus } : j));
    const result = await saveRepairJob({
      id: job.id,
      status: newStatus,
      approvalStatus: job.approvalStatus,
      technicianId: job.technicianId || null,
      laborCost: job.laborCost || 0,
      actualCost: job.actualCost || 0,
      partsUsed: job.partsUsed || '',
      promisedDate: job.promisedDate || null,
      deliveredDate: job.deliveredDate || null,
      resolutionNote: job.resolutionNote || '',
    });
    if (!result.ok) {
      setBoardJobs((prev) => prev.map((item) => item.id === job.id ? { ...item, status: previousStatus } : item));
      return;
    }
    vm.reload();
  }


  return (
    <div>
      <SectionHeader
        title={t('repairJobs.title')}
        compact
        action={(
          <>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
              <button type="button" className={viewMode === 'table' ? 'inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-black text-indigo-800 shadow-sm' : 'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold text-slate-500'} onClick={() => setViewMode('table')}>
                <List size={15} />{t('repairJobs.tableView')}
              </button>
              <button type="button" className={viewMode === 'board' ? 'inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-black text-indigo-800 shadow-sm' : 'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold text-slate-500'} onClick={() => { vm.setStatus(''); setViewMode('board'); }}>
                <Columns3 size={15} />{t('repairJobs.boardView')}
              </button>
            </div>
            {canManage ? (
              <button type="button" className="btn-primary" onClick={() => setFormModal({ mode: 'add' })}>
                <Plus size={18} />
                {t('repairJobs.add')}
                <kbd className="ml-1 rounded border border-indigo-400/40 bg-indigo-500/20 px-1 py-0.5 font-mono text-[10px] text-indigo-200">Alt+A</kbd>
              </button>
            ) : null}
          </>
        )}
      />

      {viewMode === 'table' ? (
        <section className="surface no-print mb-6 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--secondary-soft)] text-[var(--secondary)]"><Wrench size={20} /></span>
              <div><h2 className="section-title">{t('repairJobs.workflowTitle')}</h2></div>
            </div>
            <span className="muted-chip">{vm.total} {t('repairJobs.jobCount')}</span>
          </div>
          <div className="flex gap-2 overflow-x-auto p-3">
            <button type="button" className={vm.status ? 'min-h-10 shrink-0 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:border-[rgba(var(--brand),0.35)] hover:text-[var(--secondary)]' : 'min-h-10 shrink-0 rounded-full border border-[rgba(var(--brand),0.38)] bg-[var(--secondary-soft)] px-4 text-sm font-black text-[var(--text-strong)] ring-2 ring-[rgba(var(--brand),0.12)]'} onClick={() => vm.setStatus('')}>
              {t('repairJobs.allStatuses')}
            </button>
            {JOB_STATUS_VALUES.map((status) => (
              <button key={status} type="button" className={vm.status === status ? 'min-h-10 shrink-0 rounded-full border border-[rgba(var(--brand),0.38)] bg-[var(--secondary-soft)] px-4 text-sm font-black text-[var(--text-strong)] ring-2 ring-[rgba(var(--brand),0.12)]' : 'min-h-10 shrink-0 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:border-[rgba(var(--brand),0.35)] hover:text-[var(--secondary)]'} onClick={() => vm.setStatus(status)}>
                {t('repairJobs.statuses.' + status)}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <div id={REPAIR_JOBS_REPORT_ID} className="surface overflow-hidden print-target">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div><h2 className="section-title">{t(viewMode === 'board' ? 'repairJobs.boardTitle' : 'repairJobs.registerTitle')}</h2></div>
          <span className="muted-chip">{viewMode === 'board' ? boardJobs.length : vm.total} {t('common.records')}</span>
        </div>
        <div className="no-print flex flex-col gap-3 border-b border-slate-100 bg-slate-50/60 p-4 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full flex-1 sm:min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input className="input pl-10" value={vm.search} onChange={(event) => vm.setSearch(event.target.value)} placeholder={t('repairJobs.searchPlaceholder')} />
          </div>
          <Select className="input w-full sm:w-44" value={vm.technicianId} onChange={(event) => vm.setTechnicianId(event.target.value)}>
            <option value="">{t('repairJobs.allTechnicians')}</option>
            {technicians.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
          </Select>
          <DateRangePickerField from={vm.dateFrom} to={vm.dateTo} max={todayISO()} onChange={(from, to) => { vm.setDateFrom(from); vm.setDateTo(to); }} placeholder={t('purchaseReceive.dateFrom') + ' - ' + t('purchaseReceive.dateTo')} className="w-full min-w-[260px] sm:w-auto" />
          <button type="button" className="btn-secondary h-10 gap-1.5 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-50" disabled={!hasFilters} onClick={vm.resetFilters}>
            <RotateCcw size={14} />{t('repairJobs.resetFilters')}
          </button>
          <div className="sm:ml-auto">
            <TableReportActions targetId={REPAIR_JOBS_REPORT_ID} title={t('repairJobs.title')} fileName="repair-jobs" entityType="repair_jobs" t={t} shortcuts={REPAIR_JOBS_REPORT_SHORTCUTS} />
          </div>
        </div>

        {viewMode === 'board' ? (
          <RepairJobsKanban
            items={boardJobs}
            loading={boardLoading}
            error={boardQuery.error?.message}
            canManage={canManage}
            t={t}
            onEdit={(job) => setFormModal({ mode: 'edit', job })}
            onMove={(jobId, status) => {
              const job = boardJobs.find((item) => String(item.id) === String(jobId));
              if (job) handleStatusChange(job, status);
            }}
          />
        ) : vm.loading ? (
          <div className="p-5"><TableSkeleton columns={7} showHeader={false} /></div>
        ) : vm.error ? (
          <div className="p-5"><Alert type="error">{vm.error}</Alert></div>
        ) : (
          <>
            <MobileCardList>
              {vm.items.map((job) => (
                <MobileListCard
                  key={job.id}
                  onClick={canManage ? () => setFormModal({ mode: 'edit', job }) : undefined}
                  title={job.jobNumber}
                  badge={<Badge tone={repairJobStatusTone(job.status)}>{t('repairJobs.statuses.' + job.status)}</Badge>}
                  subtitle={(job.customerName || '-') + ' · ' + formatDateTime(job.receivedDate)}
                  value={job.technicianName || '-'}
                  valueSub={t('repairJobs.approvalStatuses.' + job.approvalStatus)}
                  action={canManage ? (
                    <>
                      <button type="button" className="icon-btn text-amber-600 hover:text-amber-700" title={t('warrantyClaims.escalateFromRepairJob')} onClick={() => setEscalateModal({ jobId: job.id, jobNumber: job.jobNumber, productId: job.productId })}><ShieldAlert size={16} /></button>
                      <button type="button" className="icon-btn" title={t('common.edit')} onClick={() => setFormModal({ mode: 'edit', job })}><Pencil size={16} /></button>
                      <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" title={t('common.delete')} onClick={() => handleDelete(job)}><Trash2 size={16} /></button>
                    </>
                  ) : null}
                />
              ))}
            </MobileCardList>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-3">{t('repairJobs.jobNumberLabel')}</th>
                    <th className="px-4 py-3">{t('repairJobs.customerLabel')}</th>
                    <th className="px-4 py-3">{t('repairJobs.serialLabel')}</th>
                    <th className="px-4 py-3">{t('repairJobs.statusLabel')}</th>
                    <th className="px-4 py-3">{t('repairJobs.approvalStatusLabel')}</th>
                    <th className="px-4 py-3">{t('repairJobs.technicianLabel')}</th>
                    <th className="px-4 py-3">{t('repairJobs.receivedDateLabel')}</th>
                    <th className="px-4 py-3 text-right no-print">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vm.items.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-50">
                      <td className="table-cell"><CopyableText value={job.jobNumber} copyLabel={t('repairJobs.jobNumberLabel')} displayValue={job.jobNumber} textClassName="font-semibold text-slate-950" /></td>
                      <td className="table-cell"><div className="font-medium text-slate-900">{job.customerName || '-'}</div>{job.customerPhone ? <div className="text-xs text-slate-500">{job.customerPhone}</div> : null}</td>
                      <td className="table-cell"><CopyableText value={job.serialNumber} copyLabel={t('repairJobs.serialLabel')} displayValue={job.serialNumber} /></td>
                      <td className="table-cell"><Badge tone={repairJobStatusTone(job.status)}>{t('repairJobs.statuses.' + job.status)}</Badge></td>
                      <td className="table-cell"><Badge tone={repairJobApprovalTone(job.approvalStatus)}>{t('repairJobs.approvalStatuses.' + job.approvalStatus)}</Badge></td>
                      <td className="table-cell">{job.technicianName || '-'}</td>
                      <td className="table-cell">{formatDateTime(job.receivedDate)}</td>
                      <td className="table-cell no-print">
                        <div className="row-actions flex justify-end gap-2">
                          {canManage ? (
                            <>
                              <button type="button" className="icon-btn text-amber-600 hover:text-amber-700" title={t('warrantyClaims.escalateFromRepairJob')} onClick={() => setEscalateModal({ jobId: job.id, jobNumber: job.jobNumber, productId: job.productId })}><ShieldAlert size={16} /></button>
                              <button type="button" className="icon-btn" title={t('common.edit')} onClick={() => setFormModal({ mode: 'edit', job })}><Pencil size={16} /></button>
                              <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" title={t('common.delete')} onClick={() => handleDelete(job)}><Trash2 size={16} /></button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {viewMode === 'table' && !vm.loading && !vm.error && !vm.items.length ? (
          <div className="p-5"><EmptyState title={t('repairJobs.noMatchTitle')} description={t('repairJobs.noMatchDescription')} icon={Wrench} /></div>
        ) : null}
        {viewMode === 'table' && !vm.loading && !vm.error && vm.items.length ? (
          <div className="border-t border-slate-100 px-5 py-4 no-print"><Pagination page={vm.page} totalPages={vm.totalPages} onPageChange={vm.setPage} /></div>
        ) : null}
      </div>
      {formModal ? (
        <RepairJobFormModal
          job={formModal.job}
          onClose={() => setFormModal(null)}
          onSave={handleSave}
        />
      ) : null}

      {escalateModal ? (
        <WarrantyClaimFormModal
          claim={null}
          prefillRepairJobId={escalateModal.jobId}
          prefillRepairJobNumber={escalateModal.jobNumber}
          onClose={() => setEscalateModal(null)}
          onSave={async (value) => {
            const result = await saveWarrantyClaim(value);
            if (result.ok) setEscalateModal(null);
            return result;
          }}
        />
      ) : null}
    </div>
  );
}


