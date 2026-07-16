import { useEffect, useState } from 'react';
import { Copy, KeyRound, Loader2, Pencil, Plus, Trash2, UserCog, Unlock } from 'lucide-react';
import { Alert, Avatar, Badge, EmptyState, Modal, SectionHeader, TableSkeleton } from '../../../components/ui.jsx';
import TableReportActions from '../../../components/TableReportActions.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import UserFormModal from '../components/UserFormModal';
import { canManageUser, getAssignableRoles } from '../userRoleHierarchy.js';

const USERS_REPORT_ID = 'users-report';
const USERS_ADD_SHORTCUT = { alt: true, key: 'a', label: 'Alt+A' };
const USERS_REPORT_SHORTCUTS = {
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

export default function UsersPage() {
  const { t, user: actor, confirm, pushToast } = useInventoryApp();
  const isSystemDeveloper = actor?.role === 'system_developer';
  const assignableRoles = getAssignableRoles(actor?.role);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userModal, setUserModal] = useState(null);
  const [tempPassword, setTempPassword] = useState(null);
  const [copied, setCopied] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState(null);

  async function load() {
    try {
      setLoading(true);
      const result = await inventoryApi.listUsers();
      setUsers(result.users || []);
      setError('');
    } catch (err) {
      setError(err?.message || t('users.loadFailed'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave(user) {
    try {
      const result = user.id ? await inventoryApi.updateUser(user.id, user) : await inventoryApi.createUser(user);
      setUsers(result.users || []);
      pushToast('success', user.id ? t('users.editTitle') : t('users.addTitle'), `${user.name} ${user.id ? t('alerts.updated') : t('alerts.created')}`);
      return { ok: true };
    } catch (err) {
      const message = err?.message || t('users.saveFailed');
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function handleDelete(user) {
    const { confirmed } = await confirm({
      title: t('users.deleteTitle'),
      description: t('users.deleteConfirm', { name: user.name }).replace('{name}', user.name),
      confirmLabel: t('common.delete'),
      tone: 'rose',
    });
    if (!confirmed) {
      return;
    }

    setDeletingUserId(user.id);
    try {
      const result = await inventoryApi.deleteUser(user.id);
      setUsers(result.users || []);
      pushToast('success', t('common.delete'), `${user.name} ${t('alerts.deleted')}`);
    } catch (err) {
      const message = err?.message || t('users.deleteFailed');
      setError(message);
      pushToast('error', t('alerts.deleteFailed'), message);
    } finally {
      setDeletingUserId(null);
    }
  }

  async function handleResetPassword(user) {
    const { confirmed } = await confirm({
      title: t('users.resetPassword'),
      description: t('users.resetPasswordConfirm', { name: user.name }).replace('{name}', user.name),
      confirmLabel: t('users.resetPassword'),
      tone: 'amber',
    });
    if (!confirmed) {
      return;
    }

    try {
      const result = await inventoryApi.adminResetUserPassword(user.id);
      setUsers(result.users || []);
      setCopied(false);
      setTempPassword({ name: user.name, password: result.tempPassword });
      pushToast('success', t('users.resetPassword'), t('users.resetPasswordSuccess'));
    } catch (err) {
      const message = err?.message || t('users.saveFailed');
      pushToast('error', t('alerts.requestFailed'), message);
    }
  }

  async function handleUnlock(user) {
    const { confirmed } = await confirm({
      title: t('users.unlock'),
      description: t('users.unlockConfirm', { name: user.name }).replace('{name}', user.name),
      confirmLabel: t('users.unlock'),
      tone: 'amber',
    });
    if (!confirmed) {
      return;
    }

    try {
      const result = await inventoryApi.unlockUser(user.id);
      setUsers(result.users || []);
      pushToast('success', t('users.unlock'), t('users.unlockSuccess'));
    } catch (err) {
      const message = err?.message || t('users.saveFailed');
      pushToast('error', t('alerts.requestFailed'), message);
    }
  }

  async function handleCopyTempPassword() {
    try {
      await navigator.clipboard.writeText(tempPassword.password);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  useEffect(() => {
    function handleKeyDown(event) {
      if (matchesShortcut(event, USERS_ADD_SHORTCUT) && assignableRoles.length && !userModal) {
        event.preventDefault();
        setUserModal({ mode: 'add' });
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [assignableRoles.length, userModal]);

  return (
    <div>
      <SectionHeader
        eyebrow={t('users.eyebrow')}
        title={t('users.title')}
        description={t('users.description')}
        action={assignableRoles.length ? (
          <button type="button" className="btn-primary" onClick={() => setUserModal({ mode: 'add' })}>
            <Plus size={18} />
            {t('users.add')}
            <kbd className="ml-1 rounded border border-indigo-400/40 bg-indigo-500/20 px-1 py-0.5 font-mono text-[10px] text-indigo-200">Alt+A</kbd>
          </button>
        ) : null}
      />

      <div id={USERS_REPORT_ID} className="surface overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 no-print">
          <span className="text-sm font-bold text-slate-700">{t('users.title')}</span>
          <TableReportActions targetId={USERS_REPORT_ID} title={t('users.title')} fileName="users" entityType="users" t={t} shortcuts={USERS_REPORT_SHORTCUTS} />
        </div>
        {loading ? (
          <div className="p-5">
            <TableSkeleton columns={isSystemDeveloper ? 6 : 5} showHeader={false} />
          </div>
        ) : error ? (
          <div className="p-5">
            <Alert type="error">{error}</Alert>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">{t('users.name')}</th>
                  <th className="px-4 py-3">{t('users.email')}</th>
                  {isSystemDeveloper ? <th className="px-4 py-3">{t('users.tenant')}</th> : null}
                  <th className="px-4 py-3">{t('users.role')}</th>
                  <th className="px-4 py-3">{t('users.status')}</th>
                  <th className="px-4 py-3 text-right no-print">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="table-cell font-semibold text-slate-950">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={user.name} imageUrl={user.avatarUrl} size={28} />
                        {user.name}
                      </div>
                    </td>
                    <td className="table-cell">{user.email}</td>
                    {isSystemDeveloper ? <td className="table-cell">{user.tenantName || user.tenantId}</td> : null}
                    <td className="table-cell no-print">
                      <Badge tone="slate">{t(`permissions.roles.${user.role}`) || user.role}</Badge>
                    </td>
                    <td className="table-cell">
                      <div className="flex flex-wrap gap-1">
                        <Badge tone={user.status === 'active' ? 'emerald' : 'rose'}>
                          {user.status === 'active' ? t('users.statusActive') : t('users.statusInactive')}
                        </Badge>
                        {user.lockedUntil && new Date(user.lockedUntil) > new Date() ? (
                          <Badge tone="rose">{t('users.locked')}</Badge>
                        ) : null}
                        {user.mustChangePassword ? <Badge tone="amber">{t('users.mustChangePasswordBadge')}</Badge> : null}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="row-actions flex justify-end gap-2">
                        {canManageUser(actor, user) ? (
                          <>
                            <button type="button" className="icon-btn" title={t('common.edit')} onClick={() => setUserModal({ mode: 'edit', user })}>
                              <Pencil size={16} />
                            </button>
                            <button type="button" className="icon-btn" title={t('users.resetPassword')} onClick={() => handleResetPassword(user)}>
                              <KeyRound size={16} />
                            </button>
                            {user.lockedUntil && new Date(user.lockedUntil) > new Date() ? (
                              <button type="button" className="icon-btn" title={t('users.unlock')} onClick={() => handleUnlock(user)}>
                                <Unlock size={16} />
                              </button>
                            ) : null}
                            {user.id !== actor?.id ? (
                              <button
                                type="button"
                                className="icon-btn text-rose-600 hover:text-rose-700 disabled:opacity-50"
                                title={t('common.delete')}
                                onClick={() => handleDelete(user)}
                                disabled={deletingUserId === user.id}
                              >
                                {deletingUserId === user.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                              </button>
                            ) : null}
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
        {!loading && !error && !users.length ? (
          <div className="p-5">
            <EmptyState title={t('users.noMatchTitle')} description={t('users.noMatchDescription')} icon={UserCog} />
          </div>
        ) : null}
      </div>

      {userModal ? (
        <UserFormModal
          user={userModal.user}
          onClose={() => setUserModal(null)}
          onSave={async (value) => {
            const result = await handleSave(value);
            if (result.ok) {
              setUserModal(null);
            }
            return result;
          }}
        />
      ) : null}

      {tempPassword ? (
        <Modal title={t('users.tempPasswordTitle')} description={tempPassword.name} onClose={() => setTempPassword(null)} width="max-w-md">
          <div className="space-y-4">
            <Alert type="warning">{t('users.tempPasswordDescription')}</Alert>
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <code className="text-lg font-bold tracking-wide text-slate-950">{tempPassword.password}</code>
              <button type="button" className="btn-secondary" onClick={handleCopyTempPassword}>
                <Copy size={16} />
                {copied ? t('users.copied') : t('users.copyPassword')}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
