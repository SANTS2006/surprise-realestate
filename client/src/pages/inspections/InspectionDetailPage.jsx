import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, MapPin, Calendar, UserCog, Mail, Phone, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { LoadingState } from '../../components/ui/Spinner.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { Field, TextareaField } from '../../components/ui/Input.jsx';
import { MediaGallery } from '../../components/media/MediaGallery.jsx';
import { inspectionsApi } from '../../api/inspections.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { CAN_MANAGE_OPERATIONS, CAN_UPLOAD_DOCUMENTS, CAN_DELETE_DOCUMENTS, canAny } from '../../config/capabilities.js';

const STATUS_TONE = { scheduled: 'brand', in_progress: 'warning', completed: 'success', cancelled: 'neutral' };
const dateFmt = new Intl.DateTimeFormat('en-US', { dateStyle: 'long' });

export default function InspectionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const canManage = canAny(roles, CAN_MANAGE_OPERATIONS);
  const canUploadMedia = canAny(roles, CAN_UPLOAD_DOCUMENTS);
  const canDeleteMedia = canAny(roles, CAN_DELETE_DOCUMENTS);

  const [inspection, setInspection] = useState(null);
  const [error, setError] = useState(null);
  const [serverError, setServerError] = useState(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  const load = useCallback(() => {
    inspectionsApi.get(id)
      .then((res) => {
        setInspection(res.data);
        reset({ condition: res.data.condition ?? '', notes: res.data.notes ?? '' });
      })
      .catch((err) => setError(err.message));
  }, [id, reset]);

  useEffect(() => { load(); }, [load]);

  const saveRemarks = async (values) => {
    setServerError(null);
    try {
      await inspectionsApi.update(id, values);
      load();
    } catch (err) {
      setServerError(err.details?.map((d) => d.message).join(' ') || err.message);
    }
  };

  const completeInspection = async (values) => {
    setServerError(null);
    try {
      await inspectionsApi.complete(id, values);
      load();
    } catch (err) {
      setServerError(err.details?.map((d) => d.message).join(' ') || err.message);
    }
  };

  if (error && !inspection) return <Alert variant="error">{error}</Alert>;
  if (!inspection) return <LoadingState label="Loading inspection…" />;

  const isEditable = ['scheduled', 'in_progress'].includes(inspection.status);

  return (
    <div className="flex flex-col gap-6">
      <Link to="/inspections" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
        <ArrowLeft size={14} aria-hidden="true" />
        Back to inspections
      </Link>

      {error && <Alert variant="error">{error}</Alert>}
      {serverError && <Alert variant="error">{serverError}</Alert>}

      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold capitalize text-slate-900 dark:text-slate-100">{inspection.type.replace('_', ' ')} inspection</h1>
            <Badge tone={STATUS_TONE[inspection.status] ?? 'neutral'}>{inspection.status.replace('_', ' ')}</Badge>
          </div>
          <p className="mt-1 flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
            <MapPin size={14} aria-hidden="true" />
            {inspection.propertyName ?? 'Unknown property'}{inspection.unitNumber ? ` — Unit ${inspection.unitNumber}` : ''}
          </p>
        </div>
        {canManage && isEditable && (
          <Button variant="danger" onClick={() => setCancelOpen(true)}>
            <XCircle size={15} aria-hidden="true" />
            Cancel inspection
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Details</h2>
        </CardHeader>
        <CardBody className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="flex items-center gap-1 text-slate-500 dark:text-slate-400"><Calendar size={13} aria-hidden="true" />Date</dt>
            <dd className="mt-0.5 text-slate-900 dark:text-slate-100">{dateFmt.format(new Date(inspection.inspectionDate))}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1 text-slate-500 dark:text-slate-400"><UserCog size={13} aria-hidden="true" />Inspector</dt>
            <dd className="mt-0.5 text-slate-900 dark:text-slate-100">{inspection.inspectorName ?? 'Unassigned'}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Type</dt>
            <dd className="mt-0.5 capitalize text-slate-900 dark:text-slate-100">{inspection.type.replace('_', ' ')}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Condition</dt>
            <dd className="mt-0.5 text-slate-900 dark:text-slate-100">{inspection.condition || 'Not assessed'}</dd>
          </div>
        </CardBody>
      </Card>

      {inspection.tenant && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Resident</h2>
          </CardHeader>
          <CardBody className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <span className="font-medium text-slate-900 dark:text-slate-100">{inspection.tenant.name}</span>
            {inspection.tenant.email && (
              <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <Mail size={13} aria-hidden="true" />{inspection.tenant.email}
              </span>
            )}
            {inspection.tenant.phone && (
              <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <Phone size={13} aria-hidden="true" />{inspection.tenant.phone}
              </span>
            )}
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Photos &amp; videos</h2>
        </CardHeader>
        <CardBody>
          <MediaGallery entityType="inspection" entityId={id} canUpload={canUploadMedia} canDelete={canDeleteMedia} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Remarks</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">The assigned inspector's condition assessment and notes.</p>
        </CardHeader>
        <CardBody>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(canManage && isEditable ? saveRemarks : () => {})}>
            <Field
              label="Condition"
              placeholder="e.g. Good, Fair, Needs repair"
              disabled={!canManage || !isEditable}
              {...register('condition')}
            />
            <TextareaField
              label="Notes"
              rows={5}
              disabled={!canManage || !isEditable}
              placeholder="Describe what was observed during the inspection…"
              {...register('notes')}
            />
            {canManage && isEditable && (
              <div className="flex flex-wrap justify-end gap-3">
                <Button type="submit" variant="secondary" loading={isSubmitting}>Save remarks</Button>
                <Button type="button" loading={isSubmitting} onClick={handleSubmit(completeInspection)}>
                  <CheckCircle2 size={15} aria-hidden="true" />
                  Complete inspection
                </Button>
              </div>
            )}
          </form>
        </CardBody>
      </Card>

      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={async () => { await inspectionsApi.cancel(id); navigate('/inspections', { replace: true }); }}
        title="Cancel inspection?"
        description="This cannot be undone."
        confirmLabel="Cancel inspection"
      />
    </div>
  );
}
