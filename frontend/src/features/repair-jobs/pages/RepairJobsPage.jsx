import { useEffect, useState } from 'react';
import { FileSpreadsheet, Download, Pencil, Plus, Printer, Search, ShieldAlert, Trash2, Wrench } from 'lucide-react';
import { Alert, Badge, EmptyState, Pagination, SectionHeader, TableSkeleton } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { downloadSheetPdf } from '../../../services/printService.js';
import { formatDate, formatNumber } from '../../../utils/calculations.js';
import { repairJobStatusTone, repairJobApprovalTone } from '../../../models/inventoryViewData.js';
import RepairJobFormModal from '../components/RepairJobFormModal';
import WarrantyClaimFormModal from '../../warranty-claims/components/WarrantyClaimFormModal';
import { useRepairJobsViewModel } from '../viewmodels/useRepairJobsViewModel';

const JOB_STATUS_VALUES = ['RECEIVED', 'DIAGNOSING', 'AWAITING_PARTS', 'IN_REPAIR', 'READY', 'DELIVERED', 'CANCELLED'];
const REPAIR_JOBS_PRINT_ID = 'repair-jobs-print';

export default function RepairJobsPage() {
  const { saveRepairJob, deleteRepairJob, saveWarrantyClaim, t, can } = useInventoryApp();
  const vm = useRepairJobsViewModel();
  const [formModal, setFormModal] = useState(null);
  const [escalateModal, setEscalateModal] = useState(null);
  const [technicians, setTechnicians] = useState([]);
  const canManage = can('manage_repair_jobs');

  useEffect(() => {
    inventoryApi.listUsers().then((result) => {
      setTechnicians(Array.isArray(result) ? result : (result?.items || []));
    }).catch(() => {});
  }, []);

  async function handleExportExcel() {
    const result = await inventoryApi.listRepairJobs({
      page: 1,
      pageSize: 10000,
      search: vm.search || undefined,
      status: vm.status || undefined,
      technicianId: vm.technicianId || undefined,
      dateFrom: vm.dateFrom || undefined,
      dateTo: vm.dateTo || undefined,
    });
    const all = result.items || [];
    const { utils, writeFile } = await import('xlsx');
    const header = [
      t('repairJobs.jobNumberLabel'),
      t('repairJobs.customerLabel'),
      t('repairJobs.serialLabel'),
      t('repairJobs.statusLabel'),
      t('repairJobs.approvalStatusLabel'),
      t('repairJobs.technicianLabel'),
      t('repairJobs.receivedDateLabel'),
      t('repairJobs.promisedDateLabel'),
      t('repairJobs.estimatedCostLabel'),
    ];
    const data = all.map((job) => [
      job.jobNumber,
      job.customerName || '',
      job.serialNumber || '',
      t(`repairJobs.statuses.${job.status}`),
      t(`repairJobs.approvalStatuses.${job.approvalStatus}`),
      job.technicianName || '',
      job.receivedDate || '',
      job.promisedDate || '',
      job.estimatedCost,
    ]);
    const ws = utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [{ wch: 16 }, { wch: 22 }, { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, t('repairJobs.sheetName'));
    writeFile(wb, 'repair-jobs.xlsx');
  }

  return (
    <div>
      <SectionHeader
        eyebrow={t('repairJobs.eyebrow')}
        title={t('repairJobs.title')}
        description={t('repairJobs.description')}
        action={canManage ? (
          <button type="button" className="btn-primary" onClick={() => setFormModal({ mode: 'add' })}>
            <Plus size={18} />
            {t('repairJobs.add')}
          </button>
        ) : null}
      />

      <div id={REPAIR_JOBS_PRINT_ID} className="surface overflow-hidden print-target">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 no-print">
          <span className="text-sm font-bold text-slate-700">{t('repairJobs.title')}</span>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary py-1.5 text-xs"
              onClick={() => { inventoryApi.recordPrint({ entityType: 'repair_jobs', entityId: null, label: 'pdf' }).catch(() => {}); downloadSheetPdf(REPAIR_JOBS_PRINT_ID, 'repair-jobs.pdf'); }}
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
              onClick={() => { inventoryApi.recordPrint({ entityType: 'repair_jobs', entityId: null, label: 'print' }).catch(() => {}); window.print(); }}
            >
              <Printer size={14} />
              {t('common.print')}
            </button>
          </div>
        </div>

        <div className="border-b border-slate-100 p-5 no-print">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">{t('repairJobs.eyebrow')}</p>
              <p className="text-sm font-medium text-slate-500">{t('repairJobs.description')}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm font-bold">
              <span className="muted-chip">{formatNumber(vm.total)} {t('repairJobs.jobCount')}</span>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                className="input pl-10"
                value={vm.search}
                onChange={(event) => vm.setSearch(event.target.value)}
                placeholder={t('repairJobs.searchPlaceholder')}
              />
            </div>
            <select className="input" value={vm.status} onChange={(event) => vm.setStatus(event.target.value)}>
              <option value="">{t('repairJobs.allStatuses')}</option>
              {JOB_STATUS_VALUES.map((value) => (
                <option key={value} value={value}>{t(`repairJobs.statuses.${value}`)}</option>
              ))}
            </select>
            <select className="input" value={vm.technicianId} onChange={(event) => vm.setTechnicianId(event.target.value)}>
              <option value="">{t('repairJobs.allTechnicians')}</option>
              {technicians.map((user) => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2 lg:col-span-2">
              <DatePickerField value={vm.dateFrom} onChange={vm.setDateFrom} placeholder={t('purchaseReceive.dateFrom')} />
              <DatePickerField value={vm.dateTo} onChange={vm.setDateTo} placeholder={t('purchaseReceive.dateTo')} />
            </div>
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
                  <th className="px-4 py-3">{t('repairJobs.jobNumberLabel')}</th>
                  <th className="px-4 py-3">{t('repairJobs.customerLabel')}</th>
                  <th className="hidden px-4 py-3 sm:table-cell">{t('repairJobs.serialLabel')}</th>
                  <th className="px-4 py-3">{t('repairJobs.statusLabel')}</th>
                  <th className="hidden px-4 py-3 md:table-cell">{t('repairJobs.approvalStatusLabel')}</th>
                  <th className="hidden px-4 py-3 lg:table-cell">{t('repairJobs.technicianLabel')}</th>
                  <th className="hidden px-4 py-3 lg:table-cell">{t('repairJobs.receivedDateLabel')}</th>
                  <th className="px-4 py-3 text-right no-print">{t('common.actions')}</th>
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
                    <td className="table-cell no-print">
                      <div className="flex justify-end gap-2">
                        {canManage ? (
                          <>
                            <button
                              type="button"
                              className="icon-btn text-amber-600 hover:text-amber-700"
                              title={t('warrantyClaims.escalateFromRepairJob')}
                              onClick={() => setEscalateModal({ jobId: job.id, jobNumber: job.jobNumber, productId: job.productId })}
                            >
                              <ShieldAlert size={16} />
                            </button>
                            <button
                              type="button"
                              className="icon-btn"
                              title={t('common.edit')}
                              onClick={() => setFormModal({ mode: 'edit', job })}
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              type="button"
                              className="icon-btn text-rose-600 hover:text-rose-700"
                              title={t('common.delete')}
                              onClick={async () => { const r = await deleteRepairJob(job); if (r.ok) vm.reload(); }}
                            >
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
        )}

        {!vm.loading && !vm.error && !vm.items.length ? (
          <div className="p-5">
            <EmptyState title={t('repairJobs.noMatchTitle')} description={t('repairJobs.noMatchDescription')} icon={Wrench} />
          </div>
        ) : null}

        {!vm.loading && !vm.error && vm.items.length ? (
          <div className="border-t border-slate-100 px-5 py-4 no-print">
            <Pagination page={vm.page} totalPages={vm.totalPages} onPageChange={vm.setPage} />
          </div>
        ) : null}
      </div>

      {formModal ? (
        <RepairJobFormModal
          job={formModal.job}
          onClose={() => setFormModal(null)}
          onSave={async (value) => {
            const result = await saveRepairJob(value);
            if (result.ok) {
              setFormModal(null);
              vm.reload();
            }
            return result;
          }}
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
            if (result.ok) {
              setEscalateModal(null);
            }
            return result;
          }}
        />
      ) : null}
    </div>
  );
}
