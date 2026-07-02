import { useEffect, useState } from 'react';
import { ClipboardList, Download } from 'lucide-react';
import { Alert, Badge, EmptyState, Pagination, SectionHeader, TableSkeleton } from '../../../components/ui.jsx';
import TableReportActions from '../../../components/TableReportActions.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi';
import { formatDateTime } from '../../../utils/calculations.js';
import { usePagination } from '../../../hooks/usePagination';

const BACKUP_HISTORY_REPORT_ID = 'backup-history-report';

export default function DatabaseBackupPage() {
  const { t, pushToast } = useInventoryApp();
  const [loadingFormat, setLoadingFormat] = useState(null);
  const [error, setError] = useState('');
  const { page, setPage, pageSize, resetPage } = usePagination();
  const [history, setHistory] = useState([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyTotalPages, setHistoryTotalPages] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');

  async function loadHistory() {
    try {
      setHistoryLoading(true);
      setHistoryError('');
      const result = await inventoryApi.listBackupHistory({ page, pageSize });
      setHistory(result.items || []);
      setHistoryTotal(result.total || 0);
      setHistoryTotalPages(result.totalPages || 0);
    } catch (requestError) {
      setHistoryError(requestError.message || t('backup.history.loadFailed'));
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, [page, pageSize]);

  async function handleDownload(format) {
    try {
      setLoadingFormat(format);
      setError('');

      const { blob, filename } = await inventoryApi.downloadDatabaseBackup(format);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      resetPage();
      await loadHistory();
      pushToast('success', t('backup.title'), filename);
    } catch (requestError) {
      const message = requestError.message || t('backup.failed');
      setError(message);
      pushToast('error', t('alerts.requestFailed'), message);
    } finally {
      setLoadingFormat(null);
    }
  }

  return (
    <div>
      <SectionHeader
        eyebrow={t('nav.databaseBackup')}
        title={t('backup.title')}
        description={t('backup.description')}
        action={(
          <div className="flex items-center gap-2">
            <button type="button" className="btn-primary" onClick={() => handleDownload('sql')} disabled={Boolean(loadingFormat)}>
              <Download size={18} />
              {loadingFormat === 'sql' ? t('backup.downloading') : t('backup.exportSql')}
            </button>
            <button type="button" className="btn-secondary" onClick={() => handleDownload('json')} disabled={Boolean(loadingFormat)}>
              <Download size={18} />
              {loadingFormat === 'json' ? t('backup.downloading') : t('backup.exportJson')}
            </button>
          </div>
        )}
      />

      {error ? (
        <div className="mb-6">
          <Alert type="error">{error}</Alert>
        </div>
      ) : null}

      <div id={BACKUP_HISTORY_REPORT_ID} className="surface overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="section-title">{t('backup.history.title')}</h2>
            <div className="flex flex-wrap items-center justify-end gap-2 no-print">
              <span className="muted-chip">{historyTotal} {t('common.records')}</span>
              <TableReportActions targetId={BACKUP_HISTORY_REPORT_ID} title={t('backup.history.title')} fileName="backup-history" entityType="database_backup_history" t={t} />
            </div>
          </div>
        </div>

        {historyError ? (
          <div className="p-5">
            <Alert type="error">{historyError}</Alert>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">{t('activityLogs.when')}</th>
                  <th className="px-4 py-3">{t('activityLogs.user')}</th>
                  <th className="px-4 py-3">{t('backup.history.filename')}</th>
                  <th className="px-4 py-3">{t('backup.history.format')}</th>
                </tr>
              </thead>
              {historyLoading ? null : (
                <tbody className="divide-y divide-slate-100">
                  {history.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="table-cell whitespace-nowrap text-sm font-semibold text-slate-700">{formatDateTime(log.createdAt)}</td>
                      <td className="table-cell">
                        <p className="font-semibold text-slate-950">{log.userName || '-'}</p>
                        <p className="text-xs text-slate-500">{log.userEmail || ''}</p>
                      </td>
                      <td className="table-cell text-sm text-slate-700">{log.metadata?.filename || '-'}</td>
                      <td className="table-cell">
                        <Badge tone="blue">{(log.metadata?.format || 'sql').toUpperCase()}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
            {historyLoading ? (
              <div className="p-5">
                <TableSkeleton columns={4} showHeader={false} />
              </div>
            ) : null}
          </div>
        )}

        {!historyLoading && !historyError && !history.length ? (
          <div className="p-5">
            <EmptyState title={t('backup.history.emptyTitle')} description={t('backup.history.emptyDescription')} icon={ClipboardList} />
          </div>
        ) : null}

        {!historyLoading && !historyError && history.length ? (
          <div className="border-t border-slate-100 p-4">
            <Pagination page={page} totalPages={historyTotalPages} onPageChange={setPage} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
