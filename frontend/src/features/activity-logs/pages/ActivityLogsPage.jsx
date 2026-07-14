import { ClipboardList, Download, FileSpreadsheet, Loader2, Printer, Search } from 'lucide-react';
import { Alert, Badge, EmptyState, Pagination, SectionHeader, TableSkeleton, Select } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { downloadSheetPdf } from '../../../services/printService.js';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { formatDateTime, formatNumber } from '../../../utils/calculations.js';
import { useActivityLogsViewModel } from '../viewmodels/useActivityLogsViewModel';
import { actionTone } from '../../../models/inventoryViewData.js';
import { useAsyncAction } from '../../../hooks/useAsyncAction.js';

const ACTIVITY_LOGS_PRINT_ID = 'activity-logs-print';

const AUDIT_MODULES = [
  'products',
  'dsrs',
  'customers',
  'expenses',
  'morning-issue',
  'settlements',
  'dsr-finance',
  'due-ledger',
  'users',
  'system',
];

function formatValue(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

export default function ActivityLogsPage() {
  const { t } = useInventoryApp();
  const vm = useActivityLogsViewModel();
  const [downloadingPdf, downloadPdf] = useAsyncAction();

  async function handleExportExcel() {
    const { utils, writeFile } = await import('xlsx');
    const header = [t('activityLogs.when'), t('activityLogs.user'), t('activityLogs.action'), t('activityLogs.entity'), t('activityLogs.descriptionColumn'), t('activityLogs.reason')];
    const data = vm.logs.map((log) => [
      formatDateTime(log.createdAt),
      log.userName || '',
      log.actionType,
      `${log.entityType}${log.entityId ? ` / ${log.entityId}` : ''}`,
      log.description || '',
      log.reason || '',
    ]);
    const ws = utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [{ wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 24 }, { wch: 40 }, { wch: 24 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, t('activityLogs.sheetName'));
    writeFile(wb, 'activity-logs.xlsx');
  }

  return (
    <div>
      <SectionHeader
        eyebrow={t('nav.activityLogs')}
        title={t('activityLogs.title')}
        description={t('activityLogs.description')}
      />

      {vm.error ? (
        <div className="mb-6">
          <Alert type="error">{vm.error}</Alert>
        </div>
      ) : null}

      <div className="mb-6">
        <div className="surface p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">{t('activityLogs.searchLabel')}</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  className="input pl-9"
                  value={vm.search}
                  onChange={(event) => vm.setSearch(event.target.value)}
                  placeholder={t('activityLogs.searchPlaceholder')}
                />
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="label">{t('activityLogs.filterModule')}</label>
              <Select className="input" value={vm.module} onChange={(event) => vm.setModule(event.target.value)}>
                <option value="">{t('activityLogs.allModules')}</option>
                {AUDIT_MODULES.map((moduleKey) => (
                  <option key={moduleKey} value={moduleKey}>
                    {t(`activityLogs.modules.${moduleKey}`)}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="label">{t('activityLogs.filterAction')}</label>
              <input className="input" value={vm.actionType} onChange={(event) => vm.setActionType(event.target.value)} placeholder="product.update" />
            </div>
            <div>
              <label className="label">{t('activityLogs.filterDateFrom')}</label>
              <DatePickerField value={vm.dateFrom} onChange={vm.setDateFrom} />
            </div>
            <div>
              <label className="label">{t('activityLogs.filterDateTo')}</label>
              <DatePickerField value={vm.dateTo} onChange={vm.setDateTo} min={vm.dateFrom} />
            </div>
            {vm.canFilterByOrg ? (
              <div>
                <label className="label">{t('activityLogs.filterOrganization')}</label>
                <Select className="input" value={vm.tenantId} onChange={(event) => vm.setTenantId(event.target.value)}>
                  <option value="">{t('activityLogs.allOrganizations')}</option>
                  {vm.tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div id={ACTIVITY_LOGS_PRINT_ID} className="surface mt-6 overflow-hidden print-target">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="section-title">{t('activityLogs.tableTitle')}</h2>
            <div className="flex items-center gap-2 no-print">
              <span className="muted-chip">{formatNumber(vm.total)} {t('common.records')}</span>
              <button
                type="button"
                className="btn-secondary py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => downloadPdf(async () => {
                  await inventoryApi.recordPrint({ entityType: 'activity_logs', entityId: null, label: 'pdf' }).catch(() => {});
                  await downloadSheetPdf(ACTIVITY_LOGS_PRINT_ID, 'activity-logs.pdf');
                })}
                disabled={downloadingPdf}
              >
                {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                {t('purchaseReceive.downloadPdf')}
              </button>
              <button type="button" className="btn-secondary py-1.5 text-xs" onClick={handleExportExcel}>
                <FileSpreadsheet size={14} />
                {t('common.exportExcel')}
              </button>
              <button
                type="button"
                className="btn-secondary py-1.5 text-xs"
                onClick={() => { inventoryApi.recordPrint({ entityType: 'activity_logs', entityId: null, label: 'print' }).catch(() => {}); window.print(); }}
              >
                <Printer size={14} />
                {t('common.print')}
              </button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3">{t('activityLogs.when')}</th>
                <th className="px-4 py-3">{t('activityLogs.user')}</th>
                <th className="px-4 py-3">{t('activityLogs.action')}</th>
                <th className="px-4 py-3">{t('activityLogs.entity')}</th>
                <th className="px-4 py-3">{t('activityLogs.descriptionColumn')}</th>
                <th className="px-4 py-3">{t('activityLogs.changes')}</th>
                <th className="px-4 py-3">{t('activityLogs.reason')}</th>
              </tr>
            </thead>
            {vm.loading ? null : (
              <tbody className="divide-y divide-slate-100">
                {vm.logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="table-cell whitespace-nowrap text-sm font-semibold text-slate-700">{formatDateTime(log.createdAt)}</td>
                    <td className="table-cell">
                      <p className="font-semibold text-slate-950">{log.userName || '-'}</p>
                      <p className="text-xs text-slate-500">{log.userEmail || ''}</p>
                    </td>
                    <td className="table-cell">
                      <Badge tone={actionTone(log.actionType)}>{log.actionType}</Badge>
                      <p className="mt-1 hidden text-xs text-slate-500 sm:block">{log.userRole || ''}</p>
                    </td>
                    <td className="table-cell">
                      <p className="font-semibold text-slate-950">{log.entityType}</p>
                      <p className="hidden text-xs text-slate-500 sm:block">{log.entityId || '-'}</p>
                    </td>
                    <td className="table-cell max-w-[28rem]">
                      <p className="truncate">{log.description}</p>
                    </td>
                    <td className="table-cell max-w-[18rem]">
                      {Object.keys(log.afterData || {}).length ? (
                        <ul className="space-y-1">
                          {Object.keys(log.afterData).map((field) => (
                            <li key={field} className="text-xs text-slate-500">
                              <span className="font-bold">{field}</span>: {formatValue(log.beforeData?.[field])}{' -> '}{formatValue(log.afterData?.[field])}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="table-cell max-w-[14rem]">
                      <p className="truncate text-xs text-slate-500">{log.reason || '-'}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
          {vm.loading ? (
            <div className="p-5">
              <TableSkeleton columns={7} showHeader={false} />
            </div>
          ) : null}
        </div>
        {!vm.loading && !vm.error && !vm.logs.length ? (
          <div className="p-5">
            <EmptyState title={t('activityLogs.noLogsTitle')} description={t('activityLogs.noLogsDescription')} icon={ClipboardList} />
          </div>
        ) : null}
        {!vm.loading && !vm.error && vm.logs.length ? (
          <div className="border-t border-slate-100 p-4">
            <Pagination page={vm.page} totalPages={vm.totalPages} onPageChange={vm.setPage} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

