import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, FileSpreadsheet, LayoutGrid, List, Package, Pencil, Plus, Search, ShieldAlert, Table2, Trash2, Wrench } from 'lucide-react';
import { Alert, Badge, EmptyState, Pagination, SectionHeader, TableSkeleton } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { formatCurrency, formatDate } from '../../../utils/calculations.js';
import { repairJobStatusTone, repairJobApprovalTone } from '../../../models/inventoryViewData.js';
import RepairJobFormModal from '../components/RepairJobFormModal';
import WarrantyClaimFormModal from '../../warranty-claims/components/WarrantyClaimFormModal';
import { useRepairJobsViewModel } from '../viewmodels/useRepairJobsViewModel';

const JOB_STATUS_VALUES = ['RECEIVED', 'DIAGNOSING', 'AWAITING_PARTS', 'IN_REPAIR', 'READY', 'DELIVERED', 'CANCELLED'];
const ACTIVE_STATUSES = ['RECEIVED', 'DIAGNOSING', 'AWAITING_PARTS', 'IN_REPAIR', 'READY'];

const BOARD_COLUMNS = [
  { status: 'RECEIVED',       icon: Package,     bg: 'bg-slate-50',   border: 'border-slate-200', header: 'bg-slate-100 text-slate-700' },
  { status: 'DIAGNOSING',     icon: Search,      bg: 'bg-blue-50',    border: 'border-blue-200',  header: 'bg-blue-100 text-blue-700'   },
  { status: 'AWAITING_PARTS', icon: Clock,       bg: 'bg-amber-50',   border: 'border-amber-200', header: 'bg-amber-100 text-amber-700' },
  { status: 'IN_REPAIR',      icon: Wrench,      bg: 'bg-indigo-50',  border: 'border-indigo-200',header: 'bg-indigo-100 text-indigo-700'},
  { status: 'READY',          icon: CheckCircle2,bg: 'bg-emerald-50', border: 'border-emerald-200',header:'bg-emerald-100 text-emerald-700'},
];

function isOverdue(job) {
  if (!job.promisedDate || job.status === 'DELIVERED' || job.status === 'CANCELLED') return false;
  return job.promisedDate < new Date().toISOString().slice(0, 10);
}

