import { useEffect, useState } from 'react';
import { SETTINGS_HEADING_MAX_LENGTH, taskWhatsappMessage } from '@surg-d/shared';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useSettings } from '../settings.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

// Admin-only: feature switches and the WhatsApp message, saved for everyone.
export default function SetupPage() {
  const { user } = useAuth();
  const { settings, reload } = useSettings();
  const [form, setForm] = useState(settings);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Opened straight from the address bar, the saved settings arrive after the first render.
  useEffect(() => {
    if (!dirty) setForm(settings);
  }, [settings, dirty]);

  const set = (section, field) => (value) => {
    setSaved(false);
    setDirty(true);
    setForm((f) => ({ ...f, [section]: { ...f[section], [field]: value } }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setError('');
    try {
      setForm(await api('/settings', { method: 'PUT', body: form }));
      setSaved(true);
      setDirty(false);
      reload();
    } catch (err) {
      setError(err.message);
      setErrors(err.details ?? {});
    } finally {
      setBusy(false);
    }
  };

  const fieldError = (key) => errors[key] && <p className="m-0 text-sm text-destructive">{errors[key]}</p>;

  const switchRow = (id, label, note, checked, onChange) => (
    <div className="flex items-start justify-between gap-4">
      <div className="grid gap-1">
        <Label htmlFor={id}>{label}</Label>
        <p className="m-0 text-sm text-muted-foreground">{note}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );

  const checkRow = (id, label, checked, onChange, disabled) => (
    <div className="flex items-center gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} disabled={disabled} />
      <Label htmlFor={id} className="font-normal">
        {label}
      </Label>
    </div>
  );

  const { whatsapp } = form;
  const preview = taskWhatsappMessage({
    bedCode: 'SUR-D-04(M)',
    descriptions: ['Change dressing', 'Remove drain'],
    heading: whatsapp.heading.trim() || '…',
    assignedBy: whatsapp.includeAssignedBy ? user.fullName : undefined,
    link: whatsapp.includeLink ? `${window.location.origin}/tasks` : undefined,
  });

  return (
    <form onSubmit={onSubmit} className="mx-auto grid max-w-2xl gap-4">
      <div>
        <h2 className="m-0 text-2xl font-semibold">Setup</h2>
        <p className="m-0 text-sm text-muted-foreground">Turn features on or off for everyone. Changes apply once saved.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>WhatsApp</CardTitle>
          <CardDescription>After assigning tasks, offer a ready-typed WhatsApp message to the doctor.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {switchRow(
            'whatsapp-enabled',
            'Offer "Send on WhatsApp"',
            'The message names only the bed and the tasks, never the patient.',
            whatsapp.enabled,
            set('whatsapp', 'enabled')
          )}
          <div className="grid gap-2">
            <Label htmlFor="whatsapp-heading">Message heading</Label>
            <Input
              id="whatsapp-heading"
              value={whatsapp.heading}
              onChange={(e) => set('whatsapp', 'heading')(e.target.value)}
              maxLength={SETTINGS_HEADING_MAX_LENGTH}
              disabled={!whatsapp.enabled}
              aria-invalid={Boolean(errors['whatsapp.heading'])}
            />
            {fieldError('whatsapp.heading')}
          </div>
          {checkRow('whatsapp-assigned-by', 'Include "Assigned by …"', whatsapp.includeAssignedBy, set('whatsapp', 'includeAssignedBy'), !whatsapp.enabled)}
          {checkRow('whatsapp-link', 'Include a link to My tasks', whatsapp.includeLink, set('whatsapp', 'includeLink'), !whatsapp.enabled)}
          <div className="grid gap-2">
            <span className="text-sm font-medium">Preview</span>
            <pre className="m-0 rounded-md bg-muted p-3 font-sans text-sm whitespace-pre-wrap break-words">{preview}</pre>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Phone numbers</CardTitle>
          <CardDescription>Country code filled in when adding staff. Each number can still be changed.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          <Label htmlFor="default-country-code">Default country code</Label>
          <Input
            id="default-country-code"
            className="w-28"
            value={form.phone.defaultCountryCode}
            onChange={(e) => set('phone', 'defaultCountryCode')(e.target.value)}
            maxLength={5}
            aria-invalid={Boolean(errors['phone.defaultCountryCode'])}
          />
          {fieldError('phone.defaultCountryCode')}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ward features</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {switchRow(
            'bed-allocation',
            'Bed allocation',
            'Allocate beds to doctors, and show who is responsible for each bed on the Ward page. Saved allocations are kept while it is off.',
            form.bedAllocation.enabled,
            set('bedAllocation', 'enabled')
          )}
          {switchRow(
            'archive',
            'Archive',
            "The Archive page and the notices about undone tasks from earlier days. Tasks aren't deleted while it is off.",
            form.archive.enabled,
            set('archive', 'enabled')
          )}
        </CardContent>
      </Card>

      {error && <p className="m-0 text-sm text-destructive">{error}</p>}
      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-sm text-emerald-700 dark:text-emerald-400">Saved</span>}
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  );
}
