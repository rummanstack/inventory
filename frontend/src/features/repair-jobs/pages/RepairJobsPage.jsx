import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, LayoutGrid, Package, Pencil, Plus, Search, ShieldAlert, Table2, Trash2, Wrench } from 'lucide-react';
import { Alert, Badge, CopyableText, EmptyState, Pagination, SectionHeader, TableSkeleton, Select } from '../../../components/ui.jsx';
import TableReportActions from '../../../components/TableReportActions.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { formatCurrency, formatDate, formatDateTime } from '../../../utils/calculations.js';
import { repairJobStatusTone, repairJobApprovalTone } from '../../../models/inventoryViewData.js';
import RepairJobFormModal from '../components/RepairJobFormModal';
import WarrantyClaimFormModal from '../../warranty-claims/components/WarrantyClaimFormModal';
import { useRepairJobsViewModel } from '../viewmodels/useRepairJobsViewModel';

const JOB_STATUS_VALUES = ['RECEIVED', 'DIAGNOSING', 'AWAITING_PARTS', 'IN_REPAIR', 'READY', 'DELIVERED', 'CANCELLED'];
const REPAIR_JOBS_REPORT_ID = 'repair-jobs-report';

const BOARD_COLUMNS = [
  { status: 'RECEIVED',       icon: Package,      accent: '#94a3b8', bg: 'bg-slate-50/80',   border: 'border-slate-200'  },
  { status: 'DIAGNOSING',     icon: Search,       accent: '#60a5fa', bg: 'bg-blue-50/60',    border: 'border-blue-200'   },
  { status: 'AWAITING_PARTS', icon: Clock,        accent: '#fbbf24', bg: 'bg-amber-50/60',   border: 'border-amber-200'  },
  { status: 'IN_REPAIR',      icon: Wrench,       accent: '#a78bfa', bg: 'bg-violet-50/60',  border: 'border-violet-200' },
  { status: 'READY',          icon: CheckCircle2, accent: '#34d399', bg: 'bg-emerald-50/60', border: 'border-emerald-200'},
];

const APPROVAL_DOT = {
  PENDING:  'bg-amber-400',
  APPROVED: 'bg-emerald-500',
  DECLINED: 'bg-rose-500',
};

