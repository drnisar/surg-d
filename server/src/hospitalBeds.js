import { config } from './config.js';
import { pool } from './db.js';

const tidy = (value) => String(value ?? '').trim().replace(/\s+/g, ' ');

// An exclude entry drops that exact bed and, as a group, any bed named `<entry>-...` (ORHB covers ORHB-5).
const isExcluded = (code, exclude) => exclude.some((e) => code === e || code.startsWith(`${e}-`));

// Hospital API rows -> one entry per ward bed, sorted by code. Excluded pseudo-beds are dropped.
// If the API ever lists two patients on one bed, the most recent admission wins.
// The bed field was `BedId` (e.g. K031539) and is now `BedDesc` (e.g. SUR-D-04(M)); both are read.
export function normaliseBeds(rows, exclude = []) {
  const byCode = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const code = tidy(row.BedDesc ?? row.BedId).toUpperCase();
    if (!code || isExcluded(code, exclude)) continue;
    const bed = {
      code,
      patientName: tidy(row.PatientName) || null,
      mrNumber: tidy(row.PatientMRNO).toUpperCase() || null,
      consultantName: tidy(row.DoctorName) || null,
      unit: tidy(row.Speciality) || null,
      admittedAt: row.AdmissionDate || null,
    };
    const existing = byCode.get(code);
    if (!existing || (bed.admittedAt ?? '') > (existing.admittedAt ?? '')) byCode.set(code, bed);
  }
  return [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code, 'en', { numeric: true }));
}

let cache = null; // { beds, fetchedAt }
let inFlight = null;

const isFresh = (c) => c && Date.now() - Date.parse(c.fetchedAt) < config.bedsApi.cacheSeconds * 1000;

// The last list is also kept in the beds_cache table, so other server instances (and a cold start on
// Vercel) can use it. Failures here only cost speed, so they are logged rather than thrown.
async function loadStored() {
  try {
    const [rows] = await pool.query('SELECT beds, fetched_at FROM beds_cache WHERE id = 1');
    if (!rows[0]) return null;
    const { beds, fetched_at: fetchedAt } = rows[0];
    return { beds: typeof beds === 'string' ? JSON.parse(beds) : beds, fetchedAt: new Date(Number(fetchedAt)).toISOString() };
  } catch (err) {
    console.warn(`Could not read stored beds: ${err.message}`);
    return null;
  }
}

async function store({ beds, fetchedAt }) {
  try {
    await pool.query(
      'INSERT INTO beds_cache (id, beds, fetched_at) VALUES (1, ?, ?) ON DUPLICATE KEY UPDATE beds = VALUES(beds), fetched_at = VALUES(fetched_at)',
      [JSON.stringify(beds), Date.parse(fetchedAt)]
    );
  } catch (err) {
    console.warn(`Could not store beds: ${err.message}`);
  }
}

async function fetchBeds() {
  const res = await fetch(config.bedsApi.url, { signal: AbortSignal.timeout(config.bedsApi.timeoutMs) });
  if (!res.ok) throw new Error(`Hospital beds API responded ${res.status}`);
  const rows = await res.json();
  // Anything but a list (e.g. an error object) must not replace the last good list with an empty ward.
  if (!Array.isArray(rows)) {
    const shape = rows && typeof rows === 'object' ? `object with keys ${Object.keys(rows).join(', ')}` : typeof rows;
    throw new Error(`Hospital beds API returned ${shape}, not a list`);
  }
  const beds = normaliseBeds(rows, config.bedsApi.excludeBeds);
  console.log(`Hospital beds API: ${rows.length} rows, ${beds.length} beds`);
  cache = { beds, fetchedAt: new Date().toISOString() };
  await store(cache);
  return cache;
}

// Cached beds. A stale cache is returned (with `stale: true`) if a refresh fails, so the ward keeps working
// while the hospital system is down; concurrent callers share one in-flight request.
export async function getBeds({ refresh = false } = {}) {
  if (!refresh) {
    if (isFresh(cache)) return { ...cache, stale: false };
    const stored = await loadStored();
    if (stored && (!cache || stored.fetchedAt > cache.fetchedAt)) cache = stored;
    if (isFresh(cache)) return { ...cache, stale: false };
  }

  inFlight ??= fetchBeds().finally(() => {
    inFlight = null;
  });
  try {
    return { ...(await inFlight), stale: false };
  } catch (err) {
    if (cache) {
      console.warn(`Beds refresh failed, serving cached list: ${err.message}`);
      return { ...cache, stale: true };
    }
    throw err;
  }
}

export async function findBed(code) {
  const { beds } = await getBeds();
  return beds.find((b) => b.code === code) ?? null;
}
