import { useState } from 'react';
import { PASSWORD_MIN_LENGTH } from '@surg-d/shared';

// Modal. `onSubmit({ currentPassword, newPassword })` should throw on failure; field errors come from its `details`.
// The parent closes the modal on success.
export default function ChangePasswordForm({ onSubmit, onClose }) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.newPassword.length < PASSWORD_MIN_LENGTH) {
      setErrors({ newPassword: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` });
      return;
    }
    if (form.newPassword !== form.confirm) {
      setErrors({ confirm: "Passwords don't match" });
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await onSubmit({ currentPassword: form.currentPassword, newPassword: form.newPassword });
    } catch (err) {
      setError(err.details ? '' : err.message);
      setErrors(err.details ?? {});
      setBusy(false);
    }
  };

  const field = (key, label, autoComplete, autoFocus = false) => (
    <label>
      {label}
      <input
        type="password"
        value={form[key]}
        onChange={set(key)}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        required
      />
      {errors[key] && <span className="error">{errors[key]}</span>}
    </label>
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="card modal password-form" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>Change password</h2>
        {field('currentPassword', 'Current password', 'current-password', true)}
        {field('newPassword', `New password (at least ${PASSWORD_MIN_LENGTH} characters)`, 'new-password')}
        {field('confirm', 'Confirm new password', 'new-password')}
        {error && <p className="error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={busy}>
            {busy ? 'Saving…' : 'Change password'}
          </button>
        </div>
      </form>
    </div>
  );
}
