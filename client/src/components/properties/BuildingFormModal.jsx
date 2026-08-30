import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../ui/Modal.jsx';
import { Field, TextareaField } from '../ui/Input.jsx';
import { Button } from '../ui/Button.jsx';
import { Alert } from '../ui/Alert.jsx';
import { MediaGallery } from '../media/MediaGallery.jsx';
import { PendingMediaPicker } from '../media/PendingMediaPicker.jsx';
import { buildingsApi } from '../../api/buildings.js';
import { documentsApi } from '../../api/documents.js';
import { buildingFormSchema } from '../../validations/building.js';

export function BuildingFormModal({ open, onClose, onSaved, propertyId, building }) {
  const isEdit = Boolean(building);
  const [serverError, setServerError] = useState(null);
  const [pendingFiles, setPendingFiles] = useState([]);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(buildingFormSchema) });

  useEffect(() => {
    if (!open) return;
    reset(
      building
        ? { name: building.name, code: building.code ?? '', floors: building.floors ?? '', description: building.description ?? '' }
        : { name: '', code: '', floors: '', description: '' }
    );
    setPendingFiles([]);
    setServerError(null);
  }, [open, building, reset]);

  const onSubmit = async (values) => {
    setServerError(null);
    try {
      if (isEdit) {
        await buildingsApi.update(building.id, values);
      } else {
        const created = await buildingsApi.create(propertyId, values);
        for (const file of pendingFiles) {
          await documentsApi.upload('building', created.data.id, file);
        }
      }
      onSaved();
      onClose();
    } catch (err) {
      setServerError(err.details?.map((d) => d.message).join(' ') || err.message);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit building' : 'New building'} size="lg">
      {serverError && <Alert variant="error" className="mb-4">{serverError}</Alert>}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <Field label="Building name" required error={errors.name?.message} {...register('name')} />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Code" error={errors.code?.message} {...register('code')} />
          <Field label="Floors" type="number" step="1" error={errors.floors?.message} {...register('floors')} />
        </div>
        <TextareaField label="Description" error={errors.description?.message} {...register('description')} />

        <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
          {isEdit ? (
            <>
              <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Photos &amp; videos</p>
              <MediaGallery entityType="building" entityId={building.id} canUpload canDelete />
            </>
          ) : (
            <PendingMediaPicker files={pendingFiles} onChange={setPendingFiles} label="Photos or videos (optional)" />
          )}
        </div>

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>{isEdit ? 'Save changes' : 'Create building'}</Button>
        </div>
      </form>
    </Modal>
  );
}
