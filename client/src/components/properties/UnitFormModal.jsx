import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../ui/Modal.jsx';
import { Field, TextareaField } from '../ui/Input.jsx';
import { Button } from '../ui/Button.jsx';
import { Alert } from '../ui/Alert.jsx';
import { MediaGallery } from '../media/MediaGallery.jsx';
import { PendingMediaPicker } from '../media/PendingMediaPicker.jsx';
import { unitsApi } from '../../api/units.js';
import { documentsApi } from '../../api/documents.js';
import { unitFormSchema } from '../../validations/unit.js';

export function UnitFormModal({ open, onClose, onSaved, buildingId, unit }) {
  const isEdit = Boolean(unit);
  const [serverError, setServerError] = useState(null);
  const [pendingFiles, setPendingFiles] = useState([]);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(unitFormSchema) });

  useEffect(() => {
    if (!open) return;
    reset(
      unit
        ? {
            unitNumber: unit.unitNumber,
            unitType: unit.unitType ?? '',
            floor: unit.floor ?? '',
            bedrooms: unit.bedrooms ?? '',
            bathrooms: unit.bathrooms ?? '',
            area: unit.area ?? '',
            monthlyRent: unit.monthlyRent,
            securityDeposit: unit.securityDeposit ?? '',
            description: unit.description ?? '',
          }
        : { unitNumber: '', unitType: '', floor: '', bedrooms: '', bathrooms: '', area: '', monthlyRent: '', securityDeposit: '', description: '' }
    );
    setPendingFiles([]);
    setServerError(null);
  }, [open, unit, reset]);

  const onSubmit = async (values) => {
    setServerError(null);
    try {
      if (isEdit) {
        await unitsApi.update(unit.id, values);
      } else {
        const created = await unitsApi.create(buildingId, values);
        for (const file of pendingFiles) {
          await documentsApi.upload('unit', created.data.id, file);
        }
      }
      onSaved();
      onClose();
    } catch (err) {
      setServerError(err.details?.map((d) => d.message).join(' ') || err.message);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit unit' : 'New unit'} size="lg">
      {serverError && <Alert variant="error" className="mb-4">{serverError}</Alert>}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Unit number" required error={errors.unitNumber?.message} {...register('unitNumber')} />
          <Field label="Unit type" placeholder="e.g. Studio, 2BR" error={errors.unitType?.message} {...register('unitType')} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Floor" type="number" step="1" error={errors.floor?.message} {...register('floor')} />
          <Field label="Bedrooms" type="number" step="1" error={errors.bedrooms?.message} {...register('bedrooms')} />
          <Field label="Bathrooms" type="number" step="1" error={errors.bathrooms?.message} {...register('bathrooms')} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Area (sq ft)" type="number" step="any" error={errors.area?.message} {...register('area')} />
          <Field label="Monthly rent" required type="number" step="0.01" error={errors.monthlyRent?.message} {...register('monthlyRent')} />
          <Field label="Security deposit" type="number" step="0.01" error={errors.securityDeposit?.message} {...register('securityDeposit')} />
        </div>
        <TextareaField label="Description" error={errors.description?.message} {...register('description')} />

        <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
          {isEdit ? (
            <>
              <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Photos &amp; videos</p>
              <MediaGallery entityType="unit" entityId={unit.id} canUpload canDelete />
            </>
          ) : (
            <PendingMediaPicker files={pendingFiles} onChange={setPendingFiles} label="Photos or videos (optional)" />
          )}
        </div>

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>{isEdit ? 'Save changes' : 'Create unit'}</Button>
        </div>
      </form>
    </Modal>
  );
}
