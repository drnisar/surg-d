import { useCallback, useEffect, useState } from 'react';
import { DESIGNATIONS, addableDesignations, canEditEmployee } from '@surg-d/shared';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import EmployeeForm from '../components/EmployeeForm.jsx';
import EmployeesTable from '../components/EmployeesTable.jsx';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Radix Select items can't have an empty value, so "no filter" gets its own.
const ALL = 'all';

export default function EmployeesPage() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const canAdd = addableDesignations(user);
  const [employees, setEmployees] = useState([]);
  const [filters, setFilters] = useState({ q: '', designation: '' });
  const [editing, setEditing] = useState(null); // null = closed, {} = new, employee = edit
  const [deactivating, setDeactivating] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v));
    try {
      setEmployees(await api(`/employees?${params}`));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const deactivate = async () => {
    try {
      await api(`/employees/${deactivating.id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err.message);
    }
    setDeactivating(null);
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="w-full text-xl font-semibold sm:w-auto">Ward staff</h2>
        <span className="hidden flex-1 sm:block" />
        <Input
          className="w-full sm:w-56"
          placeholder="Search name, MR, email"
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
        />
        <Select
          value={filters.designation || ALL}
          onValueChange={(v) => setFilters({ ...filters, designation: v === ALL ? '' : v })}
        >
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All designations</SelectItem>
            {DESIGNATIONS.map((d) => (
              <SelectItem key={d.key} value={d.key}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canAdd.length > 0 && <Button onClick={() => setEditing({})}>Add employee</Button>}
      </div>

      {error && <p className="mt-0 mb-3 text-sm text-destructive">{error}</p>}

      <EmployeesTable
        employees={employees}
        canEdit={(e) => canEditEmployee(user, e)}
        canDeactivate={(e) => isAdmin && e.id !== user.id}
        onEdit={setEditing}
        onDeactivate={setDeactivating}
      />

      <AlertDialog open={Boolean(deactivating)} onOpenChange={(open) => !open && setDeactivating(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate {deactivating?.fullName}?</AlertDialogTitle>
            <AlertDialogDescription>
              They will no longer be able to sign in. Their roster duties and tasks are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={deactivate}>
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editing && (
        <EmployeeForm
          employee={editing.id ? editing : null}
          designations={canAdd}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </>
  );
}
