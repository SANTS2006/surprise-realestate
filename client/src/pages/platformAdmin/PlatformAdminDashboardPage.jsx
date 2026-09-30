import { useCallback, useEffect, useState } from 'react';
import { Building2, Plus, LogOut, ExternalLink, ShieldCheck, ShieldOff, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table.jsx';
import { LoadingState } from '../../components/ui/Spinner.jsx';
import { ThemeToggle } from '../../components/ui/ThemeToggle.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { usePlatformAdmin } from '../../contexts/PlatformAdminContext.jsx';
import { useBranding } from '../../contexts/BrandingContext.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { platformAdminApi } from '../../api/platformAdmin.js';
import { CreateOrganizationModal } from './CreateOrganizationModal.jsx';

const APP_ORIGIN = window.location.origin;

export default function PlatformAdminDashboardPage() {
  const { enterPlatformMode, leavePlatformMode } = useBranding();
  useEffect(() => {
    enterPlatformMode();
    return leavePlatformMode;
  }, [enterPlatformMode, leavePlatformMode]);
  useDocumentTitle('Organizations — Platform Admin');
  const { admin, logout } = usePlatformAdmin();
  const [organizations, setOrganizations] = useState(null);
  const [error, setError] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState(null); // { org, nextStatus }
  const [justCreated, setJustCreated] = useState(null);

  const load = useCallback(() => {
    setError(null);
    platformAdminApi.listOrganizations()
      .then((res) => setOrganizations(res.data))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  const onCreated = ({ organization, loginUrl }) => {
    setJustCreated({ organization, loginUrl });
    load();
  };

  const confirmStatusChange = async () => {
    if (!pendingStatusChange) return;
    await platformAdminApi.setOrganizationStatus(pendingStatusChange.org.id, pendingStatusChange.nextStatus);
    load();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-accent-600 text-white">
            <ShieldCheck size={18} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">NTS Real Estate System</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Platform Admin</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-slate-500 dark:text-slate-400 sm:inline">{admin?.email}</span>
          <ThemeToggle />
          <Button variant="secondary" size="sm" onClick={logout} className="whitespace-nowrap">
            <LogOut size={15} aria-hidden="true" />
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <PageHeader
          icon={Building2}
          eyebrow="Platform"
          title="Organizations"
          description="Every real estate company running on NTS Real Estate System."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus size={16} aria-hidden="true" />
              Add organization
            </Button>
          }
        />

        {justCreated && (
          <Alert variant="success" className="mt-6" title={`${justCreated.organization.name} created`}>
            <p>The administrator has been emailed their login details.</p>
            <a href={justCreated.loginUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 font-medium underline">
              Open their login page <ExternalLink size={13} aria-hidden="true" />
            </a>
          </Alert>
        )}

        {error && <Alert variant="error" className="mt-6">{error}</Alert>}

        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          {organizations === null && !error && <div className="p-8"><LoadingState label="Loading organizations…" /></div>}

          {organizations?.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
              <Building2 size={32} className="text-slate-300 dark:text-slate-700" aria-hidden="true" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No organizations yet</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Add the first one to get started.</p>
            </div>
          )}

          {organizations && organizations.length > 0 && (
            <Table>
              <Thead>
                <Tr>
                  <Th>Organization</Th>
                  <Th>URL</Th>
                  <Th>Status</Th>
                  <Th>Created</Th>
                  <Th className="text-right">Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {organizations.map((org) => (
                  <Tr key={org.id}>
                    <Td>
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: org.primaryColor }} aria-hidden="true" />
                        <span className="font-medium text-slate-900 dark:text-slate-100">{org.name}</span>
                      </div>
                    </Td>
                    <Td>
                      <a href={`${APP_ORIGIN}/${org.slug}/login`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-brand-600 hover:underline dark:text-brand-400">
                        /{org.slug} <ExternalLink size={12} aria-hidden="true" />
                      </a>
                    </Td>
                    <Td>
                      <Badge tone={org.status === 'active' ? 'success' : 'danger'}>
                        {org.status === 'active' ? 'Active' : 'Deactivated'}
                      </Badge>
                    </Td>
                    <Td>{new Date(org.createdAt).toLocaleDateString()}</Td>
                    <Td className="text-right">
                      {org.status === 'active' ? (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setPendingStatusChange({ org, nextStatus: 'suspended' })}
                        >
                          <ShieldOff size={14} aria-hidden="true" />
                          Deactivate
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setPendingStatusChange({ org, nextStatus: 'active' })}
                        >
                          <CheckCircle2 size={14} aria-hidden="true" />
                          Reactivate
                        </Button>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </div>
      </main>

      <CreateOrganizationModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={onCreated} />

      <ConfirmDialog
        open={Boolean(pendingStatusChange)}
        onClose={() => setPendingStatusChange(null)}
        onConfirm={confirmStatusChange}
        title={pendingStatusChange?.nextStatus === 'active' ? 'Reactivate organization?' : 'Deactivate organization?'}
        description={
          pendingStatusChange?.nextStatus === 'active'
            ? `${pendingStatusChange?.org.name} will be able to sign in again.`
            : `${pendingStatusChange?.org.name} will lose all access immediately — no one there will be able to sign in until you reactivate it.`
        }
        confirmLabel={pendingStatusChange?.nextStatus === 'active' ? 'Reactivate' : 'Deactivate'}
        variant={pendingStatusChange?.nextStatus === 'active' ? 'primary' : 'danger'}
      />
    </div>
  );
}
