import { config } from './config.js';

const tidy = (value) => String(value ?? '').trim().replace(/\s+/g, ' ');

// Hospital API rows -> one entry per ward bed, sorted by code. Excluded pseudo-beds are dropped.
// If the API ever lists two patients on one bed, the most recent admission wins.
export function normaliseBeds(rows, exclude = []) {
  const byCode = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const code = tidy(row.BedId).toUpperCase();
    if (!code || exclude.includes(code)) continue;
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

async function fetchBeds() {
  const res = await fetch(config.bedsApi.url, { signal: AbortSignal.timeout(config.bedsApi.timeoutMs) });
  if (!res.ok) throw new Error(`Hospital beds API responded ${res.status}`);
  const beds = normaliseBeds(await res.json(), config.bedsApi.excludeBeds);
  cache = { beds, fetchedAt: new Date().toISOString() };
  return cache;
}

// Cached beds. A stale cache is returned (with `stale: true`) if a refresh fails, so the ward keeps working
// while the hospital system is down; concurrent callers share one in-flight request.
export async function getBeds({ refresh = false } = {}) {
  const fresh = cache && Date.now() - Date.parse(cache.fetchedAt) < config.bedsApi.cacheSeconds * 1000;
  if (fresh && !refresh) return { ...cache, stale: false };

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
