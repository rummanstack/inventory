import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2, UserCog } from 'lucide-react';
import { Alert, Badge, EmptyState, SectionHeader, TableSkeleton } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import UserFormModal from '../components/UserFormModal';

const MANAGEABLE_ROLES = {
  system_developer: ['super_admin', 'admin', 'manager', 'operator'],
  super_admin: ['super_admin', 'admin', 'manager', 'operator'],
};

export default function UsersPage() {
  const { t, user: actor, confirm, pushToast } = useInventoryApp();
  const isSystemDeveloper = actor?.role === 'system_developer';
  const manageableRoles = MANAGEABLE_ROLES[actor?.role] || ['admin', 'manager', 'operator'];
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userModal, setUserModal] = useState(null);

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
    if (!(await confirm({
      title: t('users.deleteTitle'),
      description: t('users.deleteConfirm', { name: user.name }).replace('{name}', user.name),
      confirmLabel: t('common.delete'),
      tone: 'rose',
    }))) {
      return;
    }

    try {
      const result = await inventoryApi.deleteUser(user.id);
      setUsers(result.users || []);
      pushToast('success', t('common.delete'), `${user.name} ${t('alerts.deleted')}`);
    } catch (err) {
      const message = err?.message || t('users.deleteFailed');
      setError(message);
      pushToast('error', t('alerts.deleteFailed'), message);
    }
  }

  return (
    <div>
      <SectionHeader
        eyebrow={t('users.eyebrow')}
        title={t('users.title')}
        description={t('users.description')}
        action={(
          <button type="button" className="btn-primary" onClick={() => setUserModal({ mode: 'add' })}>
            <Plus size={18} />
            {t('users.add')}
          </button>
        )}
      />

      <div className="surface overflow-hidden">
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
                  <th className="px-4 py-3 text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="table-cell font-semibold text-slate-950">{user.name}</td>
                    <td className="table-cell">{user.email}</td>
                    {isSystemDeveloper ? <td className="table-cell">{user.tenantName || user.tenantId}</td> : null}
                    <td className="table-cell">
                      <Badge tone="slate">{t(`permissions.roles.${user.role}`) || user.role}</Badge>
                    </td>
                    <td className="table-cell">
                      <Badge tone={user.status === 'active' ? 'emerald' : 'rose'}>
                        {user.status === 'active' ? t('users.statusActive') : t('users.statusInactive')}
                      </Badge>
                    </td>
                    <td className="table-cell">
                      <div className="flex justify-end gap-2">
                        {manageableRoles.includes(user.role) ? (
                          <>
                            <button type="button" className="icon-btn" title={t('common.edit')} onClick={() => setUserModal({ mode: 'edit', user })}>
                              <Pencil size={16} />
                            </button>
                            {user.id !== actor?.id ? (
                              <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" title={t('common.delete')} onClick={() => handleDelete(user)}>
                                <Trash2 size={16} />
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
    </div>
  );
}
