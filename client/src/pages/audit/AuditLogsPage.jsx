import { useCallback, useEffect, useState } from 'react';
import { History, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { Card, CardBody } from '../../components/ui/Card.jsx';
import { Field } from '../../components/ui/Input.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { LoadingState } from '../../components/ui/Spinner.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { auditLogsApi } from '../../api/auditLogs.js';

const dateTimeFmt = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'medium' });

function AuditLogRow({ entry }) {
  const [open, setOpen] = useState(false);
  const hasDetail = entry.oldValues || entry.newValues;

  return (
    <li className="px-6 py-3">
      <button
        type="button"
        onClick={() => hasDetail && setOpen((o) => !o)}
        className={clsx('flex w-full items-start justify-between gap-4 text-left', hasDetail && 'cursor-pointer')}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-medium text-slate-900 dark:text-slate-100">{entry.action}</span>
            {entry.entityType && (
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                {entry.entityType}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {entry.user ? `${entry.user.firstName} ${entry.user.lastName} (${entry.user.email})` : 'System'}
            {entry.ipAddress && <> · {entry.ipAddress}</>}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="whitespace-nowrap text-xs text-slate-400">{dateTimeFmt.format(new Date(entry.timestamp))}</span>
          {hasDetail && <ChevronDown size={14} className={clsx('text-slate-400 transition-transform', open && 'rotate-180')} aria-hidden="true" />}
        </div>
      </button>
      {open && hasDetail && (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {entry.oldValues && (
            <div>
              <p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">Before</p>
              <pre className="overflow-x-auto rounded-lg bg-slate-100 p-3 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">{JSON.stringify(entry.oldValues, null, 2)}</pre>
            </div>
          )}
          {entry.newValues && (
            <div>
              <p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">After</p>
              <pre className="overflow-x-auto rounded-lg bg-slate-100 p-3 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">{JSON.stringify(entry.newValues, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

export default function AuditLogsPage() {
  const [entries, setEntries] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    auditLogsApi.list({
      page, pageSize: 20,
      action: action || undefined, entityType: entityType || undefined,
      from: from || undefined, to: to || undefined,
    })
      .then((res) => { setEntries(res.data); setMeta(res.meta); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page, action, entityType, from, to]);

  useEffect(() => { load(); }, [load]);

  const onFilterSubmit = (e) => { e.preventDefault(); setPage(1); load(); };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Audit logs</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">A record of who did what, organization-wide.</p>
      </div>

      <Card>
        <CardBody>
          <form onSubmit={onFilterSubmit} className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <Field label="Action" placeholder="e.g. lease.activated" className="sm:w-56" value={action} onChange={(e) => setAction(e.target.value)} />
            <Field label="Entity type" placeholder="e.g. lease" className="sm:w-48" value={entityType} onChange={(e) => setEntityType(e.target.value)} />
            <Field label="From" type="date" className="sm:w-48" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Field label="To" type="date" className="sm:w-48" value={to} onChange={(e) => setTo(e.target.value)} />
            <Button type="submit" variant="secondary">Filter</Button>
          </form>
        </CardBody>
      </Card>

      {error && <Alert variant="error">{error}</Alert>}

      <Card>
        {loading ? (
          <LoadingState label="Loading audit logs…" />
        ) : entries.length === 0 ? (
          <CardBody className="flex flex-col items-center gap-2 py-16 text-center">
            <History size={28} className="text-slate-300 dark:text-slate-700" aria-hidden="true" />
            <p className="text-sm text-slate-500 dark:text-slate-400">No audit log entries found.</p>
          </CardBody>
        ) : (
          <>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {entries.map((entry) => <AuditLogRow key={entry.id} entry={entry} />)}
            </ul>
            <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} pageSize={meta.pageSize} onPageChange={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
