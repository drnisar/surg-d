import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DESIGNATIONS, ROLE_LABELS, designationLabel } from '@surg-d/shared';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Badge, useTaskBadge } from '../taskBadge.jsx';
import ChangePasswordForm from '../components/ChangePasswordForm.jsx';

function SwitchUser() {
  const { user, impersonate } = useAuth();
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/meta')
      .then((meta) => setEnabled(meta.impersonation))
      .catch(() => setEnabled(false));
    api('/employees')
      .then((list) => setEmployees(list.filter((e) => e.id !== user.id)))
      .catch((err) => setError(err.message));
  }, [user.id]);

  const groups = DESIGNATIONS.map((d) => ({ ...d, people: employees.filter((e) => e.designation === d.key) })).filter(
    (g) => g.people.length
  );

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await impersonate(Number(selected));
      navigate('/');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  if (enabled === null) return null;

  return (
    <section className="card">
      <h3>Test as another user</h3>
      {enabled ? (
        <form className="switch-user" onSubmit={submit}>
          <p className="muted small">
            See the app exactly as a doctor, registrar, consultant or nurse sees it, without their password. Anything you
            do is saved as that user. Use the banner at the top to return to your admin account.
          </p>
          <div className="task-input">
            <select value={selected} onChange={(e) => setSelected(e.target.value)} required>
              <option value="">Select a user…</option>
              {groups.map((g) => (
                <optgroup key={g.key} label={`${g.label} — ${ROLE_LABELS[g.role]}`}>
                  {g.people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.mrNumber})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <button className="btn primary" disabled={busy || !selected}>
              {busy ? 'Switching…' : 'Switch'}
            </button>
          </div>
          {!groups.length && <p className="muted small">No other active users yet. Add staff on the Staff page.</p>}
          {error && <p className="error">{error}</p>}
        </form>
      ) : (
        <p className="muted">Switching user is disabled on this server.</p>
      )}
    </section>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { count } = useTaskBadge();
  const isRealAdmin = user.role === 'admin' && !user.impersonatedBy;
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);

  const changePassword = async (body) => {
    await api('/auth/password', { method: 'POST', body });
    setChangingPassword(false);
    setPasswordChanged(true);
  };

  const rows = [
    ['MR number', <span className="mono">{user.mrNumber}</span>],
    ['Designation', designationLabel(user.designation) || '—'],
    ['Role', ROLE_LABELS[user.role]],
    ['Email', user.email],
    ['Official email', user.officialEmail],
    ['Phone', <span className="mono">{user.phone}</span>],
  ];

  return (
    <>
      <div className="toolbar">
        <div>
          <h2 className="with-badge">
            {user.fullName}
            <Badge count={count} />
          </h2>
          <p className="muted subtitle">{ROLE_LABELS[user.role]}</p>
        </div>
      </div>

      <div className="profile-grid">
        <section className="card">
          <h3>Details</h3>
          <dl className="details">
            {rows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="card">
          <h3>Change password</h3>
          {user.impersonatedBy ? (
            <p className="muted">Return to your admin account to change passwords. Staff passwords are reset from the Staff page.</p>
          ) : (
            <div className="password-card">
              {passwordChanged && <p className="done">Password changed.</p>}
              <div>
                <button
                  className="btn ghost"
                  onClick={() => {
                    setPasswordChanged(false);
                    setChangingPassword(true);
                  }}
                >
                  Change password
                </button>
              </div>
            </div>
          )}
        </section>
        {isRealAdmin && <SwitchUser />}
      </div>

      {changingPassword && <ChangePasswordForm onSubmit={changePassword} onClose={() => setChangingPassword(false)} />}
    </>
  );
}
