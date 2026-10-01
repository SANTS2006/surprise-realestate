import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../ui/Modal.jsx';
import { Field, SelectField, TextareaField } from '../ui/Input.jsx';
import { Button } from '../ui/Button.jsx';
import { Alert } from '../ui/Alert.jsx';
import { MediaGallery } from '../media/MediaGallery.jsx';
import { PendingMediaPicker } from '../media/PendingMediaPicker.jsx';
import { propertiesApi } from '../../api/properties.js';
import { ownersApi } from '../../api/owners.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { documentsApi } from '../../api/documents.js';
import { propertyFormSchema } from '../../validations/property.js';

const PROPERTY_TYPES = ['Residential', 'Commercial', 'Mixed-use', 'Industrial', 'Land'];

export function PropertyFormModal({ open, onClose, onSaved, property }) {
  const isEdit = Boolean(property);
  const [serverError, setServerError] = useState(null);
  const [pendingFiles, setPendingFiles] = useState([]);
  const { hasRole } = useAuth();
  // Administrators pick from every owner in the system; agents pick from the
  // owners they are linked to (the server only returns those); an owner adding
  // a property never picks — it is tagged to them automatically when saved.
  const pickOwner = !isEdit && (hasRole('administrator') || hasRole('agent'));
  const ownerRequired = pickOwner && !hasRole('administrator');
  const [owners, setOwners] = useState(null);
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(propertyFormSchema) });

  useEffect(() => {
    if (!open || !pickOwner) return;
    setOwners(null);
    ownersApi.options().then((res) => setOwners(res.data)).catch(() => setOwners([]));
  }, [open, pickOwner]);

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
        : { propertyCode: '', name: '', propertyType: '', description: '', address: '', city: '', region: '', country: '', latitude: '', longitude: '', yearBuilt: '', ownerId: '' }
    );
    setPendingFiles([]);
    setServerError(null);
  }, [open, property, reset]);

  const onSubmit = async (values) => {
    setServerError(null);
    if (ownerRequired && !values.ownerId) {
      setError('ownerId', { message: 'Choose which owner this property belongs to.' });
      return;
    }
    try {
      if (isEdit) {
        // eslint-disable-next-line no-unused-vars
        const { propertyCode, ownerId, ...updatable } = values;
        await propertiesApi.update(property.id, updatable);
      } else {
        const created = await propertiesApi.create({ ...values, ownerId: pickOwner ? values.ownerId : undefined });
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
        {pickOwner && (
          <SelectField
            label="Owner"
            required={ownerRequired}
            hint={owners && owners.length === 0
              ? (ownerRequired ? 'You are not linked to any owner yet. Ask an owner or administrator to add you.' : 'No owners are registered yet.')
              : (ownerRequired ? 'The owner this property belongs to — one of the owners you work for.' : 'Optional — choose who owns this property.')}
            error={errors.ownerId?.message}
            disabled={owners === null}
            {...register('ownerId')}
          >
            <option value="">{owners === null ? 'Loading owners…' : ownerRequired ? 'Select an owner…' : 'No owner yet'}</option>
            {(owners ?? []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </SelectField>
        )}
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
