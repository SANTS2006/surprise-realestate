import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Pencil, Archive, Plus, MapPin, Building2, Layers, Home, CheckCircle2 } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { LoadingState } from '../../components/ui/Spinner.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { StatCard } from '../../components/ui/StatCard.jsx';
import { PropertyFormModal } from '../../components/properties/PropertyFormModal.jsx';
import { BuildingFormModal } from '../../components/properties/BuildingFormModal.jsx';
import { BuildingCard } from '../../components/properties/BuildingCard.jsx';
import { BuildingUnitsModal } from '../../components/properties/BuildingUnitsModal.jsx';
import { MediaGallery } from '../../components/media/MediaGallery.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { propertiesApi } from '../../api/properties.js';
import { buildingsApi } from '../../api/buildings.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import {
  CAN_UPDATE_PROPERTIES, CAN_DELETE_PROPERTIES, CAN_MANAGE_BUILDINGS,
  CAN_UPLOAD_DOCUMENTS, CAN_DELETE_DOCUMENTS, canAny,
} from '../../config/capabilities.js';

const STATUS_TONE = { active: 'success', archived: 'neutral', under_construction: 'warning' };

export default function PropertyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const canUpdate = canAny(roles, CAN_UPDATE_PROPERTIES);
  const canDelete = canAny(roles, CAN_DELETE_PROPERTIES);
  const canManageBuildings = canAny(roles, CAN_MANAGE_BUILDINGS);
  const canUploadMedia = canAny(roles, CAN_UPLOAD_DOCUMENTS);
  const canDeleteMedia = canAny(roles, CAN_DELETE_DOCUMENTS);

  const [property, setProperty] = useState(null);
  const [buildings, setBuildings] = useState(null);
  const [error, setError] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [buildingFormState, setBuildingFormState] = useState(null); // null | 'new' | building object
  const [unitsBuilding, setUnitsBuilding] = useState(null);
  const [mediaBuilding, setMediaBuilding] = useState(null);

  const loadProperty = useCallback(() => {
    propertiesApi.get(id).then((res) => setProperty(res.data)).catch((err) => setError(err.message));
  }, [id]);

  const loadBuildings = useCallback(() => {
    buildingsApi.list(id).then((res) => setBuildings(res.data)).catch((err) => setError(err.message));
  }, [id]);

  useEffect(() => { loadProperty(); loadBuildings(); }, [loadProperty, loadBuildings]);

  if (error && !property) {
    return <Alert variant="error">{error}</Alert>;
  }

  if (!property) {
    return <LoadingState label="Loading property…" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link to="/properties" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
          <ArrowLeft size={14} aria-hidden="true" />
          Back to properties
        </Link>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{property.name}</h1>
            <Badge tone={STATUS_TONE[property.status] ?? 'neutral'}>{property.status.replace('_', ' ')}</Badge>
          </div>
          <p className="mt-1 flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
            <MapPin size={14} aria-hidden="true" />
            {[property.address, property.city, property.region, property.country].filter(Boolean).join(', ')}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {canUpdate && property.status !== 'archived' && (
            <Button variant="secondary" onClick={() => setEditOpen(true)}>
              <Pencil size={15} aria-hidden="true" />
              Edit
            </Button>
          )}
          {canDelete && property.status !== 'archived' && (
            <Button variant="danger" onClick={() => setArchiveOpen(true)}>
              <Archive size={15} aria-hidden="true" />
              Archive
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Details</h2>
        </CardHeader>
        <CardBody className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Property code</dt>
            <dd className="font-mono text-slate-900 dark:text-slate-100">{property.propertyCode}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Property type</dt>
            <dd className="capitalize text-slate-900 dark:text-slate-100">{property.propertyType}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Year built</dt>
            <dd className="text-slate-900 dark:text-slate-100">{property.yearBuilt ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Coordinates</dt>
            <dd className="text-slate-900 dark:text-slate-100">
              {property.latitude != null && property.longitude != null ? `${property.latitude}, ${property.longitude}` : '—'}
            </dd>
          </div>
          {property.description && (
            <div className="col-span-2 sm:col-span-4">
              <dt className="text-slate-500 dark:text-slate-400">Description</dt>
              <dd className="whitespace-pre-wrap text-slate-900 dark:text-slate-100">{property.description}</dd>
            </div>
          )}
        </CardBody>
      </Card>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={Layers} label="Buildings" value={buildings?.length ?? '—'} tone="brand" />
        <StatCard icon={Home} label="Total units" value={property.unitSummary.total} tone="brand" />
        <StatCard icon={CheckCircle2} label="Occupied" value={property.unitSummary.occupied} tone="warning" />
        <StatCard icon={Home} label="Available" value={property.unitSummary.available} tone="success" />
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Photos &amp; videos</h2>
        </CardHeader>
        <CardBody>
          <MediaGallery entityType="property" entityId={id} canUpload={canUploadMedia} canDelete={canDeleteMedia} />
        </CardBody>
      </Card>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Buildings</h2>
          {canManageBuildings && (
            <Button variant="secondary" size="sm" onClick={() => setBuildingFormState('new')}>
              <Plus size={14} aria-hidden="true" />
              Add building
            </Button>
          )}
        </div>

        {buildings === null ? (
          <Card><LoadingState label="Loading buildings…" /></Card>
        ) : buildings.length === 0 ? (
          <Card>
            <CardBody className="flex flex-col items-center gap-2 py-16 text-center">
              <Building2 size={28} className="text-slate-300 dark:text-slate-700" aria-hidden="true" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No buildings yet.</p>
            </CardBody>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {buildings.map((b) => (
              <BuildingCard
                key={b.id}
                building={b}
                canManage={canManageBuildings}
                onOpenUnits={() => setUnitsBuilding(b)}
                onEdit={() => setBuildingFormState(b)}
                onOpenMedia={() => setMediaBuilding(b)}
                onDeleted={async (bid) => {
                  await buildingsApi.remove(bid);
                  setBuildings((prev) => prev.filter((x) => x.id !== bid));
                  loadProperty();
                }}
              />
            ))}
          </div>
        )}
      </div>

      <PropertyFormModal open={editOpen} onClose={() => setEditOpen(false)} onSaved={loadProperty} property={property} />
      <BuildingFormModal
        open={Boolean(buildingFormState)}
        onClose={() => setBuildingFormState(null)}
        onSaved={() => { loadBuildings(); loadProperty(); }}
        propertyId={id}
        building={buildingFormState === 'new' ? null : buildingFormState}
      />
      <BuildingUnitsModal
        open={Boolean(unitsBuilding)}
        onClose={() => setUnitsBuilding(null)}
        building={unitsBuilding}
        onUnitsChanged={() => { loadBuildings(); loadProperty(); }}
      />
      <Modal open={Boolean(mediaBuilding)} onClose={() => setMediaBuilding(null)} title={mediaBuilding ? `${mediaBuilding.name} — Photos & videos` : ''} size="lg">
        {mediaBuilding && <MediaGallery entityType="building" entityId={mediaBuilding.id} canUpload={canUploadMedia} canDelete={canDeleteMedia} />}
      </Modal>
      <ConfirmDialog
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        onConfirm={async () => { await propertiesApi.archive(id); navigate('/properties', { replace: true }); }}
        title="Archive property?"
        description={`This will archive "${property.name}". It can still be viewed but will no longer appear as active.`}
        confirmLabel="Archive"
      />
    </div>
  );
}
