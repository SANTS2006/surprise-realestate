import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../ui/Modal.jsx';
import { Field, TextareaField } from '../ui/Input.jsx';
import { Button } from '../ui/Button.jsx';
import { Alert } from '../ui/Alert.jsx';
import { MediaGallery } from '../media/MediaGallery.jsx';
import { PendingMediaPicker } from '../media/PendingMediaPicker.jsx';
import { propertiesApi } from '../../api/properties.js';
import { documentsApi } from '../../api/documents.js';
import { propertyFormSchema } from '../../validations/property.js';

const PROPERTY_TYPES = ['Residential', 'Commercial', 'Mixed-use', 'Industrial', 'Land'];

export function PropertyFormModal({ open, onClose, onSaved, property }) {
  const isEdit = Boolean(property);
  const [serverError, setServerError] = useState(null);
  const [pendingFiles, setPendingFiles] = useState([]);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(propertyFormSchema) });

  useEffect(() => {
    if (!open) return;
    reset(
      property
        ? {
            propertyCode: property.propertyCode,
            name: property.name,
            propertyType: property.propertyType,
            description: property.description ?? '',
            address: property.address,
            city: property.city ?? '',
            region: property.region ?? '',
            country: property.country ?? '',
            latitude: property.latitude ?? '',
            longitude: property.longitude ?? '',
            yearBuilt: property.yearBuilt ?? '',
          }
        : { propertyCode: '', name: '', propertyType: '', description: '', address: '', city: '', region: '', country: '', latitude: '', longitude: '', yearBuilt: '' }
    );
    setPendingFiles([]);
    setServerError(null);
  }, [open, property, reset]);

  const onSubmit = async (values) => {
    setServerError(null);
    try {
      if (isEdit) {
        const { propertyCode, ...updatable } = values;
        await propertiesApi.update(property.id, updatable);
      } else {
        const created = await propertiesApi.create(values);
        for (const file of pendingFiles) {
          await documentsApi.upload('property', created.data.id, file);
        }
      }
      onSaved();
      onClose();
    } catch (err) {
      setServerError(err.details?.map((d) => d.message).join(' ') || err.message);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit property' : 'New property'} size="lg">
      {serverError && <Alert variant="error" className="mb-4">{serverError}</Alert>}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Property code" required disabled={isEdit} hint={isEdit ? 'Property code cannot be changed.' : undefined} error={errors.propertyCode?.message} {...register('propertyCode')} />
          <Field label="Property type" required list="property-types" error={errors.propertyType?.message} {...register('propertyType')} />
          <datalist id="property-types">
            {PROPERTY_TYPES.map((t) => <option key={t} value={t} />)}
          </datalist>
        </div>
        <Field label="Property name" required error={errors.name?.message} {...register('name')} />
        <TextareaField label="Description" error={errors.description?.message} {...register('description')} />
        <Field label="Address" required error={errors.address?.message} {...register('address')} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="City" error={errors.city?.message} {...register('city')} />
          <Field label="Region / State" error={errors.region?.message} {...register('region')} />
          <Field label="Country" error={errors.country?.message} {...register('country')} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Latitude" type="number" step="any" error={errors.latitude?.message} {...register('latitude')} />
          <Field label="Longitude" type="number" step="any" error={errors.longitude?.message} {...register('longitude')} />
          <Field label="Year built" type="number" step="1" error={errors.yearBuilt?.message} {...register('yearBuilt')} />
        </div>

        <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
          {isEdit ? (
            <>
              <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Photos &amp; videos</p>
              <MediaGallery entityType="property" entityId={property.id} canUpload canDelete />
            </>
          ) : (
            <PendingMediaPicker files={pendingFiles} onChange={setPendingFiles} label="Photos or videos (optional)" />
          )}
        </div>

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>{isEdit ? 'Save changes' : 'Create property'}</Button>
        </div>
      </form>
    </Modal>
  );
}
