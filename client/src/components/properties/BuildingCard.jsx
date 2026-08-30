import { useState } from 'react';
import { Layers, Home, Pencil, Trash2, Images } from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { ConfirmDialog } from '../ui/ConfirmDialog.jsx';

// Card presentation for a single building — cover image, name/code/floors,
// a unit-occupancy stat row, and edit/delete/media actions. Clicking the
// card (or its "Manage units" button) opens BuildingUnitsModal.
export function BuildingCard({ building, canManage, onOpenUnits, onEdit, onDeleted, onOpenMedia }) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const unitSummary = building.unitSummary ?? { total: 0, occupied: 0, available: 0 };

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <button type="button" onClick={onOpenUnits} className="relative block aspect-[16/9] w-full shrink-0 overflow-hidden bg-gradient-to-br from-brand-100 to-accent-100 text-left dark:from-brand-950 dark:to-accent-950">
        {building.coverImageUrl ? (
          <img src={building.coverImageUrl} alt={building.name} className="h-full w-full object-cover transition-transform duration-300 hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Layers size={30} className="text-brand-300 dark:text-brand-700" aria-hidden="true" />
          </div>
        )}
      </button>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900 dark:text-slate-100">{building.name}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {building.code ? `${building.code} · ` : ''}{building.floors != null ? `${building.floors} floors` : 'Floors not set'}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onOpenMedia} aria-label={`Photos for building ${building.name}`}>
            <Images size={14} aria-hidden="true" />
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center dark:border-slate-800">
          <div>
            <p className="flex items-center justify-center gap-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <Home size={13} className="text-brand-500" aria-hidden="true" />
              {unitSummary.total}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Units</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-brand-600 dark:text-brand-400">{unitSummary.occupied}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Occupied</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{unitSummary.available}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Available</p>
          </div>
        </div>

        <div className="mt-auto flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <Button size="sm" onClick={onOpenUnits} className="flex-1">Manage units</Button>
          {canManage && (
            <>
              <Button variant="ghost" size="sm" onClick={onEdit} aria-label={`Edit building ${building.name}`}>
                <Pencil size={14} aria-hidden="true" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)} aria-label={`Delete building ${building.name}`}>
                <Trash2 size={14} className="text-rose-500" aria-hidden="true" />
              </Button>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={async () => { await onDeleted(building.id); }}
        title="Delete building?"
        description={`This will permanently delete "${building.name}" and all its units. This cannot be undone.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
