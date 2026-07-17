import { useState } from 'react';
import { Copy, KeyRound, LogOut, ShieldCheck } from 'lucide-react';
import { Alert, Badge, CopyableText, EmptyState, MobileCardList, MobileListCard, SectionHeader } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { formatDateTime } from '../../../utils/calculations.js';
import { useMutation } from '@tanstack/react-query';
import { useTenantApiQuery } from '../../../queries/useTenantApiQuery.js';

export default function SecurityPage() {
  const { t, can, confirm, pushToast } = useInventoryApp();
  const canManageUsers = can('manage_users');

  const securityQuery = useTenantApiQuery({
    scope: 'security-overview',
    params: { canManageUsers },
    queryFn: async () => {
      const [sessionsResult, historyResult, requestsResult] = await Promise.all([
        inventoryApi.listSessions(),
        inventoryApi.getLoginHistory(),
        canManageUsers ? inventoryApi.listPasswordResetRequests() : Promise.resolve({ requests: [] }),
      ]);
      return {
        sessions: sessionsResult.sessions || [],
        history: historyResult.history || [],
        resetRequests: requestsResult.requests || [],
      };
    },
  });
  const revokeMutation = useMutation({
    mutationFn: (sessionId) => sessionId === 'others'
      ? inventoryApi.revokeOtherSessions()
      : inventoryApi.revokeSession(sessionId),
  });
  const sessions = securityQuery.data?.sessions || [];
  const history = securityQuery.data?.history || [];
  const resetRequests = securityQuery.data?.resetRequests || [];
  const loading = securityQuery.isLoading;
  const error = securityQuery.error?.message || '';
  const busyId = revokeMutation.isPending ? revokeMutation.variables : '';

  async function handleRevoke(sessionId) {
    try {
      await revokeMutation.mutateAsync(sessionId);
      await securityQuery.refetch();
      pushToast('success', t('security.title'), t('security.revokeSuccess'));
    } catch (err) {
      pushToast('error', t('alerts.requestFailed'), err.message || t('alerts.requestFailed'));
    }
  }

  async function handleRevokeOthers() {
    const { confirmed } = await confirm({
      title: t('security.revokeOthers'),
      description: t('security.revokeOthersConfirm'),
      confirmLabel: t('security.revokeOthers'),
      tone: 'amber',
    });
    if (!confirmed) return;

    try {
      await revokeMutation.mutateAsync('others');
      await securityQuery.refetch();
      pushToast('success', t('security.title'), t('security.revokeOthersSuccess'));
    } catch (err) {
      pushToast('error', t('alerts.requestFailed'), err.message || t('alerts.requestFailed'));
    }
  }

  async function handleCopyLink(token) {
    const link = `${window.location.origin}/login?token=${token}`;
    try {
      await navigator.clipboard.writeText(link);
      pushToast('success', t('security.title'), t('security.linkCopied'));
    } catch {
      pushToast('error', t('alerts.requestFailed'), link);
    }
  }

  function failureReasonLabel(reason) {
    if (reason === 'locked') return t('security.reasonLocked');
    if (reason === 'invalid_credentials') return t('security.reasonInvalidCredentials');
    return reason || '-';
  }

  return (
    <div className="space-y-6">
      <SectionHeader title={t('nav.security')} compact />

      {error ? <Alert type="error">{error}</Alert> : null}

      <div className="surface overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="section-title">{t('security.sessionsTitle')}</h2>
            <p className="mt-1 text-sm text-slate-500">{t('security.sessionsDescription')}</p>
          </div>
          <button type="button" className="btn-secondary" onClick={handleRevokeOthers} disabled={busyId === 'others'}>
            <LogOut size={16} />
            {t('security.revokeOthers')}
          </button>
        </div>
        {!loading && sessions.length === 0 ? (
          <div className="p-5">
            <EmptyState title={t('security.noSessions')} description="" />
          </div>
        ) : (
          <>
          <MobileCardList>
            {sessions.map((session) => (
              <MobileListCard
                key={session.id}
                title={session.userAgent || '-'}
                badge={session.current ? <Badge tone="emerald">{t('security.thisDevice')}</Badge> : null}
                subtitle={`${session.ipAddress || '-'} · ${formatDateTime(session.lastSeenAt)}`}
                action={!session.current ? (
                  <button type="button" className="btn-secondary py-1.5 text-xs" onClick={() => handleRevoke(session.id)} disabled={busyId === session.id}>
                    {t('security.revoke')}
                  </button>
                ) : null}
              />
            ))}
          </MobileCardList>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">{t('security.device')}</th>
                  <th className="px-4 py-3">{t('security.ipAddress')}</th>
                  <th className="px-4 py-3">{t('security.created')}</th>
                  <th className="px-4 py-3">{t('security.lastActive')}</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-slate-50">
                    <td className="table-cell max-w-[20rem]">
                      <p className="truncate font-semibold text-slate-950">{session.userAgent || '-'}</p>
                      {session.current ? <Badge tone="emerald">{t('security.thisDevice')}</Badge> : null}
                    </td>
                    <td className="table-cell whitespace-nowrap text-sm text-slate-700">{session.ipAddress || '-'}</td>
                    <td className="table-cell whitespace-nowrap text-sm text-slate-700">{formatDateTime(session.createdAt)}</td>
                    <td className="table-cell whitespace-nowrap text-sm text-slate-700">{formatDateTime(session.lastSeenAt)}</td>
                    <td className="table-cell whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        <CopyableText value={session.id} copyLabel="session ID" iconOnly buttonClassName="h-8 w-8 rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100" />
                        {!session.current ? (
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => handleRevoke(session.id)}
                            disabled={busyId === session.id}
                          >
                            {t('security.revoke')}
                          </button>
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
      </div>

      <div className="surface overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="section-title">{t('security.loginHistoryTitle')}</h2>
          <p className="mt-1 text-sm text-slate-500">{t('security.loginHistoryDescription')}</p>
        </div>
        {!loading && history.length === 0 ? (
          <div className="p-5">
            <EmptyState title={t('security.noHistory')} description="" />
          </div>
        ) : (
          <>
          <MobileCardList>
            {history.map((entry) => (
              <MobileListCard
                key={entry.id}
                title={entry.userAgent || '-'}
                badge={entry.success ? <Badge tone="emerald">{t('security.success')}</Badge> : <Badge tone="rose">{t('security.failed')}</Badge>}
                subtitle={`${entry.ipAddress || '-'} · ${formatDateTime(entry.createdAt)}`}
              />
            ))}
          </MobileCardList>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">{t('security.time')}</th>
                  <th className="px-4 py-3">{t('security.result')}</th>
                  <th className="px-4 py-3">{t('security.ipAddress')}</th>
                  <th className="px-4 py-3">{t('security.device')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50">
                    <td className="table-cell whitespace-nowrap text-sm text-slate-700">{formatDateTime(entry.createdAt)}</td>
                    <td className="table-cell">
                      {entry.success ? (
                        <Badge tone="emerald">{t('security.success')}</Badge>
                      ) : (
                        <Badge tone="rose">{t('security.failed')}</Badge>
                      )}
                      {!entry.success ? <p className="mt-1 text-xs text-slate-500">{failureReasonLabel(entry.failureReason)}</p> : null}
                    </td>
                    <td className="table-cell whitespace-nowrap text-sm text-slate-700">{entry.ipAddress || '-'}</td>
                    <td className="table-cell max-w-[20rem] truncate text-sm text-slate-700">{entry.userAgent || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      <div className="surface p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-[var(--secondary-soft)] p-2.5 text-[var(--secondary-strong)]">
            <KeyRound size={18} />
          </div>
          <div>
            <h2 className="section-title">{t('security.passwordRequirementsTitle')}</h2>
            <p className="mt-1 text-sm text-slate-500">{t('security.passwordRequirementsDescription')}</p>
            <a href="/profile" className="mt-2 inline-block text-sm font-bold text-[var(--secondary-strong)] hover:underline">
              {t('security.goToProfile')}
            </a>
          </div>
        </div>
      </div>

      {canManageUsers ? (
        <div className="surface overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="section-title">{t('security.pendingResetTitle')}</h2>
            <p className="mt-1 text-sm text-slate-500">{t('security.pendingResetDescription')}</p>
          </div>
          {!loading && resetRequests.length === 0 ? (
            <div className="p-5">
              <EmptyState title={t('security.noPendingRequests')} description="" icon={ShieldCheck} />
            </div>
          ) : (
            <>
            <MobileCardList>
              {resetRequests.map((request) => (
                <MobileListCard
                  key={request.id}
                  title={request.userName}
                  subtitle={`${request.userEmail} · ${formatDateTime(request.createdAt)}`}
                  action={(
                    <button type="button" className="btn-secondary py-1.5 text-xs" onClick={() => handleCopyLink(request.token)}>
                      <Copy size={14} />
                      {t('security.copyLink')}
                    </button>
                  )}
                />
              ))}
            </MobileCardList>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-3">{t('users.name')}</th>
                    <th className="px-4 py-3">{t('users.email')}</th>
                    <th className="px-4 py-3">{t('security.requestedAt')}</th>
                    <th className="px-4 py-3">{t('security.expiresAt')}</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resetRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-slate-50">
                      <td className="table-cell font-semibold text-slate-950">{request.userName}</td>
                      <td className="table-cell text-sm text-slate-700">{request.userEmail}</td>
                      <td className="table-cell whitespace-nowrap text-sm text-slate-700">{formatDateTime(request.createdAt)}</td>
                      <td className="table-cell whitespace-nowrap text-sm text-slate-700">{formatDateTime(request.expiresAt)}</td>
                      <td className="table-cell whitespace-nowrap text-right">
                        <button type="button" className="btn-secondary" onClick={() => handleCopyLink(request.token)}>
                          <Copy size={14} />
                          {t('security.copyLink')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
