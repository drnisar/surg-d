import { config } from './config.js';

const tidy = (value) => String(value ?? '').trim() || null;

// HMIS dates look like '11/2/2026 9:05:00 AM' (month first, hospital local time). They become
// '2026-11-02T09:05' with no timezone, so the browser shows the same wall-clock time.
export function parseHmisDate(value) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{2})(?::\d{2})? ?([AP]M)$/i.exec(String(value ?? '').trim());
  if (!m) return null;
  const [, month, day, year, h, minute, ampm] = m;
  const hour = (Number(h) % 12) + (ampm.toUpperCase() === 'PM' ? 12 : 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${minute}`;
}

// HMIS rows -> { patient, notes } with the newest note first.
export function toNotesDto(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const first = list[0];
  const patient = first && {
    mrNumber: tidy(first.patienT_MRNO),
    name: tidy(first.patienT_NAME),
    age: tidy(first.age),
    sex: tidy(first.seX_DESC),
  };
  const notes = list
    .map((row) => ({
      writtenAt: parseHmisDate(row.noteS_DATE),
      signedAt: parseHmisDate(row.signeD_DATE),
      author: tidy(row.writeR_USER_NAME),
      location: tidy(row.patienT_LOCATION_DESC),
      clinic: tidy(row.cliniC_DESC),
      specialty: tidy(row.cliniC_SPECIALTY_DESC),
      text: String(row.notes ?? '').replace(/\r\n?/g, '\n').trim(),
    }))
    .sort((a, b) => (b.writtenAt ?? '').localeCompare(a.writtenAt ?? ''));
  return { patient: patient ?? null, notes };
}

export async function fetchPatientNotes(mr) {
  const url = `${config.notesApi.url}?mrno=${encodeURIComponent(mr)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(config.notesApi.timeoutMs) });
  if (!res.ok) throw new Error(`HMIS notes API responded ${res.status}`);
  const rows = await res.json();
  if (!Array.isArray(rows)) throw new Error('HMIS notes API did not return a list');
  return toNotesDto(rows);
}
