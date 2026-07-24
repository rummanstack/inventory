import { ClipboardList, Download, FileSpreadsheet, Loader2, Printer, Search } from 'lucide-react';
import { Alert, Badge, EmptyState, MobileCardList, MobileListCard, Pagination, SectionHeader, TableSkeleton, Select, cx } from '../../../components/ui.jsx';
import { DateRangePickerField } from '../../../components/DatePicker.jsx';
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
  const [exportingExcel, exportExcel] = useAsyncAction();

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
      <SectionHeader title={t('activityLogs.title')} compact />

      {vm.error ? (
        <div className="mb-6">
          <Alert type="error">{vm.error}</Alert>
        </div>
      ) : null}

      <div className="mb-6">
        <div className="surface p-5">
          <div className={cx('grid gap-4 sm:grid-cols-2 lg:grid-cols-2', vm.canFilterByOrg ? 'xl:grid-cols-7' : 'xl:grid-cols-6')}>
            <div className="lg:col-span-2">
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
            <div className="lg:col-span-2">
              <label className="label">{t('activityLogs.filterDateFrom')}</label>
              <DateRangePickerField
                from={vm.dateFrom}
                to={vm.dateTo}
                onChange={(from, to) => { vm.setDateFrom(from); vm.setDateTo(to); }}
                placeholder={`${t('activityLogs.filterDateFrom')} - ${t('activityLogs.filterDateTo')}`}
              />
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
        <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="section-title">{t('activityLogs.tableTitle')}</h2>
              <span className="muted-chip no-print">{formatNumber(vm.total)} {t('common.records')}</span>
            </div>
            <div className="flex w-full flex-wrap gap-2 no-print lg:w-auto">
              <button
                type="button"
                className="btn-secondary h-10 flex-1 justify-center gap-1.5 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
                onClick={() => downloadPdf(async () => {
                  await inventoryApi.recordPrint({ entityType: 'activity_logs', entityId: null, label: 'pdf' }).catch(() => {});
                  await downloadSheetPdf(ACTIVITY_LOGS_PRINT_ID, 'activity-logs.pdf');
                })}
                disabled={downloadingPdf}
              >
                {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                {t('purchaseReceive.downloadPdf')}
              </button>
              <button
                type="button"
                className="btn-secondary h-10 flex-1 justify-center gap-1.5 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
                onClick={() => exportExcel(handleExportExcel)}
                disabled={exportingExcel}
              >
                {exportingExcel ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
                {t('common.exportExcel')}
              </button>
              <button
                type="button"
                className="btn-secondary h-10 flex-1 justify-center gap-1.5 px-3 text-xs sm:flex-none"
                onClick={() => { inventoryApi.recordPrint({ entityType: 'activity_logs', entityId: null, label: 'print' }).catch(() => {}); window.print(); }}
              >
                <Printer size={14} />
                {t('common.print')}
              </button>
            </div>
          </div>
        </div>
        {vm.loading ? (
          <div className="p-5 md:hidden">
            <TableSkeleton columns={7} showHeader={false} />
          </div>
        ) : (
          <MobileCardList>
            {vm.logs.map((log) => (
              <MobileListCard
                key={log.id}
                title={log.description || log.actionType}
                badge={<Badge tone={actionTone(log.actionType)}>{log.actionType}</Badge>}
                subtitle={`${log.userName || '-'} - ${formatDateTime(log.createdAt)}`}
              />
            ))}
          </MobileCardList>
        )}
        <div className="hidden overflow-x-auto md:block">
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
          <div className="border-t border-slate-100 p-4 no-print">
            <Pagination page={vm.page} totalPages={vm.totalPages} onPageChange={vm.setPage} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

