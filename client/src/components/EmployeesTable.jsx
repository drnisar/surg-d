import { designationLabel, whatsappUrl } from '@surg-d/shared';

// Staff list. Edit/Deactivate actions show only when `canManage`; nobody can deactivate themselves.
export default function EmployeesTable({ employees, canManage, currentUserId, onEdit, onDeactivate }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>MR number</th>
            <th>Name</th>
            <th>Designation</th>
            <th>Official email</th>
            <th>Phone</th>
            {canManage && <th />}
          </tr>
        </thead>
        <tbody>
          {employees.map((e) => (
            <tr key={e.id}>
              <td className="mono">{e.mrNumber}</td>
              <td>{e.fullName}</td>
              <td>{designationLabel(e.designation) || '—'}</td>
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
              {canManage && (
                <td className="actions">
                  <button className="btn ghost" onClick={() => onEdit(e)}>
                    Edit
                  </button>
                  {e.id !== currentUserId && (
                    <button className="btn ghost danger" onClick={() => onDeactivate(e)}>
                      Deactivate
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
          {!employees.length && (
            <tr>
              <td colSpan={canManage ? 6 : 5} className="muted center">
                No employees found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