function JobCard({ job, canManage, t, onEdit, onDelete, onEscalate }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm space-y-2 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 text-left"
          onClick={() => onEdit(job)}
        >
          {job.jobNumber}
        </button>
        <Badge tone={repairJobApprovalTone(job.approvalStatus)} className="shrink-0 text-[10px]">
          {t(`repairJobs.approvalStatuses.${job.approvalStatus}`)}
        </Badge>
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-900 leading-tight">{job.customerName || '—'}</p>
        {job.customerPhone ? <p className="text-xs text-slate-400">{job.customerPhone}</p> : null}
      </div>

      {job.productName ? <p className="text-xs text-slate-600 font-medium">{job.productName}</p> : null}
      {job.serialNumber ? <p className="text-xs text-slate-400 font-mono">{job.serialNumber}</p> : null}

      <div className="flex flex-wrap items-center justify-between gap-1 pt-1 border-t border-slate-100">
        {job.promisedDate ? (
          <span className={`text-[11px] font-semibold ${isOverdue(job) ? 'text-rose-600' : 'text-slate-400'}`}>
            {isOverdue(job) ? '⚠ ' : ''}Due {formatDate(job.promisedDate)}
          </span>
        ) : (
          <span className="text-[11px] text-slate-300">No deadline</span>
        )}
        {job.estimatedCost > 0 ? (
          <span className="text-[11px] font-semibold text-slate-500">{formatCurrency(job.estimatedCost)}</span>
        ) : null}
      </div>

      {job.technicianName ? (
        <p className="text-[11px] text-slate-400">Tech: {job.technicianName}</p>
      ) : null}

      {canManage ? (
        <div className="flex items-center gap-1 pt-1">
          <button
            type="button"
            className="icon-btn text-amber-500 hover:text-amber-700"
            title={t('warrantyClaims.escalateFromRepairJob')}
            onClick={() => onEscalate(job)}
          >
            <ShieldAlert size={14} />
          </button>
          <button
            type="button"
            className="icon-btn"
            title={t('common.edit')}
            onClick={() => onEdit(job)}
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            className="icon-btn text-rose-500 hover:text-rose-700"
            title={t('common.delete')}
            onClick={() => onDelete(job)}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ) : null}
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
        actions={
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
                  <div className="mb-3 h-5 w-24 animate-pulse rounded-full bg-slate-200" />
                  <div className="space-y-2">
                    {[1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-200" />)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {BOARD_COLUMNS.map((col) => {
                  const jobs = boardByStatus[col.status] || [];
                  const ColIcon = col.icon;
                  return (
                    <div key={col.status} className={`rounded-2xl border ${col.border} ${col.bg} p-3 min-h-[200px]`}>
                      <div className={`flex items-center justify-between rounded-xl px-3 py-2 mb-3 ${col.header}`}>
                        <div className="flex items-center gap-2">
                          <ColIcon size={14} />
                          <span className="text-xs font-black uppercase tracking-wide">
                            {t(`repairJobs.statuses.${col.status}`)}
                          </span>
                        </div>
                        <span className="text-xs font-black">{jobs.length}</span>
                      </div>

                      {jobs.length === 0 ? (
                        <p className="py-4 text-center text-xs text-slate-400">Empty</p>
                      ) : (
                        <div className="space-y-2">
                          {jobs.map((job) => (
                            <JobCard
                              key={job.id}
                              job={job}
                              canManage={canManage}
                              t={t}
                              onEdit={(j) => setFormModal({ mode: 'edit', job: j })}
                              onDelete={handleDelete}
                              onEscalate={(j) => setEscalateModal({ jobId: j.id, jobNumber: j.jobNumber, productId: j.productId })}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Closed jobs summary row */}
              {(deliveredCount > 0 || cancelledCount > 0) ? (
                <div className="mt-4 flex flex-wrap gap-3">
                  {deliveredCount > 0 ? (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2">
                      <CheckCircle2 size={14} className="text-emerald-600" />
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
                    View full history in table →
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {/* ── TABLE VIEW ── */}
      {viewMode === 'table' ? (
        <div className="surface mt-4 overflow-hidden">
          <div className="border-b border-slate-100 p-5">
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
              <select className="input" value={vm.status} onChange={(e) => vm.setStatus(e.target.value)}>
                <option value="">{t('repairJobs.allStatuses')}</option>
                {JOB_STATUS_VALUES.map((s) => (
                  <option key={s} value={s}>{t(`repairJobs.statuses.${s}`)}</option>
                ))}
              </select>
              <select className="input" value={vm.technicianId} onChange={(e) => vm.setTechnicianId(e.target.value)}>
                <option value="">{t('repairJobs.allTechnicians')}</option>
                {technicians.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2 lg:col-span-2">
                <DatePickerField value={vm.dateFrom} onChange={vm.setDateFrom} />
                <DatePickerField value={vm.dateTo} onChange={vm.setDateTo} />
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
                      <th className="hidden px-4 py-3 sm:table-cell">{t('repairJobs.serialLabel')}</th>
                      <th className="px-4 py-3">{t('repairJobs.statusLabel')}</th>
                      <th className="hidden px-4 py-3 md:table-cell">{t('repairJobs.approvalStatusLabel')}</th>
                      <th className="hidden px-4 py-3 lg:table-cell">{t('repairJobs.technicianLabel')}</th>
                      <th className="hidden px-4 py-3 lg:table-cell">{t('repairJobs.receivedDateLabel')}</th>
                      <th className="px-4 py-3 text-right">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vm.items.map((job) => (
                      <tr key={job.id} className="hover:bg-slate-50">
                        <td className="table-cell font-semibold text-slate-950">{job.jobNumber}</td>
                        <td className="table-cell">
                          <div className="font-medium text-slate-900">{job.customerName || '-'}</div>
                          {job.customerPhone ? <div className="text-xs text-slate-500">{job.customerPhone}</div> : null}
                        </td>
                        <td className="hidden table-cell sm:table-cell">{job.serialNumber || '-'}</td>
                        <td className="table-cell">
                          <Badge tone={repairJobStatusTone(job.status)}>{t(`repairJobs.statuses.${job.status}`)}</Badge>
                        </td>
                        <td className="hidden table-cell md:table-cell">
                          <Badge tone={repairJobApprovalTone(job.approvalStatus)}>{t(`repairJobs.approvalStatuses.${job.approvalStatus}`)}</Badge>
                        </td>
                        <td className="hidden table-cell lg:table-cell">{job.technicianName || '-'}</td>
                        <td className="hidden table-cell lg:table-cell">{formatDate(job.receivedDate)}</td>
                        <td className="table-cell">
                          <div className="flex justify-end gap-2">
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
