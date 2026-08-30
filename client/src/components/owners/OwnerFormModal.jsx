import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../ui/Modal.jsx';
import { Field } from '../ui/Input.jsx';
import { Button } from '../ui/Button.jsx';
import { Alert } from '../ui/Alert.jsx';
import { MediaGallery } from '../media/MediaGallery.jsx';
import { PendingMediaPicker } from '../media/PendingMediaPicker.jsx';
import { ownersApi } from '../../api/owners.js';
import { propertiesApi } from '../../api/properties.js';
import { documentsApi } from '../../api/documents.js';
import { ownerFormSchema } from '../../validations/owner.js';

// Ownership lives on Property.ownerId, not on Owner - so "attaching"
// properties to a new/edited owner means patching each selected property's
// ownerId after the owner record itself is saved (see onSubmit below).
function PropertyPicker({ properties, selected, onToggle }) {
  if (properties.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">No properties in the system yet.</p>;
  }
  return (
    <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800">
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {properties.map((p) => (
          <li key={p.id} className="flex items-center gap-2 px-3 py-2 text-sm">
            <input
              type="checkbox"
              id={`property-${p.id}`}
              checked={selected.has(p.id)}
              onChange={() => onToggle(p.id)}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-600"
            />
            <label htmlFor={`property-${p.id}`} className="flex-1 cursor-pointer text-slate-700 dark:text-slate-200">
              {p.name}
              {p.ownerId && <span className="ml-1.5 text-xs text-slate-400">(currently owned)</span>}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

const OWNER_STATUSES = ['active', 'inactive'];

function StatusControl({ owner, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = async (e) => {
    setError(null);
    setBusy(true);
    try {
      const updated = await ownersApi.setStatus(owner.id, e.target.value);
      onChanged(updated.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-4 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-slate-800/50">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Status</p>
      <div className="flex items-center gap-2">
        {error && <span className="text-xs text-rose-600 dark:text-rose-400">{error}</span>}
        <select
          value={owner.status}
          onChange={handleChange}
          disabled={busy}
          className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          {OWNER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
    </div>
  );
}

export function OwnerFormModal({ open, onClose, onSaved, owner }) {
  const isEdit = Boolean(owner);
  const [serverError, setServerError] = useState(null);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [properties, setProperties] = useState([]);
  const [selectedPropertyIds, setSelectedPropertyIds] = useState(new Set());
  const [liveOwner, setLiveOwner] = useState(owner);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(ownerFormSchema) });

  useEffect(() => {
    if (!open) return;
    reset(
      owner
        ? { name: owner.name, email: owner.email ?? '', phone: owner.phone ?? '', address: owner.address ?? '' }
        : { name: '', email: '', phone: '', address: '' }
    );
    setLiveOwner(owner);
    setPendingFiles([]);
    setServerError(null);
    propertiesApi.list({ pageSize: 100 })
      .then((res) => {
        setProperties(res.data);
        setSelectedPropertyIds(new Set(isEdit ? res.data.filter((p) => p.ownerId === owner.id).map((p) => p.id) : []));
      })
      .catch(() => {});
  }, [open, owner, isEdit, reset]);

  const togglePropertyId = (id) => {
    setSelectedPropertyIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const onSubmit = async (values) => {
    setServerError(null);
    try {
      let ownerId = owner?.id;
      if (isEdit) {
        await ownersApi.update(owner.id, values);
      } else {
        const created = await ownersApi.create(values);
        ownerId = created.data.id;
        for (const file of pendingFiles) {
          await documentsApi.upload('owner', ownerId, file);
        }
      }

      const assignments = properties
        .filter((p) => selectedPropertyIds.has(p.id) !== (p.ownerId === ownerId))
        .map((p) => propertiesApi.update(p.id, { ownerId: selectedPropertyIds.has(p.id) ? ownerId : null }));
      await Promise.all(assignments);

      onSaved();
      onClose();
    } catch (err) {
      setServerError(err.details?.map((d) => d.message).join(' ') || err.message);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit owner' : 'New owner'} size="lg">
      {serverError && <Alert variant="error" className="mb-4">{serverError}</Alert>}
      {liveOwner && <StatusControl owner={liveOwner} onChanged={(updated) => { setLiveOwner(updated); onSaved(); }} />}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <Field label="Owner name" required error={errors.name?.message} {...register('name')} />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Email" type="email" error={errors.email?.message} {...register('email')} />
          <Field label="Phone" error={errors.phone?.message} {...register('phone')} />
        </div>
        <Field label="Address" error={errors.address?.message} {...register('address')} />

        <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
          <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Properties owned (optional)</p>
          <PropertyPicker properties={properties} selected={selectedPropertyIds} onToggle={togglePropertyId} />
        </div>

        <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
          {isEdit ? (
            <>
              <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Photo</p>
              <MediaGallery entityType="owner" entityId={owner.id} canUpload canDelete />
            </>
          ) : (
            <PendingMediaPicker files={pendingFiles} onChange={setPendingFiles} label="Photo (optional)" />
          )}
        </div>

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>{isEdit ? 'Save changes' : 'Create owner'}</Button>
        </div>
      </form>
    </Modal>
  );
}
