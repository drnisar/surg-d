import { useState } from 'react';
import { PASSWORD_MIN_LENGTH } from '@surg-d/shared';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
    <div className="grid gap-2">
      <Label htmlFor={key}>{label}</Label>
      <Input
        id={key}
        type="password"
        value={form[key]}
        onChange={set(key)}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        aria-invalid={Boolean(errors[key])}
        required
      />
      {errors[key] && <p className="m-0 text-sm text-destructive">{errors[key]}</p>}
    </div>
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form className="grid gap-4" onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
          </DialogHeader>
          {field('currentPassword', 'Current password', 'current-password', true)}
          {field('newPassword', `New password (at least ${PASSWORD_MIN_LENGTH} characters)`, 'new-password')}
          {field('confirm', 'Confirm new password', 'new-password')}
          {error && <p className="m-0 text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Change password'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
