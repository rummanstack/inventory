import { useEffect, useState } from 'react';
import { ClipboardList, Download, Loader2 } from 'lucide-react';
import { Alert, Badge, EmptyState, MobileCardList, MobileListCard, Pagination, SectionHeader, TableSkeleton, cx } from '../../../components/ui.jsx';
import TableReportActions from '../../../components/TableReportActions.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi';
import { formatDateTime } from '../../../utils/calculations.js';
import { usePagination } from '../../../hooks/usePagination';
import { useTenantApiQuery } from '../../../queries/useTenantApiQuery.js';

const BACKUP_HISTORY_REPORT_ID = 'backup-history-report';
const BACKUP_SQL_SHORTCUT = { alt: true, key: 's', label: 'Alt+S' };
const BACKUP_JSON_SHORTCUT = { alt: true, key: 'j', label: 'Alt+J' };
const BACKUP_HISTORY_REPORT_SHORTCUTS = {
  pdf: { alt: true, key: 'd', label: 'Alt+D' },
  excel: { alt: true, key: 'e', label: 'Alt+E' },
  csv: { alt: true, key: 'c', label: 'Alt+C' },
  print: { alt: true, key: 'p', label: 'Alt+P' },
};

function matchesShortcut(event, shortcut) {
  return (
    event.key.toLowerCase() === shortcut.key &&
    Boolean(event.altKey) === Boolean(shortcut.alt) &&
    Boolean(event.shiftKey) === Boolean(shortcut.shift) &&
    Boolean(event.ctrlKey || event.metaKey) === Boolean(shortcut.ctrlOrMeta)
  );
}

export default function DatabaseBackupPage() {
  const { t, pushToast } = useInventoryApp();
  const [loadingFormat, setLoadingFormat] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('create');
  const { page, setPage, pageSize, resetPage } = usePagination();
  const historyQuery = useTenantApiQuery({
    scope: 'database-backup-history',
    params: { page, pageSize },
    queryFn: () => inventoryApi.listBackupHistory({ page, pageSize }),
    requireTenant: false,
    keepPrevious: true,
  });
  const history = historyQuery.data?.items || [];
  const historyTotal = historyQuery.data?.total || 0;
  const historyTotalPages = historyQuery.data?.totalPages || 0;
  const historyLoading = historyQuery.isLoading || historyQuery.isFetching;
  const historyError = historyQuery.error?.message || '';
  const loadHistory = () => historyQuery.refetch();
  const backupTabs = [
    { id: 'create', label: t('backup.download'), icon: Download },
    { id: 'history', label: t('backup.history.title'), icon: ClipboardList, count: historyTotal },
  ];

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
      setActiveTab('history');
      pushToast('success', t('backup.title'), filename);
    } catch (requestError) {
      const message = requestError.message || t('backup.failed');
      setError(message);
      pushToast('error', t('alerts.requestFailed'), message);
    } finally {
      setLoadingFormat(null);
    }
  }

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.altKey && !event.ctrlKey && !event.metaKey && event.key === '1') {
        event.preventDefault();
        setActiveTab('create');
      } else if (event.altKey && !event.ctrlKey && !event.metaKey && event.key === '2') {
        event.preventDefault();
        setActiveTab('history');
      } else if (matchesShortcut(event, BACKUP_SQL_SHORTCUT) && !loadingFormat) {
        event.preventDefault();
        handleDownload('sql');
      } else if (matchesShortcut(event, BACKUP_JSON_SHORTCUT) && !loadingFormat) {
        event.preventDefault();
        handleDownload('json');
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingFormat]);

  return (
    <div className="space-y-6">
      <SectionHeader title={t('backup.title')} compact />

      <div className="no-print overflow-x-auto">
        <div className="inline-flex min-w-full gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 sm:min-w-0">
          {backupTabs.map((tab, index) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={cx(
                  'flex min-h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 text-sm font-bold transition sm:flex-none',
                  selected
                    ? 'border border-indigo-200 bg-indigo-50 text-indigo-800 shadow-sm ring-2 ring-indigo-100'
                    : 'border border-transparent text-slate-500 hover:bg-white/70 hover:text-slate-800',
                )}
                aria-pressed={selected}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={16} />
                {tab.label}
                {typeof tab.count === 'number' ? (
                  <span className={cx(
                    'rounded-full px-2 py-0.5 text-xs font-black',
                    selected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600',
                  )}>
                    {tab.count}
                  </span>
                ) : null}
                <kbd className={cx(
                  'rounded border px-1.5 py-0.5 text-[10px] font-black',
                  selected ? 'border-indigo-200 bg-white text-indigo-700' : 'border-slate-200 bg-white text-slate-400',
                )}>Alt+{index + 1}</kbd>
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <div className="mb-6">
          <Alert type="error">{error}</Alert>
        </div>
      ) : null}

      {activeTab === 'create' ? (
        <div className="surface p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-indigo-50 p-2.5 text-indigo-700">
                  <Download size={20} />
                </div>
                <div>
                  <h2 className="section-title">{t('backup.download')}</h2>
                  <p className="mt-1 text-sm text-slate-500">{t('backup.description')}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-700">{t('backup.helper')}</p>
                </div>
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-64">
              <button type="button" className="btn-primary w-full justify-center" onClick={() => handleDownload('sql')} disabled={Boolean(loadingFormat)}>
                {loadingFormat === 'sql' ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                {loadingFormat === 'sql' ? t('backup.downloading') : t('backup.exportSql')}
                <kbd className="ml-1 rounded border border-white/40 bg-white/20 px-1 py-0.5 font-mono text-[10px] text-white">Alt+S</kbd>
              </button>
              <button type="button" className="btn-secondary w-full justify-center" onClick={() => handleDownload('json')} disabled={Boolean(loadingFormat)}>
                {loadingFormat === 'json' ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                {loadingFormat === 'json' ? t('backup.downloading') : t('backup.exportJson')}
                <kbd className="ml-1 rounded border border-slate-300 bg-white/70 px-1 py-0.5 font-mono text-[10px] text-slate-500">Alt+J</kbd>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === 'history' ? (
      <div id={BACKUP_HISTORY_REPORT_ID} className="surface overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="section-title">{t('backup.history.title')}</h2>
            <div className="flex flex-wrap items-center justify-end gap-2 no-print">
              <span className="muted-chip">{historyTotal} {t('common.records')}</span>
              <TableReportActions targetId={BACKUP_HISTORY_REPORT_ID} title={t('backup.history.title')} fileName="backup-history" entityType="database_backup_history" t={t} shortcuts={BACKUP_HISTORY_REPORT_SHORTCUTS} />
            </div>
          </div>
        </div>

        {historyError ? (
          <div className="p-5">
            <Alert type="error">{historyError}</Alert>
          </div>
        ) : (
          <>
          {historyLoading ? (
            <div className="p-5 md:hidden">
              <TableSkeleton columns={4} showHeader={false} />
            </div>
          ) : (
            <MobileCardList>
              {history.map((log) => (
                <MobileListCard
                  key={log.id}
                  title={log.metadata?.filename || '-'}
                  badge={<Badge tone="blue">{(log.metadata?.format || 'sql').toUpperCase()}</Badge>}
                  subtitle={`${log.userName || '-'} · ${formatDateTime(log.createdAt)}`}
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
          </>
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
      ) : null}
    </div>
  );
}
