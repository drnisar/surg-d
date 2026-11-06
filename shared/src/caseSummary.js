// The case summary prompt built from a patient's HMIS physician notes (and, if chosen, lab results) for
// the doctor's own AI chat.
// The name and MR number are replaced wherever they appear in the notes, and authors aren't sent.
export const CASE_SUMMARY_NOTES_MAX = 20000; // characters of note text; the newest notes are kept
export const CASE_SUMMARY_EXTRA_MAX = 1000;
export const CASE_SUMMARY_LABS_MAX = 6000; // characters of lab lines; the newest result sets are kept

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function redactIdentifiers(text, { name, mrNumber } = {}) {
  let out = text;
  if (mrNumber) out = out.replace(new RegExp(escape(mrNumber), 'gi'), '[MR]');
  if (name?.trim()) out = out.replace(new RegExp(escape(name.trim()).replace(/\s+/g, '\\s+'), 'gi'), 'the patient');
  return out;
}

const RULES = `Rules:
- Use only what the notes say. Never invent or assume findings, results, diagnoses or plans.
- Where notes disagree, prefer the most recent and say so briefly.
- Keep numbers, units and dates as written. Expand abbreviations only where the meaning is certain.
- Short clinical sentences or brief bullet lines, no preamble, no sign-off, no markdown formatting.
- Don't add patient names or identifiers.`;

// The summaries a doctor can ask for. `hint` is the placeholder for "Anything to add".
export const CASE_SUMMARY_KINDS = [
  {
    key: 'handover',
    label: 'Handover summary',
    hint: "e.g. today's findings not yet in HMIS",
    task: `You summarise inpatient cases for a general surgery ward handover.
Using only the physician notes below (oldest first), write a concise current case summary in plain text with these headings:
Presentation, Diagnosis / procedures, Hospital course, Current status, Active issues, Plan.`,
  },
  {
    key: 'discharge',
    label: 'Discharge summary',
    hint: 'e.g. discharge medicines, follow-up date',
    task: `You draft discharge summaries for a general surgery ward.
Using only the physician notes below (oldest first), write a discharge summary in plain text with these headings:
Diagnosis, Procedures (with dates), Hospital course, Condition at discharge, Discharge medication, Advice, Follow-up.
Write "Not documented" under any heading the notes don't cover.`,
  },
  {
    key: 'round',
    label: 'Ward-round presentation',
    hint: "e.g. today's findings, what you want to ask",
    task: `You help a junior doctor present a general surgery inpatient on the consultant ward round.
Using only the physician notes below (oldest first), write a short case presentation in plain text that can be read aloud in under a minute.
Start with a one-line summary (age, sex, day of admission, diagnosis or procedure), then key events so far, today's status, active issues, and questions for the consultant.`,
  },
  {
    key: 'referral',
    label: 'Referral / consult request',
    hint: 'the specialty and your question for them',
    task: `You draft referrals from a general surgery ward to another specialty.
Using only the physician notes below (oldest first), write a brief referral letter in plain text covering: background, relevant hospital course and findings, current status, and the specific question for the other team.
Take the specialty and question from what the doctor added. If no question is given, end with "Question: [to be added]".`,
  },
  {
    key: 'preop',
    label: 'Pre-op assessment',
    hint: 'e.g. planned procedure, latest labs',
    task: `You prepare pre-operative summaries for a general surgery ward.
Using only the physician notes below (oldest first), write a pre-operative assessment in plain text with these headings:
Indication / planned procedure, Comorbidities, Medication (incl. anticoagulants), Relevant investigations, Anaesthetic and surgical risk points, Outstanding before theatre.
Write "Not documented" under any heading the notes don't cover.`,
  },
];

const LABS_RULE = `- Lab results are listed separately, oldest first. A * marks a value outside the reference range, given in brackets. Use them where relevant and point out abnormal or changing values.`;

const oneLine = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

// One line per result set: '2026-11-04 09:00 · CBC: HGB 9.8* (11.5 - 17.5), WBC 7.6'. `labs` are the
// server's panels, newest first; the newest sets that fit within CASE_SUMMARY_LABS_MAX are kept.
function labLines(labs) {
  const lines = [];
  let size = 0;
  for (const panel of labs) {
    const results = (panel.results ?? [])
      .map((r) => `${oneLine(r.name).replace(/\s*\*+$/, '')} ${oneLine(r.value)}${r.abnormal ? `*${r.range ? ` (${oneLine(r.range).slice(0, 80)})` : ''}` : ''}`)
      .join(', ');
    if (!results) continue;
    const line = `${panel.reportedAt?.replace('T', ' ') ?? 'Date not recorded'} · ${oneLine(panel.name)}: ${results}`;
    if (size + line.length > CASE_SUMMARY_LABS_MAX) break;
    lines.push(line);
    size += line.length;
  }
  return lines;
}

// `notes` and `labs` are newest first, as the API returns them.
// Returns { prompt, included, omitted, labsIncluded, labsOmitted, error }.
export function buildCaseSummaryPrompt({ kind = 'handover', age, sex, hospitalDay, notes = [], labs = [], extra = '', name, mrNumber }) {
  const summary = CASE_SUMMARY_KINDS.find((k) => k.key === kind);
  const empty = { prompt: null, included: 0, omitted: 0, labsIncluded: 0, labsOmitted: 0 };
  if (!summary) return { ...empty, error: 'Unknown summary type' };
  const kept = [];
  let size = 0;
  for (const note of notes) {
    const text = redactIdentifiers(String(note.text ?? '').trim(), { name, mrNumber });
    if (!text) continue;
    if (kept.length && size + text.length > CASE_SUMMARY_NOTES_MAX) break;
    const heading = [note.writtenAt?.replace('T', ' ') ?? 'Date not recorded', note.specialty || note.clinic].filter(Boolean).join(' · ');
    kept.push(`--- ${heading} ---\n${text.slice(0, CASE_SUMMARY_NOTES_MAX)}`);
    size += text.length;
  }
  const withText = notes.filter((n) => String(n.text ?? '').trim()).length;
  const added = redactIdentifiers(String(extra).trim().slice(0, CASE_SUMMARY_EXTRA_MAX), { name, mrNumber });
  const labsKept = labLines(labs);
  const labsWithResults = labs.filter((p) => p.results?.length).length;
  if (!kept.length && !labsKept.length && !added) return { ...empty, error: 'There are no notes or lab results to summarise' };

  const patient = [age && `Age: ${age}`, sex && `Sex: ${sex}`, hospitalDay && `Day of admission: ${hospitalDay}`].filter(Boolean);
  const parts = [`${summary.task}\n${RULES}${labsKept.length ? `\n${LABS_RULE}` : ''}`];
  if (patient.length) parts.push(`Patient:\n${patient.join('\n')}`);
  if (kept.length) parts.push(`Notes:\n${kept.reverse().join('\n\n')}`);
  if (labsKept.length) parts.push(`Lab results:\n${labsKept.reverse().join('\n')}`);
  if (added) parts.push(`Added by the doctor today:\n${added}`);
  return {
    prompt: parts.join('\n\n'),
    included: kept.length,
    omitted: withText - kept.length,
    labsIncluded: labsKept.length,
    labsOmitted: labsWithResults - labsKept.length,
    error: null,
  };
}
