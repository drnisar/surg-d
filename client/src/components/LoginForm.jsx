import { useState } from 'react';
import { buildMrNumber } from '@surg-d/shared';

// A bare employee code (e.g. 1100) is expanded to the full MR number (K0360000001100).
function expandIdentifier(value) {
  const trimmed = value.trim();
  if (!/^\d{1,8}$/.test(trimmed)) return trimmed;
  try {
    return buildMrNumber(trimmed);
  } catch {
    return trimmed;
  }
}

// Sign-in form. `onLogin(identifier, password)` should throw on failure; its message is shown.
export default function LoginForm({ onLogin }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const expanded = expandIdentifier(identifier);
  const showExpanded = expanded !== identifier.trim();

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onLogin(expanded, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card" onSubmit={onSubmit}>
      <h1>Surgical D Ward</h1>
      <p className="muted">Khyber Teaching Hospital</p>
      <label>
        Employee code, MR number or email
        <input
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          onBlur={() => setIdentifier(expanded)}
          autoFocus
          required
        />
        {showExpanded && <span className="muted mono">{expanded}</span>}
      </label>
      <label>
        Password
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </label>
      {error && <p className="error">{error}</p>}
      <button className="btn primary" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
