import { config } from './config.js';

const tidy = (value) => String(value ?? '').trim() || null;

// HMIS dates arrive as local wall-clock ISO ('2026-11-05T19:39:00'); older feeds sent '11/2/2026 9:05:00 AM'
// (month first). Both become '2026-11-02T09:05' with no timezone, so the browser shows the same time.
export function parseHmisDate(value) {
  const text = String(value ?? '').trim();
  const iso = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/.exec(text);
  if (iso) return iso[1];
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{2})(?::\d{2})? ?([AP]M)$/i.exec(text);
  if (!m) return null;
  const [, month, day, year, h, minute, ampm] = m;
  const hour = (Number(h) % 12) + (ampm.toUpperCase() === 'PM' ? 12 : 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${minute}`;
}

const newestFirst = (key) => (a, b) => (b[key] ?? '').localeCompare(a[key] ?? '');

function toNote(row) {
  const extra = [
    ['Tests', row.tests],
    ['Plan', row.plans],
    ['Remarks', row.remarks],
    ['Consultant review', row.consultantReview],
  ]
    .filter(([, value]) => tidy(value))
    .map(([label, value]) => `${label}: ${String(value).trim()}`);
  const text = [String(row.notes ?? '').trim(), ...extra].filter(Boolean).join('\n\n');
  return {
    writtenAt: parseHmisDate(row.notesDate),
    signedAt: parseHmisDate(row.signedDate),
    author: tidy(row.writerUserName),
    location: tidy(row.patientLocationDesc),
    clinic: tidy(row.clinicDesc),
    specialty: tidy(row.clinicSpecialtyDesc),
    text: text.replace(/\r\n?/g, '\n'),
  };
}

// HMIS attaches every result of a test to each order of it (all CBCs carry all CBC results), and sends
// each value twice with different range texts. So results are de-duplicated across orders and grouped
// by test and report date. `normal: 'N'` marks a value outside the range.
function toLabs(investigations) {
  const seen = new Set();
  const panels = new Map();
  for (const inv of investigations) {
    for (const r of inv.results ?? []) {
      const value = [tidy(r.resultText) ?? tidy(r.resultValue) ?? (r.resultNumeric ?? null), tidy(r.symbol)]
        .filter((v) => v !== null)
        .join(' ');
      if (!value) continue; // section headings such as 'Hepatitis B Profile'
      const reportedAt = parseHmisDate(r.reportDate);
      const key = [r.parameterId, reportedAt, value].join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      const name = tidy(inv.investigationName);
      const panelKey = `${name}|${reportedAt}`;
      if (!panels.has(panelKey)) {
        panels.set(panelKey, { name, department: tidy(inv.departmentName), reportedAt, results: [] });
      }
      panels.get(panelKey).results.push({
        name: tidy(r.parameterName),
        value,
        range: tidy(r.rangeText),
        abnormal: r.normal === 'N',
      });
    }
  }
  return [...panels.values()].sort(newestFirst('reportedAt'));
}

// Orders with no results in the feed: imaging, ECG, and tests still pending. Billing items such as
// 'PRIVATE ROOM' come through as LAB orders from Inpatient Services and are left out.
function toOtherInvestigations(investigations) {
  const seen = new Set();
  return investigations
    .filter((inv) => !inv.results?.length && inv.trnDate && !/inpatient services/i.test(inv.departmentName ?? ''))
    .map((inv) => ({
      name: tidy(inv.investigationName),
      department: tidy(inv.departmentName),
      orderedAt: parseHmisDate(inv.trnDate),
      reportedAt: parseHmisDate(inv.reportDate),
      reportAvailable: inv.reportAvailable === 'Y',
    }))
    .filter((inv) => {
      const key = `${inv.name}|${inv.orderedAt}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort(newestFirst('orderedAt'));
}

// HMIS clinical history -> { patient, notes, labs, otherInvestigations }, newest first.
export function toHistoryDto(body) {
  const rows = Array.isArray(body?.physicianNotes) ? body.physicianNotes : [];
  const investigations = Array.isArray(body?.investigations) ? body.investigations : [];
  const first = rows[0];
  const patient = first && {
    mrNumber: tidy(first.patientMrno),
    name: tidy(first.patientName),
    age: tidy(first.age),
    sex: tidy(first.sexDesc),
  };
  return {
    patient: patient ?? null,
    notes: rows.map(toNote).sort(newestFirst('writtenAt')),
    labs: toLabs(investigations),
    otherInvestigations: toOtherInvestigations(investigations),
  };
}

export async function fetchClinicalHistory(mr) {
  const url = `${config.clinicalHistoryApi.url}?mrno=${encodeURIComponent(mr)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(config.clinicalHistoryApi.timeoutMs) });
  if (!res.ok) throw new Error(`HMIS clinical history API responded ${res.status}`);
  const body = await res.json();
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('HMIS clinical history API did not return an object');
  return toHistoryDto(body);
}
