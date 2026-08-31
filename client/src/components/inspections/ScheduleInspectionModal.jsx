import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, UserCheck, UserX } from 'lucide-react';
import { Modal } from '../ui/Modal.jsx';
import { Field, SelectField } from '../ui/Input.jsx';
import { Button } from '../ui/Button.jsx';
import { Alert } from '../ui/Alert.jsx';
import { PendingMediaPicker } from '../media/PendingMediaPicker.jsx';
import { inspectionsApi } from '../../api/inspections.js';
import { propertiesApi } from '../../api/properties.js';
import { buildingsApi } from '../../api/buildings.js';
import { unitsApi } from '../../api/units.js';
import { documentsApi } from '../../api/documents.js';
import { tenantsApi } from '../../api/tenants.js';
import { inspectionScheduleFormSchema, INSPECTION_TYPES } from '../../validations/inspection.js';

export function ScheduleInspectionModal({ open, onClose, onSaved }) {
  const [serverError, setServerError] = useState(null);
  const [properties, setProperties] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [units, setUnits] = useState([]);
  const [staff, setStaff] = useState([]);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [unitTenant, setUnitTenant] = useState(undefined); // undefined = not checked yet, null = checked, none found

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(inspectionScheduleFormSchema) });
  const propertyId = watch('propertyId');
  const buildingId = watch('buildingId');
  const unitId = watch('unitId');

  // Auto-loads the current resident of the selected unit so the person
  // scheduling can see who's about to be emailed — the actual notification
  // is sent server-side once the inspection is created (see
  // inspection.service.js#scheduleInspection).
  useEffect(() => {
    if (!unitId) { setUnitTenant(undefined); return; }
    let cancelled = false;
    setUnitTenant(undefined);
    tenantsApi.list({ unitId, pageSize: 1 })
      .then((res) => { if (!cancelled) setUnitTenant(res.data[0] ?? null); })
      .catch(() => { if (!cancelled) setUnitTenant(null); });
    return () => { cancelled = true; };
  }, [unitId]);

  useEffect(() => {
    if (!open) return;
    reset({ propertyId: '', buildingId: '', unitId: '', inspectorId: '', inspectionDate: '', type: '' });
    setServerError(null);
    setPendingFiles([]);
    setUnitTenant(undefined);
    setBuildings([]);
    setUnits([]);
    setStaff([]);
    propertiesApi.list({ pageSize: 100, status: 'active' }).then((res) => setProperties(res.data)).catch(() => {});
  }, [open, reset]);

  useEffect(() => {
    setValue('buildingId', '');
    setValue('unitId', '');
    setValue('inspectorId', '');
    setUnits([]);
    setStaff([]);
    if (!propertyId) { setBuildings([]); return; }
    buildingsApi.list(propertyId).then((res) => setBuildings(res.data)).catch(() => {});
    propertiesApi.listAssignments(propertyId).then((res) => setStaff(res.data)).catch(() => {});
  }, [propertyId, setValue]);

  useEffect(() => {
    setValue('unitId', '');
    if (!buildingId) { setUnits([]); return; }
    unitsApi.list(buildingId).then((res) => setUnits(res.data)).catch(() => {});
  }, [buildingId, setValue]);

  const onSubmit = async (values) => {
    setServerError(null);
    try {
      const { buildingId: _bid, ...body } = values;
      const created = await inspectionsApi.schedule(body);
      for (const file of pendingFiles) {
        await documentsApi.upload('inspection', created.data.id, file);
      }
      onSaved();
      onClose();
    } catch (err) {
      setServerError(err.details?.map((d) => d.message).join(' ') || err.message);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Schedule inspection" size="lg">
      {serverError && <Alert variant="error" className="mb-4">{serverError}</Alert>}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SelectField label="Property" required error={errors.propertyId?.message} {...register('propertyId')}>
            <option value="">Select a property…</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </SelectField>
          <SelectField label="Building (optional)" disabled={!propertyId} {...register('buildingId')}>
            <option value="">Select a building…</option>
            {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </SelectField>
          <SelectField label="Unit (optional)" disabled={!buildingId} error={errors.unitId?.message} {...register('unitId')}>
            <option value="">Select a unit…</option>
            {units.map((u) => <option key={u.id} value={u.id}>Unit {u.unitNumber}</option>)}
          </SelectField>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField label="Inspector (optional)" disabled={!propertyId} error={errors.inspectorId?.message} {...register('inspectorId')}>
            <option value="">Unassigned</option>
            {staff.map((s) => <option key={s.userId} value={s.userId}>{s.firstName} {s.lastName}</option>)}
          </SelectField>
          <SelectField label="Type" required error={errors.type?.message} {...register('type')}>
            <option value="">Select a type…</option>
            {INSPECTION_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
          </SelectField>
        </div>
        <Field label="Inspection date" type="date" required error={errors.inspectionDate?.message} {...register('inspectionDate')} />

        {unitId && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-800 dark:bg-slate-800/50">
            {unitTenant === undefined ? (
              <p className="text-slate-500 dark:text-slate-400">Checking for a resident to notify…</p>
            ) : unitTenant ? (
              <p className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <UserCheck size={15} className="shrink-0 text-accent-600 dark:text-accent-400" aria-hidden="true" />
                <span>
                  <span className="font-medium">{unitTenant.firstName} {unitTenant.lastName}</span>
                  {unitTenant.email && <span className="text-slate-500 dark:text-slate-400"> · {unitTenant.email}</span>}
                  {unitTenant.email && (
                    <span className="ml-1 inline-flex items-center gap-1 text-xs text-accent-600 dark:text-accent-400">
                      <Mail size={12} aria-hidden="true" />will be emailed
                    </span>
                  )}
                </span>
              </p>
            ) : (
              <p className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <UserX size={15} className="shrink-0" aria-hidden="true" />
                No tenant currently linked to this unit — no notification will be sent.
              </p>
            )}
          </div>
        )}

        <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
          <PendingMediaPicker files={pendingFiles} onChange={setPendingFiles} label="Photos or videos (optional)" />
        </div>

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>Schedule inspection</Button>
        </div>
      </form>
    </Modal>
  );
}
