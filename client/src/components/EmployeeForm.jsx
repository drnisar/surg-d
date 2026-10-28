import { useState } from 'react';
import {
  DEFAULT_COUNTRY_CODE,
  DESIGNATIONS,
  DESIGNATION_KEYS,
  ROLE_LABELS,
  buildMrNumber,
  parseMrNumber,
  roleForDesignation,
} from '@surg-d/shared';
import { api } from '../api.js';

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
    employeeCode: employee ? parseMrNumber(employee.mrNumber)?.employeeCode ?? '' : '',
    fullName: employee?.fullName ?? '',
    email: employee?.email ?? '',
    officialEmail: employee?.officialEmail ?? '',
    countryCode: employee?.countryCode ?? DEFAULT_COUNTRY_CODE,
    phoneNumber: employee?.phoneNumber ?? '',
    designation: employee?.designation ?? '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const isAdminAccount = employee?.role === 'admin';
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const mr = previewMr(form.employeeCode);
  const role = isAdminAccount ? 'admin' : roleForDesignation(form.designation);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setError('');
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
    <label>
      {label}
      {input}
      {errors[key] && <span className="error">{errors[key]}</span>}
    </label>
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="card modal" onClick={(e) => e.stopPropagation()} onSubmit={onSubmit}>
        <h2>{isEdit ? 'Edit employee' : 'Add employee'}</h2>

        <div className="grid">
          {field(
            'employeeCode',
            'Employee code',
            <input value={form.employeeCode} onChange={set('employeeCode')} inputMode="numeric" maxLength={8} required />
          )}
          <label>
            MR number
            <input className="mono" value={mr} readOnly placeholder="Generated from employee code" />
          </label>

          {field('fullName', 'Full name', <input value={form.fullName} onChange={set('fullName')} required />)}
          {field(
            'designation',
            'Designation',
            <select value={form.designation} onChange={set('designation')} required={!isAdminAccount}>
              <option value="">{isAdminAccount ? 'None (admin)' : 'Select…'}</option>
              {DESIGNATIONS.filter((d) => designations.includes(d.key)).map((d) => (
                <option key={d.key} value={d.key}>
                  {d.label}
                </option>
              ))}
            </select>
          )}

          {field('email', 'Email', <input type="email" value={form.email} onChange={set('email')} required />)}
          {field(
            'officialEmail',
            'Official email',
            <input type="email" value={form.officialEmail} onChange={set('officialEmail')} required />
          )}

          {field(
            'phoneNumber',
            'Phone',
            <div className="phone">
              <input value={form.countryCode} onChange={set('countryCode')} maxLength={5} />
              <input value={form.phoneNumber} onChange={set('phoneNumber')} inputMode="tel" placeholder="3001234567" required />
            </div>
          )}
          <label>
            Role
            <input value={role ? ROLE_LABELS[role] : ''} readOnly placeholder="Derived from designation" />
          </label>

          {field(
            'password',
            isEdit ? 'New password (optional)' : 'Password (optional)',
            <input type="password" value={form.password} onChange={set('password')} autoComplete="new-password" />
          )}
        </div>

        {error && <p className="error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
