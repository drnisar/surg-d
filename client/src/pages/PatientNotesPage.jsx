import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { FileText, FlaskConical, Sparkles } from 'lucide-react';
import { api } from '../api.js';
import CaseSummaryDialog from '../components/CaseSummaryDialog.jsx';
import PatientHeader from '../components/PatientHeader.jsx';
import SoapNoteDialog from '../components/SoapNoteDialog.jsx';
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

// A patient's physician notes from HMIS, opened from the Ward; lab results are on their own page. The Ward
// passes the bed in `state` so the header shows at once; the record comes from the server, fetched fresh.
export default function PatientNotesPage() {
  const { mr } = useParams();
  const bed = useLocation().state?.bed;
  const [data, setData] = useState(null); // { patient, notes, … }
  const [error, setError] = useState('');
  const [writing, setWriting] = useState(false);
  const [summarising, setSummarising] = useState(false);

  const load = useCallback(async () => {
    setError('');
    setData(null);
    try {
      setData(await api(`/patients/${encodeURIComponent(mr)}/history`));
    } catch (err) {
      setError(err.message);
    }
  }, [mr]);

  useEffect(() => {
    load();
  }, [load]);

  const patient = data?.patient;

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <PatientHeader mr={mr} patient={patient} bed={bed} fallback="/ward" />

      <div className="flex flex-wrap items-center gap-3">
        <h3 className="m-0 flex-1 text-base font-semibold">Physician notes from HMIS</h3>
        <Button size="sm" variant="outline" asChild>
          <Link to={`/patients/${encodeURIComponent(mr)}/labs`} state={{ bed }}>
            <FlaskConical />
            Lab results
          </Link>
        </Button>
        <Button size="sm" variant="outline" disabled={!data?.notes.length} onClick={() => setSummarising(true)}>
          <FileText />
          Case summary
        </Button>
        <Button size="sm" onClick={() => setWriting(true)}>
          <Sparkles />
          Write SOAP note
        </Button>
      </div>

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

      {summarising && (
        <CaseSummaryDialog
          mrNumber={mr}
          name={patient?.name ?? bed?.patientName}
          patient={patient}
          bed={bed}
          notes={data.notes}
          onClose={() => setSummarising(false)}
        />
      )}
      {writing && <SoapNoteDialog patient={patient} bed={bed} onClose={() => setWriting(false)} />}
    </div>
  );
}
