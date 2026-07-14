import { Fragment, useState } from 'react';
import { Bug } from 'lucide-react';
import { Alert, Badge, EmptyState, Pagination, SectionHeader, StatCard, TableSkeleton } from '../../../components/ui.jsx';
import TableReportActions from '../../../components/TableReportActions.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatDateTime, formatNumber } from '../../../utils/calculations.js';
import { useErrorLogsViewModel } from '../viewmodels/useErrorLogsViewModel';

function statusTone(statusCode = 0) {
  if (statusCode >= 500) {
    return 'rose';
  }
  if (statusCode >= 400) {
    return 'amber';
  }
  return 'slate';
}

const ERROR_LOGS_REPORT_ID = 'error-logs-report';

export default function ErrorLogsPage() {
  const { t } = useInventoryApp();
  const vm = useErrorLogsViewModel();
  const [expandedId, setExpandedId] = useState(null);

  return (
    <div>
      <SectionHeader
        eyebrow={t('nav.errorLogs')}
        title={t('errorLogs.title')}
        description={t('errorLogs.description')}
      />

      {vm.error ? (
        <div className="mb-6">
          <Alert type="error">{vm.error}</Alert>
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-1 lg:grid-cols-[220px]">
        <StatCard title={t('errorLogs.totalErrors')} value={formatNumber(vm.total)} helper={t('errorLogs.totalErrorsHelper')} tone="rose" />
      </div>

      <div id={ERROR_LOGS_REPORT_ID} className="surface mt-6 overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="section-title">{t('errorLogs.tableTitle')}</h2>
            <div className="flex flex-wrap items-center justify-end gap-2 no-print">
              <span className="muted-chip">{formatNumber(vm.total)} {t('common.records')}</span>
              <TableReportActions targetId={ERROR_LOGS_REPORT_ID} title={t('errorLogs.title')} fileName="error-logs" entityType="error_logs" t={t} />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3">{t('errorLogs.when')}</th>
                <th className="px-4 py-3">{t('errorLogs.request')}</th>
                <th className="px-4 py-3">{t('errorLogs.status')}</th>
                <th className="px-4 py-3">{t('errorLogs.message')}</th>
                <th className="px-4 py-3">{t('errorLogs.user')}</th>
              </tr>
            </thead>
            {vm.loading ? null : (
              <tbody className="divide-y divide-slate-100">
                {vm.logs.map((log) => (
                  <Fragment key={log.id}>
                    <tr

                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                    >
                      <td className="table-cell whitespace-nowrap text-sm font-semibold text-slate-700">{formatDateTime(log.createdAt)}</td>
                      <td className="table-cell">
                        <p className="font-semibold text-slate-950">{log.method}</p>
                        <p className="text-xs text-slate-500">{log.path}</p>
                      </td>
                      <td className="table-cell">
                        <Badge tone={statusTone(log.statusCode)}>{log.statusCode}</Badge>
                      </td>
                      <td className="table-cell max-w-[24rem]">
                        <p className="truncate">{log.message}</p>
                      </td>
                      <td className="table-cell">
                        <p className="font-semibold text-slate-950">{log.userName || '-'}</p>
                        <p className="text-xs text-slate-500">{log.userEmail || ''}</p>
                      </td>
                    </tr>
                    {expandedId === log.id ? (
                      <tr>
                        <td colSpan={5} className="bg-slate-50 px-4 py-3">
                          <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs text-slate-600">{log.stack || log.message}</pre>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            )}
          </table>
          {vm.loading ? (
            <div className="p-5">
              <TableSkeleton columns={5} showHeader={false} />
            </div>
          ) : null}
        </div>
        {!vm.loading && !vm.error && !vm.logs.length ? (
          <div className="p-5">
            <EmptyState title={t('errorLogs.noLogsTitle')} description={t('errorLogs.noLogsDescription')} icon={Bug} />
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
