import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api } from '../api.js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// HMIS times arrive as local wall-clock strings ('2026-11-02T09:05').
const formatNoteTime = (value) =>
  value
    ? new Date(value).toLocaleString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Date not recorded';

// A patient's physician notes from HMIS, opened from the Ward. The Ward passes the bed in `state`
// so the header shows at once; the notes come from the server, which fetches them fresh each time.
export default function PatientNotesPage() {
  const { mr } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const bed = location.state?.bed;
  const [data, setData] = useState(null); // { patient, notes }
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    setData(null);
    try {
      setData(await api(`/patients/${encodeURIComponent(mr)}/notes`));
    } catch (err) {
      setError(err.message);
    }
  }, [mr]);

  useEffect(() => {
    load();
  }, [load]);

  // Opened from a link outside the app there's no page to go back to.
  const back = () => (location.key !== 'default' ? navigate(-1) : navigate('/ward'));

  const patient = data?.patient;
  const name = patient?.name ?? bed?.patientName ?? 'Patient';
  const details = [
    mr,
    [patient?.age, patient?.sex].filter(Boolean).join(', '),
    bed?.code && `Bed ${bed.code}`,
    bed?.consultantName,
  ].filter(Boolean);

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2" onClick={back}>
          <ArrowLeft />
          Back
        </Button>
      </div>

      <div>
        <h2 className="m-0 text-2xl font-semibold">{name}</h2>
        <p className="m-0 text-sm text-muted-foreground">{details.join(' · ')}</p>
      </div>

      <h3 className="m-0 text-base font-semibold">Physician notes from HMIS</h3>

      {error && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="m-0 text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={load}>
            Try again
          </Button>
        </div>
      )}
      {!data && !error && <p className="m-0 text-sm text-muted-foreground">Loading notes from HMIS…</p>}

      {data && !data.notes.length && (
        <Card>
          <CardContent className="text-center text-muted-foreground">No notes in HMIS</CardContent>
        </Card>
      )}

      {data?.notes.map((note, i) => (
        <Card key={`${note.writtenAt}-${i}`} className="gap-3">
          <CardHeader>
            <CardTitle className="text-base">{formatNoteTime(note.writtenAt)}</CardTitle>
            <CardDescription>
              {[
                note.author,
                note.location,
                note.clinic,
                note.specialty,
                note.signedAt ? `Signed ${formatNoteTime(note.signedAt)}` : 'Not signed',
              ]
                .filter(Boolean)
                .join(' · ')}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm break-words whitespace-pre-wrap">{note.text || '—'}</CardContent>
        </Card>
      ))}
    </div>
  );
}
