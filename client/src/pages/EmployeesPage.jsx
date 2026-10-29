import { useCallback, useEffect, useState } from 'react';
import { DESIGNATIONS, addableDesignations } from '@surg-d/shared';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import EmployeeForm from '../components/EmployeeForm.jsx';
import EmployeesTable from '../components/EmployeesTable.jsx';

export default function EmployeesPage() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const canAdd = addableDesignations(user);
  const [employees, setEmployees] = useState([]);
  const [filters, setFilters] = useState({ q: '', designation: '' });
  const [editing, setEditing] = useState(null); // null = closed, {} = new, employee = edit
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

  const deactivate = async (employee) => {
    if (!confirm(`Deactivate ${employee.fullName}?`)) return;
    try {
      await api(`/employees/${employee.id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <div className="toolbar">
        <h2>Ward staff</h2>
        <span className="spacer" />
        <input
          placeholder="Search name, MR, email"
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
        />
        <select value={filters.designation} onChange={(e) => setFilters({ ...filters, designation: e.target.value })}>
          <option value="">All designations</option>
          {DESIGNATIONS.map((d) => (
            <option key={d.key} value={d.key}>
              {d.label}
            </option>
          ))}
        </select>
        {canAdd.length > 0 && (
          <button className="btn primary" onClick={() => setEditing({})}>
            Add employee
          </button>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      <EmployeesTable
        employees={employees}
        canManage={isAdmin}
        currentUserId={user.id}
        onEdit={setEditing}
        onDeactivate={deactivate}
      />

      {editing && (
        <EmployeeForm
          employee={editing.id ? editing : null}
          designations={editing.id ? undefined : canAdd}
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
