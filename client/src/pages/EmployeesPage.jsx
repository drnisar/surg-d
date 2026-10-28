import { useCallback, useEffect, useState } from 'react';
import { DESIGNATIONS, ROLE_LABELS, addableDesignations, designationLabel, whatsappUrl } from '@surg-d/shared';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import EmployeeForm from '../components/EmployeeForm.jsx';

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

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>MR number</th>
              <th>Name</th>
              <th>Designation</th>
              <th>Role</th>
              <th>Email</th>
              <th>Official email</th>
              <th>Phone</th>
              {isAdmin && <th />}
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.id}>
                <td className="mono">{e.mrNumber}</td>
                <td>{e.fullName}</td>
                <td>{designationLabel(e.designation) || '—'}</td>
                <td>
                  <span className={`badge role-${e.role}`}>{ROLE_LABELS[e.role]}</span>
                </td>
                <td>{e.email}</td>
                <td>{e.officialEmail}</td>
                <td className="mono">
                  {whatsappUrl(e.phone) ? (
                    <a href={whatsappUrl(e.phone)} target="_blank" rel="noopener noreferrer" title="Chat on WhatsApp">
                      {e.phone}
                    </a>
                  ) : (
                    e.phone
                  )}
                </td>
                {isAdmin && (
                  <td className="actions">
                    <button className="btn ghost" onClick={() => setEditing(e)}>
                      Edit
                    </button>
                    {e.id !== user.id && (
                      <button className="btn ghost danger" onClick={() => deactivate(e)}>
                        Deactivate
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {!employees.length && (
              <tr>
                <td colSpan={8} className="muted center">
                  No employees found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