function initials(name) {
  if (!name) return '';
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

function isOverdue(job) {
  if (!job.promisedDate || job.status === 'DELIVERED' || job.status === 'CANCELLED') return false;
  return job.promisedDate < new Date().toISOString().slice(0, 10);
}

function JobCard({ job, canManage, accent, t, onEdit, onDelete, onEscalate, onDragStart, isDragging }) {
  const overdue = isOverdue(job);
  const tech = initials(job.technicianName);

  return (
    <div
      draggable={canManage}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', job.id);
        onDragStart(job.id);
      }}
      className={`group relative overflow-hidden rounded-2xl bg-white transition-all duration-200
        ${canManage ? 'cursor-grab active:cursor-grabbing' : ''}
        ${isDragging
          ? 'opacity-40 scale-95 shadow-none'
          : 'shadow-[0_1px_4px_rgba(0,0,0,0.07),0_0_0_1px_rgba(0,0,0,0.04)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.10),0_0_0_1px_rgba(0,0,0,0.05)] hover:-translate-y-0.5'}`}
    >
      {/* Left accent bar */}
      <div className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: accent }} />

      {/* Action tray */}
      {canManage ? (
        <div className="absolute right-2 top-2 z-10 flex items-center gap-0.5 rounded-lg border border-slate-100 bg-white p-0.5 shadow-sm">
          <button
            type="button"
            title={t('warrantyClaims.escalateFromRepairJob')}
            onClick={(e) => { e.stopPropagation(); onEscalate(job); }}
            className="flex h-6 w-6 items-center justify-center rounded-md text-amber-500 transition hover:bg-amber-50"
          >
            <ShieldAlert size={12} />
          </button>
          <button
            type="button"
            title={t('common.edit')}
            onClick={(e) => { e.stopPropagation(); onEdit(job); }}
            className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <Pencil size={12} />
          </button>
          <button
            type="button"
            title={t('common.delete')}
            onClick={(e) => { e.stopPropagation(); onDelete(job); }}
            className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ) : null}

      <div className="pl-4 pr-3 pt-3 pb-3 space-y-2.5">
        {/* Row 1: job number + approval dot */}
        <div className="flex items-center justify-between gap-2">
          <CopyableText
            value={job.jobNumber}
            copyLabel={t('repairJobs.jobNumberLabel')}
            displayValue={job.jobNumber}
            className="max-w-full"
            textClassName="text-[10px] font-semibold tracking-widest text-slate-400 uppercase"
            buttonClassName="h-5 w-5"
          />
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${APPROVAL_DOT[job.approvalStatus] || 'bg-slate-300'}`}
            title={t(`repairJobs.approvalStatuses.${job.approvalStatus}`)}
          />
        </div>

        {/* Row 2: customer name (main content) */}
        <div>
          <button
            type="button"
            onClick={() => onEdit(job)}
            className="text-[13px] font-bold leading-snug text-slate-900 hover:text-indigo-700 text-left w-full transition-colors"
          >
            {job.customerName || '—'}
          </button>
          {job.customerPhone ? (
            <p className="mt-0.5 text-[11px] text-slate-400">{job.customerPhone}</p>
          ) : null}
        </div>

        {/* Row 3: device chip */}
        {(job.productName || job.serialNumber) ? (
          <div className="rounded-lg bg-slate-50 px-2.5 py-1.5">
            {job.productName ? (
              <p className="text-[11px] font-semibold text-slate-600 leading-tight">{job.productName}</p>
            ) : null}
            {job.serialNumber ? (
              <p className="mt-0.5 text-[10px] font-mono text-slate-400 leading-tight">{job.serialNumber}</p>
            ) : null}
          </div>
        ) : null}

        {/* Row 4: footer metadata */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            {job.promisedDate ? (
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold
                ${overdue ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
                {overdue ? <AlertTriangle size={9} /> : <Clock size={9} />}
                {formatDate(job.promisedDate)}
              </span>
            ) : (
              <span className="text-[10px] text-slate-300">{t('repairJobs.noDeadline')}</span>
            )}
            {job.estimatedCost > 0 ? (
              <span className="text-[10px] font-semibold text-slate-400">{formatCurrency(job.estimatedCost)}</span>
            ) : null}
          </div>

          {tech ? (
            <div
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold"
              style={{ backgroundColor: `${accent}22`, color: accent }}
              title={job.technicianName}
            >
              {tech}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function RepairJobsPage() {
  const { saveRepairJob, deleteRepairJob, saveWarrantyClaim, t, can } = useInventoryApp();
  const vm = useRepairJobsViewModel();
  const [viewMode, setViewMode] = useState('board');
  const [formModal, setFormModal] = useState(null);
  const [escalateModal, setEscalateModal] = useState(null);
  const [technicians, setTechnicians] = useState([]);
  const [boardJobs, setBoardJobs] = useState([]);
  const [boardLoading, setBoardLoading] = useState(false);
  const [boardVersion, setBoardVersion] = useState(0);
  const [dragJobId, setDragJobId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const dragCounters = useRef({});
  const canManage = can('manage_repair_jobs');

  useEffect(() => {
    inventoryApi.listUsers().then((result) => {
      setTechnicians(Array.isArray(result) ? result : (result?.items || []));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (viewMode !== 'board') return;
    setBoardLoading(true);
    inventoryApi.listRepairJobs({ page: 1, pageSize: 500 })
      .then((result) => setBoardJobs(result.items || []))
      .catch(() => {})
      .finally(() => setBoardLoading(false));
  }, [viewMode, boardVersion]);

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
    setBoardJobs((prev) => prev.map((j) => j.id === job.id ? { ...j, status: newStatus } : j));
    await saveRepairJob({
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
    vm.reload();
  }

  const boardByStatus = BOARD_COLUMNS.reduce((acc, col) => {
    acc[col.status] = boardJobs.filter((j) => j.status === col.status);
    return acc;
  }, {});
  const deliveredCount = boardJobs.filter((j) => j.status === 'DELIVERED').length;
  const cancelledCount = boardJobs.filter((j) => j.status === 'CANCELLED').length;

  return (
    <div>
      <SectionHeader
        eyebrow={t('repairJobs.eyebrow')}
        title={t('repairJobs.title')}
        description={t('repairJobs.description')}
        action={
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('board')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${viewMode === 'board' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <LayoutGrid size={14} /> Board
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${viewMode === 'table' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Table2 size={14} /> Table
              </button>
            </div>
            {canManage ? (
              <button type="button" className="btn-primary" onClick={() => setFormModal({ mode: 'add' })}>
                <Plus size={18} />
                {t('repairJobs.add')}
              </button>
            ) : null}
          </div>
        }
      />

      {/* ── BOARD VIEW ── */}
      {viewMode === 'board' ? (
        <div className="mt-4">
          {boardLoading ? (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
              {BOARD_COLUMNS.map((col) => (
                <div key={col.status} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-4 h-4 w-20 animate-pulse rounded-full bg-slate-200" />
                  <div className="space-y-2.5">
                    {[1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200" />)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {BOARD_COLUMNS.map((col) => {
                  const jobs = boardByStatus[col.status] || [];
                  const ColIcon = col.icon;
                  const isOver = dragOverCol === col.status;
                  const draggedJob = dragJobId ? boardJobs.find((j) => j.id === dragJobId) : null;
                  const sameCol = draggedJob?.status === col.status;

                  return (
                    <div
                      key={col.status}
                      className={`flex flex-col rounded-2xl border p-3 min-h-[240px] transition-all duration-200
                        ${isOver && !sameCol
                          ? 'border-indigo-300 bg-indigo-50/60 scale-[1.01]'
                          : `${col.border} ${col.bg}`}`}
                      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        dragCounters.current[col.status] = (dragCounters.current[col.status] || 0) + 1;
                        setDragOverCol(col.status);
                      }}
                      onDragLeave={() => {
                        dragCounters.current[col.status] = (dragCounters.current[col.status] || 1) - 1;
                        if (dragCounters.current[col.status] <= 0) {
                          setDragOverCol((prev) => prev === col.status ? null : prev);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const jobId = e.dataTransfer.getData('text/plain');
                        const job = boardJobs.find((j) => j.id === jobId);
                        if (job && job.status !== col.status) handleStatusChange(job, col.status);
                        setDragJobId(null);
                        setDragOverCol(null);
                        dragCounters.current = {};
                      }}
                    >
                      {/* Column header */}
                      <div className="mb-3 flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <ColIcon size={13} style={{ color: col.accent }} />
                          <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-600">
                            {t(`repairJobs.statuses.${col.status}`)}
                          </span>
                        </div>
                        <span
                          className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold text-white"
                          style={{ backgroundColor: col.accent }}
                        >
                          {jobs.length}
                        </span>
                      </div>

                      {/* Cards */}
                      <div className={`flex flex-col gap-2 flex-1 rounded-xl transition-all ${isOver && !sameCol ? 'ring-2 ring-dashed ring-indigo-300/70 p-1' : ''}`}>
                        {jobs.length === 0 ? (
                          <div className="flex flex-1 items-center justify-center py-6">
                            <p className={`text-[11px] font-medium ${isOver && !sameCol ? 'text-indigo-400' : 'text-slate-300'}`}>
                              {isOver && !sameCol ? '↓ Drop here' : t('repairJobs.emptyColumn')}
                            </p>
                          </div>
                        ) : (
                          jobs.map((job) => (
                            <JobCard
                              key={job.id}
                              job={job}
                              canManage={canManage}
                              accent={col.accent}
                              t={t}
                              isDragging={dragJobId === job.id}
                              onDragStart={setDragJobId}
                              onEdit={(j) => setFormModal({ mode: 'edit', job: j })}
                              onDelete={handleDelete}
                              onEscalate={(j) => setEscalateModal({ jobId: j.id, jobNumber: j.jobNumber, productId: j.productId })}
                            />
                          ))
                        )}
                        {isOver && !sameCol && jobs.length > 0 ? (
                          <div className="mx-1 h-1 rounded-full bg-indigo-300/50" />
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              {(deliveredCount > 0 || cancelledCount > 0) ? (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {deliveredCount > 0 ? (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2">
                      <CheckCircle2 size={13} className="text-emerald-600" />
                      <span className="text-xs font-bold text-emerald-700">{deliveredCount} Delivered</span>
                    </div>
                  ) : null}
                  {cancelledCount > 0 ? (
                    <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2">
                      <span className="text-xs font-bold text-rose-700">{cancelledCount} Cancelled</span>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    className="text-xs font-semibold text-indigo-600 hover:underline"
                    onClick={() => setViewMode('table')}
                  >
                    View full history →
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {/* ── TABLE VIEW ── */}
      {viewMode === 'table' ? (
        <div id={REPAIR_JOBS_REPORT_ID} className="surface mt-4 overflow-hidden">
          <div className="border-b border-slate-100 p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 no-print">
              <span className="text-sm font-bold text-slate-700">{t('repairJobs.title')}</span>
              <TableReportActions targetId={REPAIR_JOBS_REPORT_ID} title={t('repairJobs.title')} fileName="repair-jobs" entityType="repair_jobs" t={t} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  className="input pl-10"
                  value={vm.search}
                  onChange={(e) => vm.setSearch(e.target.value)}
                  placeholder={t('repairJobs.searchPlaceholder')}
                />
              </div>
              <Select className="input" value={vm.status} onChange={(e) => vm.setStatus(e.target.value)}>
                <option value="">{t('repairJobs.allStatuses')}</option>
                {JOB_STATUS_VALUES.map((s) => (
                  <option key={s} value={s}>{t(`repairJobs.statuses.${s}`)}</option>
                ))}
              </Select>
              <Select className="input" value={vm.technicianId} onChange={(e) => vm.setTechnicianId(e.target.value)}>
                <option value="">{t('repairJobs.allTechnicians')}</option>
                {technicians.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </Select>
              <div className="grid grid-cols-2 gap-2 lg:col-span-2">
                <DatePickerField value={vm.dateFrom} onChange={vm.setDateFrom} />
                <DatePickerField value={vm.dateTo} onChange={vm.setDateTo} min={vm.dateFrom} />
              </div>
            </div>
          </div>

          {vm.loading ? (
            <div className="p-5"><TableSkeleton columns={7} showHeader={false} /></div>
          ) : vm.error ? (
            <div className="p-5"><Alert type="error">{vm.error}</Alert></div>
          ) : vm.items.length === 0 ? (
            <div className="p-5"><EmptyState title={t('repairJobs.noMatchTitle')} description={t('repairJobs.noMatchDescription')} icon={Wrench} /></div>
          ) : (
            <>
              <div className="overflow-x-auto">
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
                        <td className="table-cell no-print">
                          <div className="font-medium text-slate-900">{job.customerName || '-'}</div>
                          {job.customerPhone ? <div className="text-xs text-slate-500">{job.customerPhone}</div> : null}
                        </td>
                        <td className="hidden table-cell sm:table-cell"><CopyableText value={job.serialNumber} copyLabel={t('repairJobs.serialLabel')} displayValue={job.serialNumber} /></td>
                        <td className="table-cell">
                          <Badge tone={repairJobStatusTone(job.status)}>{t(`repairJobs.statuses.${job.status}`)}</Badge>
                        </td>
                        <td className="hidden table-cell md:table-cell">
                          <Badge tone={repairJobApprovalTone(job.approvalStatus)}>{t(`repairJobs.approvalStatuses.${job.approvalStatus}`)}</Badge>
                        </td>
                        <td className="hidden table-cell lg:table-cell">{job.technicianName || '-'}</td>
                        <td className="hidden table-cell lg:table-cell">{formatDateTime(job.receivedDate)}</td>
                        <td className="table-cell">
                          <div className="row-actions flex justify-end gap-2">
                            {canManage ? (
                              <>
                                <button type="button" className="icon-btn text-amber-600 hover:text-amber-700" title={t('warrantyClaims.escalateFromRepairJob')} onClick={() => setEscalateModal({ jobId: job.id, jobNumber: job.jobNumber, productId: job.productId })}>
                                  <ShieldAlert size={16} />
                                </button>
                                <button type="button" className="icon-btn" title={t('common.edit')} onClick={() => setFormModal({ mode: 'edit', job })}>
                                  <Pencil size={16} />
                                </button>
                                <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" title={t('common.delete')} onClick={() => handleDelete(job)}>
                                  <Trash2 size={16} />
                                </button>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-slate-100 px-5 py-4">
                <Pagination page={vm.page} totalPages={vm.totalPages} onPageChange={vm.setPage} />
              </div>
            </>
          )}
        </div>
      ) : null}

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


