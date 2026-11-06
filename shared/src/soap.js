// Values a doctor enters for the daily SOAP note on the patient notes page. All optional; `max` caps each one.
// Deliberately no name, MR number or bed: the prompt goes to the doctor's own AI chat.
export const SOAP_FIELDS = [
  { key: 'age', label: 'Age', section: 'context', max: 20 },
  { key: 'sex', label: 'Sex', section: 'context', max: 10 },
  { key: 'hospitalDay', label: 'Day of admission', section: 'context', max: 10 },
  { key: 'complaints', label: 'Complaints', section: 'S', max: 600, multiline: true, placeholder: 'e.g. mild pain at wound site, no vomiting' },
  { key: 'pain', label: 'Pain score (0-10)', section: 'S', max: 20, placeholder: '3/10' },
  { key: 'diet', label: 'Diet', section: 'S', max: 100, placeholder: 'NPO / sips / liquids / soft' },
  { key: 'bowels', label: 'Bowels / flatus', section: 'S', max: 100, placeholder: 'passed flatus, no BM' },
  { key: 'urine', label: 'Urine', section: 'S', max: 100, placeholder: 'voiding / catheter' },
  { key: 'bp', label: 'BP', section: 'O', max: 20, placeholder: '120/80' },
  { key: 'pulse', label: 'Pulse', section: 'O', max: 20, placeholder: '84/min' },
  { key: 'temperature', label: 'Temperature', section: 'O', max: 20, placeholder: '98.6 F' },
  { key: 'rr', label: 'Respiratory rate', section: 'O', max: 20, placeholder: '18/min' },
  { key: 'spo2', label: 'SpO2', section: 'O', max: 20, placeholder: '97% on air' },
  { key: 'intakeOutput', label: 'Intake / output', section: 'O', max: 100, placeholder: '2000 / 1500 ml' },
  { key: 'drain', label: 'Drain output', section: 'O', max: 100, placeholder: '50 ml serous' },
  { key: 'examination', label: 'Examination', section: 'O', max: 800, multiline: true, placeholder: 'abdomen soft, mildly tender, BS present' },
  { key: 'wound', label: 'Wound', section: 'O', max: 200, placeholder: 'clean, dry' },
  { key: 'investigations', label: 'Labs / imaging', section: 'O', max: 800, multiline: true, placeholder: 'Hb 11.2, TLC 9.8, Cr 0.9' },
  { key: 'diagnosis', label: 'Diagnosis / procedure', section: 'A', max: 300, placeholder: 'post open cholecystectomy' },
  { key: 'postOpDay', label: 'Post-op day', section: 'A', max: 10, placeholder: '2' },
  { key: 'condition', label: 'Condition', section: 'A', max: 30, placeholder: 'improving / stable / deteriorating' },
  { key: 'assessment', label: 'Other assessment', section: 'A', max: 600, multiline: true },
  { key: 'plan', label: 'Plan', section: 'P', max: 1000, multiline: true, placeholder: 'continue IV antibiotics, mobilise, remove drain if < 30 ml' },
];

// Trims and caps the values and drops empty ones. `error` is set when no finding or plan is given.
export function cleanSoapValues(values) {
  const data = {};
  for (const { key, max } of SOAP_FIELDS) {
    const value = String(values?.[key] ?? '').trim().slice(0, max);
    if (value) data[key] = value;
  }
  const clinical = SOAP_FIELDS.some((f) => f.section !== 'context' && data[f.key]);
  return { data, error: clinical ? null : 'Enter at least one finding or plan' };
}

const INSTRUCTIONS = `You write daily progress notes for a general surgery ward.
Turn the values below into a concise SOAP note in plain text with the headings S:, O:, A:, P:.
Rules:
- Use only the values given. Never invent or assume vitals, findings, results, diagnoses or plans.
- Leave out anything not provided; don't write "not recorded". Omit a heading only if nothing belongs under it.
- Put vitals on one line. Keep the doctor's numbers and units exactly.
- Expand abbreviations only where the meaning is certain; otherwise keep them.
- Short clinical sentences or brief bullet lines, no preamble, no sign-off, no markdown formatting.
- Reply with the note only. Don't add patient names or identifiers.`;

const SECTIONS = { context: 'Patient', S: 'Subjective', O: 'Objective', A: 'Assessment', P: 'Plan' };

export function buildSoapPrompt(data) {
  const lines = [];
  for (const [section, title] of Object.entries(SECTIONS)) {
    const fields = SOAP_FIELDS.filter((f) => f.section === section && data[f.key]);
    if (!fields.length) continue;
    lines.push(`${title}:`, ...fields.map((f) => `- ${f.label}: ${data[f.key]}`));
  }
  return `${INSTRUCTIONS}\n\nValues:\n${lines.join('\n')}`;
}
