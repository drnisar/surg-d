import { useState } from 'react';
import {
  DEFAULT_COUNTRY_CODE,
  DESIGNATIONS,
  DESIGNATION_KEYS,
  ROLE_LABELS,
  buildMrNumber,
  employeeCodeOf,
  roleForDesignation,
} from '@surg-d/shared';
import { api } from '../api.js';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function previewMr(code) {
  try {
    return buildMrNumber(code);
  } catch {
    return '';
  }
}

// `designations` limits the designation choices, e.g. to the juniors a registrar may add.
export default function EmployeeForm({ employee, designations = DESIGNATION_KEYS, onClose, onSaved }) {
  const isEdit = Boolean(employee);
  const [form, setForm] = useState({
    employeeCode: employee ? employeeCodeOf(employee.mrNumber) : '',
    fullName: employee?.fullName ?? '',
    email: employee?.email ?? '',
    officialEmail: employee?.officialEmail ?? '',
    countryCode: employee?.countryCode ?? DEFAULT_COUNTRY_CODE,
    phoneNumber: employee?.phoneNumber ?? '',
    designation: employee?.designation ?? '',
    password: '',
  });
  const [sameEmail, setSameEmail] = useState(Boolean(employee?.email) && employee.email === employee.officialEmail);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const isAdminAccount = employee?.role === 'admin';
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  // While "Use as official email" is ticked, Official email mirrors Email.
  const setEmail = (e) => {
    const email = e.target.value;
    setForm((f) => ({ ...f, email, ...(sameEmail && { officialEmail: email }) }));
  };
  const toggleSameEmail = (checked) => {
    setSameEmail(checked === true);
    if (checked === true) setForm((f) => ({ ...f, officialEmail: f.email }));
  };
  const mr = previewMr(form.employeeCode);
  const role = isAdminAccount ? 'admin' : roleForDesignation(form.designation);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setError('');
    // The designation picker isn't a native select, so the browser doesn't enforce `required` on it.
    if (!isAdminAccount && !form.designation) {
      setErrors({ designation: 'Designation is required' });
      return;
    }
    setBusy(true);
    const body = { ...form };
    if (!body.password) delete body.password;
    if (isAdminAccount) body.role = 'admin';
    try {
      await api(isEdit ? `/employees/${employee.id}` : '/employees', { method: isEdit ? 'PUT' : 'POST', body });
      onSaved();
    } catch (err) {
      setError(err.message);
      setErrors(err.details ?? {});
    } finally {
      setBusy(false);
    }
  };

  const field = (key, label, input) => (
    <div className="grid content-start gap-2">
      <Label htmlFor={key}>{label}</Label>
      {input}
      {errors[key] && <p className="m-0 text-sm text-destructive">{errors[key]}</p>}
    </div>
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg md:max-w-2xl">
        <form onSubmit={onSubmit} className="grid gap-6">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit employee' : 'Add employee'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            {field(
              'employeeCode',
              'Employee code',
              <Input
                id="employeeCode"
                value={form.employeeCode}
                onChange={set('employeeCode')}
                maxLength={10}
                placeholder="1100 or 5-1100"
                required
              />
            )}
            {field(
              'mrNumber',
              'MR number',
              <Input id="mrNumber" className="bg-muted font-mono" value={mr} readOnly placeholder="Generated from employee code" />
            )}

            {field('fullName', 'Full name', <Input id="fullName" value={form.fullName} onChange={set('fullName')} required />)}
            {field(
              'designation',
              'Designation',
              <Select value={form.designation || undefined} onValueChange={(designation) => setForm({ ...form, designation })}>
                <SelectTrigger id="designation" className="w-full" aria-invalid={Boolean(errors.designation)}>
                  <SelectValue placeholder={isAdminAccount ? 'None (admin)' : 'Select…'} />
                </SelectTrigger>
                <SelectContent>
                  {DESIGNATIONS.filter((d) => designations.includes(d.key)).map((d) => (
                    <SelectItem key={d.key} value={d.key}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="grid content-start gap-2">
              {field('email', 'Email', <Input id="email" type="email" value={form.email} onChange={setEmail} required />)}
              <div className="flex items-center gap-2">
                <Checkbox id="sameEmail" checked={sameEmail} onCheckedChange={toggleSameEmail} />
                <Label htmlFor="sameEmail" className="font-normal">
                  Use as official email
                </Label>
              </div>
            </div>
            {field(
              'officialEmail',
              'Official email',
              <Input
                id="officialEmail"
                type="email"
                className={sameEmail ? 'bg-muted' : undefined}
                value={form.officialEmail}
                onChange={set('officialEmail')}
                readOnly={sameEmail}
                required
              />
            )}

            {field(
              'phoneNumber',
              'Phone',
              <div className="grid grid-cols-[4.5rem_1fr] gap-2">
                <Input aria-label="Country code" value={form.countryCode} onChange={set('countryCode')} maxLength={5} />
                <Input
                  id="phoneNumber"
                  value={form.phoneNumber}
                  onChange={set('phoneNumber')}
                  inputMode="tel"
                  placeholder="3001234567"
                  required
                />
              </div>
            )}
            {field(
              'role',
              'Role',
              <Input id="role" className="bg-muted" value={role ? ROLE_LABELS[role] : ''} readOnly placeholder="Derived from designation" />
            )}

            {field(
              'password',
              isEdit ? 'New password (optional)' : 'Password (optional)',
              <Input id="password" type="password" value={form.password} onChange={set('password')} autoComplete="new-password" />
            )}
          </div>

          {error && <p className="m-0 text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
