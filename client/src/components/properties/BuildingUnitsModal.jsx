import { useCallback, useEffect, useState } from 'react';
import { Plus, DoorOpen } from 'lucide-react';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Spinner } from '../ui/Spinner.jsx';
import { Alert } from '../ui/Alert.jsx';
import { UnitCard } from './UnitCard.jsx';
import { UnitFormModal } from './UnitFormModal.jsx';
import { MediaGallery } from '../media/MediaGallery.jsx';
import { unitsApi } from '../../api/units.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { CAN_MANAGE_UNITS, CAN_UPLOAD_DOCUMENTS, CAN_DELETE_DOCUMENTS, canAny } from '../../config/capabilities.js';

// Full-screen-ish (xl) modal that replaces the old inline accordion: opened
// from a BuildingCard, it shows that building's units as an image-card grid
// with the same stats-forward layout used for properties/tenants/owners.
export function BuildingUnitsModal({ open, onClose, building, onUnitsChanged }) {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const canManage = canAny(roles, CAN_MANAGE_UNITS);
  const canUploadMedia = canAny(roles, CAN_UPLOAD_DOCUMENTS);
  const canDeleteMedia = canAny(roles, CAN_DELETE_DOCUMENTS);

  const [units, setUnits] = useState(null);
  const [error, setError] = useState(null);
  const [formState, setFormState] = useState(null); // null | 'new' | unit object
  const [mediaUnit, setMediaUnit] = useState(null);

  const loadUnits = useCallback(() => {
    if (!building) return;
    unitsApi.list(building.id)
      .then((res) => setUnits(res.data))
      .catch((err) => setError(err.message));
  }, [building]);

  useEffect(() => {
    if (open && building) { setUnits(null); loadUnits(); }
  }, [open, building, loadUnits]);

  if (!building) return null;

  const handleDelete = async (unitId) => {
    await unitsApi.remove(unitId);
    setUnits((prev) => prev.filter((u) => u.id !== unitId));
    onUnitsChanged();
  };

  const handleStatusChange = async (unitId, status) => {
    const updated = await unitsApi.setStatus(unitId, status);
    setUnits((prev) => prev.map((u) => (u.id === unitId ? updated.data : u)));
    onUnitsChanged();
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title={`${building.name} — Units`} description={building.code ? `${building.code}` : undefined} size="xl">
        {error && <Alert variant="error" className="mb-4">{error}</Alert>}

        <div className="mb-4 flex justify-end">
          {canManage && (
            <Button size="sm" onClick={() => setFormState('new')}>
              <Plus size={14} aria-hidden="true" />
              Add unit
            </Button>
          )}
        </div>

        {units === null ? (
          <div className="py-10"><Spinner label="Loading units…" /></div>
        ) : units.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <DoorOpen size={28} className="text-slate-300 dark:text-slate-700" aria-hidden="true" />
            <p className="text-sm text-slate-500 dark:text-slate-400">No units in this building yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {units.map((u) => (
              <UnitCard
                key={u.id}
                unit={u}
                canManage={canManage}
                onEdit={() => setFormState(u)}
                onDeleted={handleDelete}
                onStatusChanged={handleStatusChange}
                onOpenMedia={() => setMediaUnit(u)}
              />
            ))}
          </div>
        )}
      </Modal>

      <UnitFormModal
        open={Boolean(formState)}
        onClose={() => setFormState(null)}
        onSaved={() => { loadUnits(); onUnitsChanged(); }}
        buildingId={building.id}
        unit={formState === 'new' ? null : formState}
      />

      <Modal open={Boolean(mediaUnit)} onClose={() => setMediaUnit(null)} title={mediaUnit ? `Unit ${mediaUnit.unitNumber} — Photos & videos` : ''} size="lg">
        {mediaUnit && (
          <MediaGallery
            entityType="unit"
            entityId={mediaUnit.id}
            canUpload={canUploadMedia}
            canDelete={canDeleteMedia}
            onChange={() => { loadUnits(); onUnitsChanged(); }}
          />
        )}
      </Modal>
    </>
  );
}
