import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Badge } from '../ui/Badge.jsx';
import { Alert } from '../ui/Alert.jsx';
import { UserAvatar } from '../ui/UserAvatar.jsx';
import { usersApi } from '../../api/users.js';

const STATUS_TONE = { pending: 'warning', active: 'success', inactive: 'neutral', locked: 'danger' };
const dateFmt = new Intl.DateTimeFormat('en-US', { dateStyle: 'long' });

export function UserProfileModal({ open, onClose, user, roles, canManage, isSelf, onChanged }) {
  const [roleError, setRoleError] = useState(null);
  const [statusError, setStatusError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const handleRoleChange = async (e) => {
    setRoleError(null);
    setBusy(true);
    try {
      const updated = await usersApi.updateRole(user.id, e.target.value);
      onChanged(updated.data);
    } catch (err) {
      setRoleError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async () => {
    setStatusError(null);
    setBusy(true);
    try {
      const updated = await usersApi.updateStatus(user.id, user.status === 'active' ? 'inactive' : 'active');
      onChanged(updated.data);
    } catch (err) {
      setStatusError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="User profile">
      <div className="flex items-center gap-4">
        <UserAvatar user={user} size={64} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-lg font-semibold text-slate-900 dark:text-slate-100">{user.firstName} {user.lastName}</p>
            <Badge tone={STATUS_TONE[user.status] ?? 'neutral'}>{user.status}</Badge>
          </div>
          <p className="truncate text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-slate-500 dark:text-slate-400">Phone</dt>
          <dd className="text-slate-900 dark:text-slate-100">{user.phone ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-slate-500 dark:text-slate-400">Email verified</dt>
          <dd className="text-slate-900 dark:text-slate-100">{user.emailVerified ? 'Yes' : 'No'}</dd>
        </div>
        <div>
          <dt className="text-slate-500 dark:text-slate-400">MFA</dt>
          <dd className="text-slate-900 dark:text-slate-100">{user.mfaEnabled ? 'Enabled' : 'Disabled'}</dd>
        </div>
        <div>
          <dt className="text-slate-500 dark:text-slate-400">Last login</dt>
          <dd className="text-slate-900 dark:text-slate-100">{user.lastLoginAt ? dateFmt.format(new Date(user.lastLoginAt)) : 'Never'}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-slate-500 dark:text-slate-400">Created</dt>
          <dd className="text-slate-900 dark:text-slate-100">{dateFmt.format(new Date(user.createdAt))}</dd>
        </div>
      </dl>

      {canManage && !isSelf && (
        <div className="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-4 dark:border-slate-800">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="user-role-select">Role</label>
            <select
              id="user-role-select"
              value={user.roles?.[0] ?? ''}
              onChange={handleRoleChange}
              disabled={busy}
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              {roles.map((r) => <option key={r.id} value={r.name}>{r.name.replace(/_/g, ' ')}</option>)}
            </select>
            {roleError && <Alert variant="error" className="mt-2">{roleError}</Alert>}
          </div>

          {['active', 'inactive', 'locked'].includes(user.status) && (
            <div>
              {statusError && <Alert variant="error" className="mb-2">{statusError}</Alert>}
              <Button variant={user.status === 'active' ? 'danger' : 'primary'} onClick={toggleStatus} loading={busy} className="w-full">
                <LogOut size={15} aria-hidden="true" />
                {user.status === 'active' ? 'Deactivate account' : 'Activate account'}
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
}
