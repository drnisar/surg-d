// Lab results from HMIS, arranged for the lab page: one trend table per test, parameters as rows and
// report times as columns (newest first). `panels` are the server's labs:
// [{ name, department, reportedAt: 'YYYY-MM-DDTHH:mm', results: [{ name, value, range, abnormal }] }].

// Checked in order; the first match names the category. Tests that match none are 'Other'.
export const LAB_CATEGORIES = [
  { key: 'cbc', label: 'Blood count', pattern: /\bcbc\b|blood count|haemogram|hemogram|\bhb\b|platelet|retic/i },
  { key: 'coag', label: 'Coagulation', pattern: /\bpt\b|\binr\b|aptt|\bptt\b|coagul|d-?dimer|fibrinogen|bleeding time|clotting/i },
  { key: 'rft', label: 'Renal & electrolytes', pattern: /\brft\b|renal|urea|creat|electrolyte|sodium|potassium|\bna\b|\bk\+?\b|chloride|calcium|magnesium|phosph|uric/i },
  { key: 'inflammation', label: 'Inflammation', pattern: /\bcrp\b|\besr\b|procalcitonin|ferritin|reactive protein/i },
  { key: 'lft', label: 'Liver', pattern: /\blft\b|liver|bilirubin|\balt\b|\bast\b|\balp\b|\bggt\b|albumin|protein/i },
  { key: 'sugar', label: 'Glucose', pattern: /glucose|sugar|hba1c|glyco|\bbsr\b|\bbsf\b/i },
  { key: 'serology', label: 'Serology', pattern: /hbsag|hcv|\bhiv\b|\bict\b|dengue|typhi|widal|serolog|antibod|antigen|viral|malaria/i },
  { key: 'lipids', label: 'Lipids', pattern: /lipid|cholesterol|triglycer|\bhdl\b|\bldl\b/i },
  { key: 'micro', label: 'Cultures & urine', pattern: /culture|sensitivity|gram stain|urine|\bc\/s\b|\br\/e\b|stool|sputum|swab|fluid/i },
  { key: 'pancreas', label: 'Pancreas', pattern: /amylase|lipase/i },
  { key: 'gas', label: 'Blood gases', pattern: /\babg\b|\bvbg\b|blood gas|lactate/i },
];

const OTHER = { key: 'other', label: 'Other' };

export function labCategory(testName) {
  return LAB_CATEGORIES.find((c) => c.pattern.test(testName ?? '')) ?? OTHER;
}

const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

// Rows read in the order a ward round reads them; parameters that match none follow in HMIS order.
const ROW_ORDER = [
  /^(hgb|hb|haemoglobin|hemoglobin)\b/i, /^(wbc|tlc)\b|white/i, /^(plt|platelet)/i, /neut/i, /lymp/i,
  /^(hct|pcv)\b/i, /^mcv\b/i, /urea|^bu\b/i, /creat/i, /sodium|^na\b/i, /potassium|^k\b/i, /chloride|^cl\b/i,
  /bili/i, /^alt\b|sgpt/i, /^ast\b|sgot/i, /^alp\b|alkaline/i, /albumin/i, /^pt\b|prothrombin/i, /inr/i, /aptt/i,
  /crp/i, /glucose|hba1c/i,
];
const rowRank = (name) => {
  const i = ROW_ORDER.findIndex((re) => re.test(name));
  return i === -1 ? ROW_ORDER.length : i;
};
const newestFirst = (a, b) => b.localeCompare(a);

// panels -> [{ name, category, times, rows: [{ name, range, cells: { [time]: { value, abnormal } } }] }]
export function buildLabTrends(panels = []) {
  const tests = new Map();
  for (const panel of [...panels].sort((a, b) => newestFirst(a.reportedAt ?? '', b.reportedAt ?? ''))) {
    const name = clean(panel.name);
    const time = panel.reportedAt ?? '';
    if (!tests.has(name)) tests.set(name, { name, category: labCategory(name).key, times: [], rows: new Map() });
    const test = tests.get(name);
    if (!test.times.includes(time)) test.times.push(time);
    for (const r of panel.results ?? []) {
      const rowName = clean(r.name);
      if (!test.rows.has(rowName)) test.rows.set(rowName, { name: rowName, range: null, cells: {} });
      const row = test.rows.get(rowName);
      row.range ??= r.range || null; // panels come newest first, so this is the latest range
      row.cells[time] ??= { value: r.value, abnormal: Boolean(r.abnormal) };
    }
  }
  return [...tests.values()].map((t) => ({
    ...t,
    times: t.times.sort(newestFirst),
    rows: [...t.rows.values()].sort((a, b) => rowRank(a.name) - rowRank(b.name)), // stable: ties keep HMIS order
  }));
}

// Keeps the columns whose time passes `keep`; rows left with no values and tests left with none are dropped.
function keepTimes(trend, keep) {
  const times = trend.times.filter(keep);
  const rows = trend.rows
    .map((row) => ({ ...row, cells: Object.fromEntries(Object.entries(row.cells).filter(([t]) => keep(t))) }))
    .filter((row) => Object.keys(row.cells).length);
  return times.length && rows.length ? { ...trend, times, rows } : null;
}

// Splits trends at a local 'YYYY-MM-DD' (e.g. the admission date): { recent, earlier }.
export function splitLabTrends(trends, since) {
  if (!since) return { recent: trends, earlier: [] };
  const isRecent = (t) => t.slice(0, 10) >= since;
  return {
    recent: trends.map((t) => keepTimes(t, isRecent)).filter(Boolean),
    earlier: trends.map((t) => keepTimes(t, (time) => !isRecent(time))).filter(Boolean),
  };
}

// `query` matches test or parameter names; a parameter match keeps just the matching rows.
// `abnormalOnly` keeps rows with an out-of-range value in any shown column.
export function filterLabTrends(trends, { query = '', category = 'all', abnormalOnly = false } = {}) {
  const q = clean(query).toLowerCase();
  return trends
    .filter((t) => category === 'all' || t.category === category)
    .map((t) => {
      let rows = t.rows;
      if (q && !t.name.toLowerCase().includes(q)) rows = rows.filter((r) => r.name.toLowerCase().includes(q));
      if (abnormalOnly) rows = rows.filter((r) => Object.values(r.cells).some((c) => c.abnormal));
      return { ...t, rows };
    })
    .filter((t) => t.rows.length);
}

const latestAbnormal = (t) => t.rows.some((r) => r.cells[t.times[0]]?.abnormal);
const anyAbnormal = (t) => t.rows.some((r) => Object.values(r.cells).some((c) => c.abnormal));

export const LAB_SORTS = [
  { key: 'abnormal', label: 'Abnormal first' },
  { key: 'latest', label: 'Most recent first' },
  { key: 'name', label: 'Test name A–Z' },
];

// 'abnormal': out of range in the latest result, then out of range earlier, then most recent first.
export function sortLabTrends(trends, sort = 'abnormal') {
  const byLatest = (a, b) => newestFirst(a.times[0] ?? '', b.times[0] ?? '') || a.name.localeCompare(b.name);
  const compare = {
    latest: byLatest,
    name: (a, b) => a.name.localeCompare(b.name),
    abnormal: (a, b) => latestAbnormal(b) - latestAbnormal(a) || anyAbnormal(b) - anyAbnormal(a) || byLatest(a, b),
  }[sort] ?? byLatest;
  return [...trends].sort(compare);
}

export const isAbnormalTrend = anyAbnormal;
