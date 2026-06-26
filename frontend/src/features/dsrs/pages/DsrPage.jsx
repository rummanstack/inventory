import { useEffect, useState } from 'react';
import { CheckCircle2, Download, FileSpreadsheet, MapPin, Pencil, Phone, Plus, Printer, Search, Target, Trash2, Users } from 'lucide-react';
import { Alert, Badge, EmptyState, Pagination, SectionHeader, TableSkeleton } from '../../../components/ui.jsx';
import { statusTone } from '../../../models/inventoryViewData.js';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { downloadSheetPdf } from '../../../services/printService.js';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { formatCurrency, formatNumber } from '../../../utils/calculations.js';
import DsrFormModal from '../components/DsrFormModal';
import DsrTargetModal from '../components/DsrTargetModal';
import { useDsrViewModel } from '../viewmodels/useDsrViewModel';

const DSR_PRINT_ID = 'dsr-print';

export default function DsrPage() {
  const { today, saveDsr, deleteDsr, t, can } = useInventoryApp();
  const vm = useDsrViewModel({ today });
  const [dsrModal, setDsrModal] = useState(null);
  const [targetModal, setTargetModal] = useState(false);
  const [targetSummary, setTargetSummary] = useState([]);
  const canManageDsrs = can('manage_dsrs');

  const currentMonth = today ? today.slice(0, 7) : new Date().toISOString().slice(0, 7);

  function loadTargetSummary() {
    inventoryApi.getDsrTargetSummary(currentMonth)
      .then((res) => setTargetSummary(res.summary || []))
      .catch(() => {});
  }

  useEffect(() => {
    loadTargetSummary();
  }, [currentMonth]);

  const targetMap = new Map(targetSummary.map((r) => [r.dsrId, r]));

  async function handleExportExcel() {
    const result = await inventoryApi.listDsrs({ search: vm.search || undefined, page: 1, pageSize: 10000 });
    const all = result.items || [];
    const { utils, writeFile } = await import('xlsx');
    const header = [t('dsr.name'), t('dsr.phone'), t('dsr.area'), t('dsr.status'), t('dsr.currentDue')];
    const data = all.map((dsr) => [dsr.name, dsr.phone || '', dsr.area || '', dsr.status, Number(dsr.currentDue || 0)]);
    const ws = utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [{ wch: 22 }, { wch: 16 }, { wch: 18 }, { wch: 12 }, { wch: 14 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, t('dsr.sheetName'));
    writeFile(wb, 'dsr-directory.xlsx');
  }

  return (
    <div>
      <SectionHeader
        eyebrow={t('dsr.eyebrow')}
        title={t('dsr.title')}
        description={t('dsr.description')}
        action={canManageDsrs ? (
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={() => setTargetModal(true)}>
              <Target size={16} />
              Set Targets
            </button>
            <button type="button" className="btn-primary" onClick={() => setDsrModal({ mode: 'add' })}>
              <Plus size={18} />
              {t('dsr.add')}
            </button>
          </div>
        ) : null}
      />

      <div id={DSR_PRINT_ID} className="surface overflow-hidden print-target">
        <div className="border-b border-slate-100 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">{t('dsr.eyebrow')}</p>
            <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
              <span className="muted-chip">{formatNumber(vm.total)} {t('common.dsr')}</span>
              <span className="muted-chip">{formatNumber(vm.inProgressDsrIds.size)} {t('dsr.inProgress')}</span>
              <button
                type="button"
                className="btn-secondary no-print py-1.5 text-xs"
                onClick={() => { inventoryApi.recordPrint({ entityType: 'dsr', entityId: null, label: 'pdf' }).catch(() => {}); downloadSheetPdf(DSR_PRINT_ID, 'dsr-directory.pdf'); }}
              >
                <Download size={14} />
                {t('purchaseReceive.downloadPdf')}
              </button>
              <button type="button" className="btn-secondary no-print py-1.5 text-xs" onClick={handleExportExcel}>
                <FileSpreadsheet size={14} />
                {t('common.exportExcel')}
              </button>
              <button
                type="button"
                className="btn-secondary no-print py-1.5 text-xs"
                onClick={() => { inventoryApi.recordPrint({ entityType: 'dsr', entityId: null, label: 'print' }).catch(() => {}); window.print(); }}
              >
                <Printer size={14} />
                {t('common.print')}
              </button>
            </div>
          </div>
          <div className="relative mt-4 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input className="input pl-10" value={vm.search} onChange={(event) => vm.setSearch(event.target.value)} placeholder={t('dsr.searchPlaceholder')} />
          </div>
        </div>
        {vm.loading ? (
          <div className="p-5">
            <TableSkeleton columns={6} showHeader={false} />
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
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">{t('dsr.name')}</th>
                <th className="px-4 py-3">{t('dsr.phone')}</th>
                <th className="px-4 py-3">{t('dsr.area')}</th>
                <th className="px-4 py-3">{t('dsr.status')}</th>
                <th className="px-4 py-3 text-right">{t('dsr.currentDue')}</th>
                <th className="px-4 py-3 text-right">Target</th>
                <th className="px-4 py-3 text-right">Achieved</th>
                <th className="px-4 py-3 text-right">%</th>
                <th className="px-4 py-3 text-right no-print">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vm.items.map((dsr, index) => (
                <tr key={dsr.id} className="hover:bg-slate-50">
                  <td className="table-cell font-black text-slate-400">{(vm.page - 1) * vm.pageSize + index + 1}</td>
                  <td className="table-cell font-semibold text-slate-950">
                    <div className="flex items-center gap-2">
                      <span>{dsr.name}</span>
                      {vm.inProgressDsrIds.has(dsr.id) ? <Badge tone="amber">{t('dsr.inProgress')}</Badge> : null}
                    </div>
                  </td>
                  <td className="hidden table-cell sm:table-cell">
                    <span className="inline-flex items-center gap-2">
                      <Phone size={15} className="text-slate-400" />
                      {dsr.phone}
                    </span>
                  </td>
                  <td className="hidden table-cell md:table-cell">
                    <span className="inline-flex items-center gap-2">
                      <MapPin size={15} className="text-slate-400" />
                      {dsr.area}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <Badge tone={statusTone(dsr.status)}>{dsr.status}</Badge>
                      {vm.inProgressDsrIds.has(dsr.id) ? <Badge tone="amber">{t('dsr.outside')}</Badge> : null}
                    </div>
                  </td>
                  <td className="table-cell text-right">
                    <span className={`font-bold ${dsr.currentDue > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
                      {formatCurrency(dsr.currentDue || 0)}
                    </span>
                  </td>
                  {(() => {
                    const t2 = targetMap.get(dsr.id);
                    const target = t2?.targetAmount ?? 0;
                    const achieved = t2?.actualAmount ?? 0;
                    const pct = target > 0 ? Math.min(Math.round((achieved / target) * 100), 999) : null;
                    const pctColor = pct === null ? '' : pct >= 100 ? 'text-emerald-600' : pct >= 75 ? 'text-amber-600' : 'text-rose-600';
                    return (
                      <>
                        <td className="table-cell text-right text-sm text-slate-500">
                          {target > 0 ? formatCurrency(target) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="table-cell text-right text-sm font-semibold">
                          <div className="flex items-center justify-end gap-1.5">
                            {achieved > 0 ? (
                              <span className={pct !== null && pct >= 100 ? 'text-emerald-600' : 'text-slate-700'}>{formatCurrency(achieved)}</span>
                            ) : <span className="text-slate-300">—</span>}
                            {pct !== null && pct >= 100 ? <CheckCircle2 size={14} className="shrink-0 text-emerald-500" /> : null}
                          </div>
                        </td>
                        <td className="table-cell text-right text-sm font-bold">
                          {pct !== null ? <span className={pctColor}>{pct}%</span> : <span className="text-slate-300">—</span>}
                        </td>
                      </>
                    );
                  })()}
                  <td className="table-cell no-print">
                    <div className="flex justify-end gap-2">
                      {canManageDsrs ? (
                        <>
                          <button type="button" className="icon-btn" title={t('common.edit')} onClick={() => setDsrModal({ mode: 'edit', dsr })}>
                            <Pencil size={16} />
                          </button>
                          <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" title={t('common.delete')} onClick={async () => { const r = await deleteDsr(dsr); if (r.ok) vm.reload(); }}>
                            <Trash2 size={16} />
                          </button>
                        </>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">-</span>
                      )}
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
            <EmptyState title={t('dsr.noMatchTitle')} description={t('dsr.noMatchDescription')} icon={Users} />
          </div>
        ) : null}
        {!vm.loading && !vm.error && vm.items.length ? (
          <div className="border-t border-slate-100 px-5 py-4">
            <Pagination page={vm.page} totalPages={vm.totalPages} onPageChange={vm.setPage} />
          </div>
        ) : null}
      </div>

      {dsrModal ? <DsrFormModal dsr={dsrModal.dsr} onClose={() => setDsrModal(null)} onSave={async (value) => {
        const result = await saveDsr(value);
        if (result.ok) {
          setDsrModal(null);
          vm.reload();
        }
        return result;
      }} /> : null}
      {targetModal ? <DsrTargetModal onClose={() => setTargetModal(false)} onSaved={() => { setTargetModal(false); loadTargetSummary(); }} /> : null}
    </div>
  );
}
