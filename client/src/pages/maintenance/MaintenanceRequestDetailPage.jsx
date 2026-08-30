import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, PlayCircle, CheckCircle2, XCircle, ClipboardList } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { LoadingState } from '../../components/ui/Spinner.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { MediaGallery } from '../../components/media/MediaGallery.jsx';
import { CreateWorkOrderModal } from '../../components/maintenance/CreateWorkOrderModal.jsx';
import { CompleteWorkOrderModal } from '../../components/maintenance/CompleteWorkOrderModal.jsx';
import { maintenanceApi } from '../../api/maintenance.js';
import { workOrdersApi } from '../../api/workOrders.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { CAN_MANAGE_OPERATIONS, CAN_UPLOAD_DOCUMENTS, CAN_DELETE_DOCUMENTS, canAny } from '../../config/capabilities.js';
import { formatCurrency } from '../../utils/currency.js';

const STATUS_TONE = { open: 'warning', in_review: 'brand', assigned: 'brand', scheduled: 'brand', in_progress: 'warning', completed: 'success', cancelled: 'neutral' };
const PRIORITY_TONE = { low: 'neutral', medium: 'brand', high: 'warning', emergency: 'danger' };
const WO_STATUS_TONE = { pending: 'neutral', scheduled: 'brand', in_progress: 'warning', completed: 'success', cancelled: 'neutral' };
const dateFmt = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });

export default function MaintenanceRequestDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const canManage = canAny(roles, CAN_MANAGE_OPERATIONS);
  const canUploadMedia = canAny(roles, CAN_UPLOAD_DOCUMENTS);
  const canDeleteMedia = canAny(roles, CAN_DELETE_DOCUMENTS);

  const [request, setRequest] = useState(null);
  const [workOrders, setWorkOrders] = useState(null);
  const [error, setError] = useState(null);
  const [createWOOpen, setCreateWOOpen] = useState(false);
  const [completeWO, setCompleteWO] = useState(null);
  const [cancelWO, setCancelWO] = useState(null);

  const loadRequest = useCallback(() => {
    maintenanceApi.get(id).then((res) => setRequest(res.data)).catch((err) => setError(err.message));
  }, [id]);

  const loadWorkOrders = useCallback(() => {
    maintenanceApi.listWorkOrders(id).then((res) => setWorkOrders(res.data)).catch((err) => setError(err.message));
  }, [id]);

  useEffect(() => { loadRequest(); loadWorkOrders(); }, [loadRequest, loadWorkOrders]);

  const startWorkOrder = async (wo) => {
    await workOrdersApi.start(wo.id);
    loadWorkOrders();
    loadRequest();
  };

  if (error && !request) return <Alert variant="error">{error}</Alert>;
  if (!request) return <LoadingState label="Loading maintenance request…" />;

  const canCreateWorkOrder = canManage && ['assigned', 'scheduled'].includes(request.status);

  return (
    <div className="flex flex-col gap-6">
      <Link to="/maintenance" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
        <ArrowLeft size={14} aria-hidden="true" />
        Back to maintenance requests
      </Link>

      {error && <Alert variant="error">{error}</Alert>}

      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{request.title}</h1>
          <Badge tone={PRIORITY_TONE[request.priority] ?? 'neutral'}>{request.priority}</Badge>
          <Badge tone={STATUS_TONE[request.status] ?? 'neutral'}>{request.status.replace('_', ' ')}</Badge>
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Reported {dateFmt.format(new Date(request.reportedAt))}</p>
      </div>

      {request.description && (
        <Card>
          <CardBody>
            <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{request.description}</p>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Photos &amp; videos</h2>
        </CardHeader>
        <CardBody>
          <MediaGallery entityType="maintenance_request" entityId={id} canUpload={canUploadMedia} canDelete={canDeleteMedia} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Work orders</h2>
          {canCreateWorkOrder && (
            <Button variant="secondary" size="sm" onClick={() => setCreateWOOpen(true)}>
              <Plus size={14} aria-hidden="true" />
              Add work order
            </Button>
          )}
        </CardHeader>
        <CardBody className="p-0">
          {workOrders === null ? (
            <div className="p-6"><LoadingState label="Loading work orders…" /></div>
          ) : workOrders.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <ClipboardList size={28} className="text-slate-300 dark:text-slate-700" aria-hidden="true" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {request.status === 'assigned' || request.status === 'scheduled' ? 'No work orders yet.' : 'A work order can be added once this request is assigned.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {workOrders.map((wo) => (
                <li key={wo.id} className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900 dark:text-slate-100">Work order</p>
                      <Badge tone={WO_STATUS_TONE[wo.status] ?? 'neutral'}>{wo.status.replace('_', ' ')}</Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                      {wo.scheduledDate ? `Scheduled ${dateFmt.format(new Date(wo.scheduledDate))}` : 'Not yet scheduled'}
                      {wo.estimatedCost != null && <> · Est. {formatCurrency(wo.estimatedCost)}</>}
                      {wo.actualCost != null && <> · Actual {formatCurrency(wo.actualCost)}</>}
                    </p>
                  </div>
                  {canManage && (
                    <div className="flex shrink-0 items-center gap-2">
                      {['pending', 'scheduled'].includes(wo.status) && (
                        <>
                          <Button size="sm" onClick={() => startWorkOrder(wo)}>
                            <PlayCircle size={14} aria-hidden="true" />
                            Start
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => setCancelWO(wo)}>
                            <XCircle size={14} aria-hidden="true" />
                            Cancel
                          </Button>
                        </>
                      )}
                      {wo.status === 'in_progress' && (
                        <Button size="sm" onClick={() => setCompleteWO(wo)}>
                          <CheckCircle2 size={14} aria-hidden="true" />
                          Complete
                        </Button>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <CreateWorkOrderModal open={createWOOpen} onClose={() => setCreateWOOpen(false)} onSaved={() => { loadWorkOrders(); loadRequest(); }} request={request} />
      <CompleteWorkOrderModal open={Boolean(completeWO)} onClose={() => setCompleteWO(null)} onSaved={() => { loadWorkOrders(); loadRequest(); }} workOrder={completeWO} />
      <ConfirmDialog
        open={Boolean(cancelWO)}
        onClose={() => setCancelWO(null)}
        onConfirm={async () => { await workOrdersApi.cancel(cancelWO.id); loadWorkOrders(); }}
        title="Cancel work order?"
        description="This cannot be undone."
        confirmLabel="Cancel work order"
      />
    </div>
  );
}
