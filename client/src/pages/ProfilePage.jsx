import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DESIGNATIONS, ROLE_LABELS, designationLabel } from '@surg-d/shared';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Badge, useTaskBadge } from '../taskBadge.jsx';
import ChangePasswordForm from '../components/ChangePasswordForm.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';

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
    <Card>
      <CardHeader>
        <CardTitle>Test as another user</CardTitle>
        <CardDescription>
          {enabled
            ? 'See the app exactly as a doctor, registrar, consultant or nurse sees it, without their password. Anything you do is saved as that user. Use the banner at the top to return to your admin account.'
            : 'Switching user is disabled on this server.'}
        </CardDescription>
      </CardHeader>
      {enabled && (
        <CardContent>
          <form className="grid gap-3" onSubmit={submit}>
            <div className="flex gap-2">
              <Select value={selected || undefined} onValueChange={setSelected}>
                <SelectTrigger className="min-w-0 flex-1" aria-label="User to test as">
                  <SelectValue placeholder="Select a user…" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectGroup key={g.key}>
                      <SelectLabel>
                        {g.label} — {ROLE_LABELS[g.role]}
                      </SelectLabel>
                      {g.people.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.fullName} ({p.mrNumber})
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              <Button type="submit" disabled={busy || !selected}>
                {busy ? 'Switching…' : 'Switch'}
              </Button>
            </div>
            {!groups.length && (
              <p className="m-0 text-sm text-muted-foreground">No other active users yet. Add staff on the Staff page.</p>
            )}
            {error && <p className="m-0 text-sm text-destructive">{error}</p>}
          </form>
        </CardContent>
      )}
    </Card>
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
    ['MR number', <span className="font-mono">{user.mrNumber}</span>],
    ['Designation', designationLabel(user.designation) || '—'],
    ['Role', ROLE_LABELS[user.role]],
    ['Email', user.email],
    ['Official email', user.officialEmail],
    ['Phone', <span className="font-mono">{user.phone}</span>],
  ];

  return (
    <>
      <div className="mb-4">
        <h2 className="m-0 inline-flex items-center gap-2 text-2xl font-semibold">
          {user.fullName}
          <Badge count={count} />
        </h2>
        <p className="m-0 text-muted-foreground">{ROLE_LABELS[user.role]}</p>
      </div>

      <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="m-0 grid gap-3">
              {rows.map(([label, value]) => (
                <div key={label} className="grid gap-1 sm:grid-cols-[8rem_1fr] sm:gap-2">
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd className="m-0 break-words">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Change password</CardTitle>
            {user.impersonatedBy && (
              <CardDescription>
                Return to your admin account to change passwords. Staff passwords are reset from the Staff page.
              </CardDescription>
            )}
          </CardHeader>
          {!user.impersonatedBy && (
            <CardContent className="grid justify-items-start gap-3">
              {passwordChanged && <p className="m-0 text-sm text-green-700">Password changed.</p>}
              <Button
                variant="outline"
                onClick={() => {
                  setPasswordChanged(false);
                  setChangingPassword(true);
                }}
              >
                Change password
              </Button>
            </CardContent>
          )}
        </Card>
        {isRealAdmin && <SwitchUser />}
      </div>

      {changingPassword && <ChangePasswordForm onSubmit={changePassword} onClose={() => setChangingPassword(false)} />}
    </>
  );
}
