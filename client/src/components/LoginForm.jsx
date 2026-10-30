import { useState } from 'react';
import { EMPLOYEE_CODE_PATTERN, buildMrNumber } from '@surg-d/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// A bare employee code is expanded to the full MR number: 1100 -> K0360000001100, 5-1100 -> K0350000001100.
function expandIdentifier(value) {
  const trimmed = value.trim();
  if (!EMPLOYEE_CODE_PATTERN.test(trimmed)) return trimmed;
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
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Surgical D Ward</CardTitle>
        <CardDescription>Khyber Teaching Hospital</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="identifier">Employee code, MR number or email</Label>
            <Input
              id="identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              onBlur={() => setIdentifier(expanded)}
              autoFocus
              required
            />
            {showExpanded && <span className="font-mono text-sm text-muted-foreground">{expanded}</span>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="m-0 text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
