import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../ui/Modal.jsx';
import { SelectField } from '../ui/Input.jsx';
import { Button } from '../ui/Button.jsx';
import { Alert } from '../ui/Alert.jsx';
import { maintenanceApi } from '../../api/maintenance.js';
import { propertiesApi } from '../../api/properties.js';
import { assignMaintenanceFormSchema } from '../../validations/maintenance.js';

export function AssignMaintenanceModal({ open, onClose, onSaved, request }) {
  const [serverError, setServerError] = useState(null);
  const [staff, setStaff] = useState([]);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(assignMaintenanceFormSchema) });

  useEffect(() => {
    if (!open || !request) return;
    reset({ assignedTo: '' });
    setServerError(null);
    setStaff([]);
    propertiesApi.listAssignments(request.propertyId).then((res) => setStaff(res.data)).catch(() => {});
  }, [open, request, reset]);

  const onSubmit = async (values) => {
    setServerError(null);
    try {
      await maintenanceApi.assign(request.id, values.assignedTo);
      onSaved();
      onClose();
    } catch (err) {
      setServerError(err.details?.map((d) => d.message).join(' ') || err.message);
    }
  };

  if (!request) return null;

  return (
    <Modal open={open} onClose={onClose} title="Assign maintenance request" description={request.title}>
      {serverError && <Alert variant="error" className="mb-4">{serverError}</Alert>}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <SelectField label="Assign to" required error={errors.assignedTo?.message} hint="Staff assigned to this property" {...register('assignedTo')}>
          <option value="">Select a staff member…</option>
          {staff.map((s) => <option key={s.userId} value={s.userId}>{s.firstName} {s.lastName}</option>)}
        </SelectField>
        {staff.length === 0 && (
          <p className="text-xs text-amber-600 dark:text-amber-400">No staff are assigned to this property yet — assign staff from the property's detail page first.</p>
        )}
        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>Assign</Button>
        </div>
      </form>
    </Modal>
  );
}
