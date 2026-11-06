import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addableDesignations, buildMrNumber, canEditEmployee, taskWhatsappMessage, employeeCodeOf, isValidEmployeeMr, normalizePhone, parseMrNumber, roleForDesignation, whatsappUrl, withDefaults, aiChatUrl, buildCaseSummaryPrompt, CASE_SUMMARY_KINDS, buildSoapPrompt, cleanSoapValues, redactIdentifiers } from '@surg-d/shared';
import { validateSettings } from '../src/settings.js';
import { validateEmployee, validatePasswordChange } from '../src/employees.js';

test('builds MR number from employee code', () => {
  assert.equal(buildMrNumber('1100'), 'K0360000001100');
  assert.equal(buildMrNumber(42), 'K0360000000042');
  assert.equal(buildMrNumber('12345678'), 'K0360012345678');
  assert.throws(() => buildMrNumber('123456789'));
  assert.throws(() => buildMrNumber('abc'));
  assert.throws(() => buildMrNumber('0'));
  // A type digit and hyphen set the 4th character; the code still fills the last 8.
  assert.equal(buildMrNumber('5-1234'), 'K0350000001234');
  assert.equal(buildMrNumber(' 9-42 '), 'K0390000000042');
  assert.throws(() => buildMrNumber('55-1234'));
  assert.throws(() => buildMrNumber('5-'));
  assert.throws(() => buildMrNumber('5-0'));
  assert.equal(employeeCodeOf('K0350000001234'), '5-1234');
  assert.equal(employeeCodeOf('K0360000001100'), '1100');
});

test('parses and validates MR number', () => {
  assert.deepEqual(parseMrNumber('K0360000001100'), {
    hospitalCode: 'K03',
    employeeType: '6',
    dependent: '00',
    employeeCode: '1100',
  });
  assert.ok(isValidEmployeeMr('k0360000001100'));
  assert.ok(isValidEmployeeMr('K0350000001100')); // any employee type digit
  assert.ok(!isValidEmployeeMr('K0360100001100'));
  assert.ok(!isValidEmployeeMr('K036000000110'));
});

test('normalises phone numbers and drops leading zero', () => {
  assert.deepEqual(normalizePhone('+92', '0300-1234567'), {
    countryCode: '+92',
    phoneNumber: '3001234567',
    full: '+923001234567',
  });
  assert.equal(normalizePhone('92', '3001234567').full, '+923001234567');
  assert.throws(() => normalizePhone('', '3001234567'));
  assert.throws(() => normalizePhone('+92', '03ab'));
});

test('maps designation to role', () => {
  assert.equal(roleForDesignation('associate_professor'), 'consultant');
  assert.equal(roleForDesignation('trainee_registrar'), 'manager');
  assert.equal(roleForDesignation('house_officer'), 'doctor');
  assert.equal(roleForDesignation('nurse'), 'nurse');
});

test('validateEmployee derives MR number and role', () => {
  const { data, errors } = validateEmployee({
    employeeCode: '1100',
    fullName: '  Ali   Khan ',
    email: 'Ali@Example.com',
    officialEmail: 'ali.khan@kth.gov.pk',
    countryCode: '+92',
    phoneNumber: '03001234567',
    designation: 'trainee_registrar',
    role: 'doctor', // ignored: role comes from designation
  });
  assert.equal(errors, null);
  assert.equal(data.mr_number, 'K0360000001100');
  assert.equal(data.full_name, 'Ali Khan');
  assert.equal(data.email, 'ali@example.com');
  assert.equal(data.phone_number, '3001234567');
  assert.equal(data.role, 'manager');
});

test('validateEmployee reports missing fields', () => {
  const { errors } = validateEmployee({});
  assert.deepEqual(Object.keys(errors).sort(), ['designation', 'email', 'employeeCode', 'fullName', 'officialEmail', 'phoneNumber']);
  assert.equal(validateEmployee({ fullName: 'X' }, { partial: true }).errors, null);
});

test('whatsappUrl keeps only the digits of a full number', () => {
  assert.equal(whatsappUrl('+923001234567'), 'https://wa.me/923001234567');
  assert.equal(whatsappUrl(''), null);
  assert.equal(whatsappUrl(undefined), null);
});

test('validatePasswordChange checks both fields', () => {
  assert.equal(validatePasswordChange({ currentPassword: 'old-pass-1', newPassword: 'new-pass-1' }).errors, null);
  assert.ok(validatePasswordChange({ newPassword: 'new-pass-1' }).errors.currentPassword);
  assert.ok(validatePasswordChange({ currentPassword: 'old-pass-1', newPassword: 'short' }).errors.newPassword);
  assert.ok(validatePasswordChange({ currentPassword: 'same-pass-1', newPassword: 'same-pass-1' }).errors.newPassword);
});

test('addableDesignations: admin adds anyone, an ER adds TMOs and HOs, others nobody', () => {
  assert.ok(addableDesignations({ role: 'admin', designation: null }).includes('professor'));
  assert.deepEqual(addableDesignations({ role: 'manager', designation: 'experiential_registrar' }), [
    'trainee_medical_officer',
    'house_officer',
  ]);
  assert.deepEqual(addableDesignations({ role: 'manager', designation: 'trainee_registrar' }), []);
  assert.deepEqual(addableDesignations({ role: 'consultant', designation: 'professor' }), []);
});

test('canEditEmployee: an ER edits only TMOs and HOs, the admin anyone', () => {
  const er = { role: 'manager', designation: 'experiential_registrar' };
  assert.equal(canEditEmployee(er, { designation: 'house_officer' }), true);
  assert.equal(canEditEmployee(er, { designation: 'trainee_medical_officer' }), true);
  assert.equal(canEditEmployee(er, { designation: 'experiential_registrar' }), false);
  assert.equal(canEditEmployee(er, { designation: null }), false);
  assert.equal(canEditEmployee({ role: 'doctor', designation: 'house_officer' }, { designation: 'house_officer' }), false);
  assert.equal(canEditEmployee({ role: 'admin', designation: null }, { designation: 'professor' }), true);
});

test('whatsappUrl: pre-fills text when given', () => {
  assert.equal(whatsappUrl('+923001234567'), 'https://wa.me/923001234567');
  assert.equal(whatsappUrl('+923001234567', 'a b'), 'https://wa.me/923001234567?text=a%20b');
  assert.equal(whatsappUrl('', 'x'), null);
});

test('taskWhatsappMessage: one line for one task, bullets for several, no patient details', () => {
  const one = taskWhatsappMessage({ bedCode: 'SUR-D-04(M)', descriptions: ['Change dressing'], assignedBy: 'Dr A', link: 'https://x/tasks' });
  assert.equal(one, 'Surgical D Ward — new task for bed SUR-D-04(M): Change dressing\nAssigned by Dr A.\nOpen My tasks: https://x/tasks');
  const many = taskWhatsappMessage({ bedCode: 'PR-A-10', descriptions: ['Remove drain', 'Pass NG tube'] });
  assert.equal(many, 'Surgical D Ward — new tasks for bed PR-A-10:\n• Remove drain\n• Pass NG tube');
});

test('settings fall back to defaults', () => {
  const s = withDefaults({ whatsapp: { enabled: false }, archive: { enabled: false } });
  assert.equal(s.whatsapp.enabled, false);
  assert.equal(s.whatsapp.heading, 'Surgical D Ward');
  assert.equal(s.archive.enabled, false);
  assert.equal(s.bedAllocation.enabled, true);
  assert.equal(withDefaults(null).phone.defaultCountryCode, '+92');
});

test('validates settings', () => {
  const ok = validateSettings({ ...withDefaults(), whatsapp: { ...withDefaults().whatsapp, heading: '  Surg  D ' }, phone: { defaultCountryCode: '44' } });
  assert.equal(ok.data.whatsapp.heading, 'Surg D');
  assert.equal(ok.data.phone.defaultCountryCode, '+44');
  const bad = validateSettings({ ...withDefaults(), whatsapp: { ...withDefaults().whatsapp, heading: ' ', enabled: 'yes' }, phone: { defaultCountryCode: '+12345' } });
  assert.ok(bad.errors['whatsapp.heading']);
  assert.ok(bad.errors['whatsapp.enabled']);
  assert.ok(bad.errors['phone.defaultCountryCode']);
  assert.ok(validateSettings({}).errors['archive.enabled']);
});

test('WhatsApp message uses a custom heading', () => {
  assert.equal(taskWhatsappMessage({ bedCode: 'B1', descriptions: ['X'], heading: 'Surg D' }), 'Surg D — new task for bed B1: X');
});

test('cleans SOAP note values', () => {
  const { data, error } = cleanSoapValues({ age: ' 45 Year(s) ', bp: '120/80', pulse: '', plan: 'Continue antibiotics', name: 'Ignored' });
  assert.deepEqual(data, { age: '45 Year(s)', bp: '120/80', plan: 'Continue antibiotics' });
  assert.equal(error, null);
  assert.ok(cleanSoapValues({ age: '45', sex: 'Male' }).error);
  assert.equal(cleanSoapValues({ bp: 'x'.repeat(30) }).data.bp.length, 20);
});

test('SOAP prompt holds only the given values and no identifiers', () => {
  const { data } = cleanSoapValues({ sex: 'Female', complaints: 'Mild pain', bp: '110/70', plan: 'Mobilise', name: 'X', mrNumber: 'K03' });
  const prompt = buildSoapPrompt(data);
  assert.ok(prompt.endsWith('Values:\nPatient:\n- Sex: Female\nSubjective:\n- Complaints: Mild pain\nObjective:\n- BP: 110/70\nPlan:\n- Plan: Mobilise'));
  assert.ok(!/K03/.test(prompt));
});

test('AI chat links carry the prompt', () => {
  assert.equal(aiChatUrl('chatgpt', 'a b'), 'https://chatgpt.com/?q=a%20b');
  assert.equal(aiChatUrl('claude', 'S: 1/2'), 'https://claude.ai/new?q=S%3A%201%2F2');
  assert.equal(aiChatUrl('claude', ''), 'https://claude.ai/new');
  assert.equal(aiChatUrl('copilot', 'a'), 'https://copilot.microsoft.com/?q=a');
  assert.equal(aiChatUrl('claude', 'a b', { app: true }), 'claude://claude.ai/new?q=a%20b');
  assert.equal(aiChatUrl('copilot', 'a', { app: true }), 'ms-copilot:chat?q=a');
  assert.equal(aiChatUrl('chatgpt', 'a', { app: true }), 'https://chatgpt.com/?q=a');
});

test('replaces the patient name and MR number in note text', () => {
  const ids = { name: 'Ali  Khan', mrNumber: 'K0360000001100' };
  assert.equal(redactIdentifiers('ALI KHAN (k0360000001100) seen. Ali Khan stable.', ids), 'the patient ([MR]) seen. the patient stable.');
  assert.equal(redactIdentifiers('a+b (x)', { name: 'a+b' }), 'the patient (x)');
});

test('case summary prompt lists notes oldest first without authors or identifiers', () => {
  const notes = [
    { writtenAt: '2026-11-02T09:05', specialty: 'Surgery', author: 'Dr Z', text: 'Ali Khan improving' },
    { writtenAt: '2026-11-01T08:00', clinic: 'ER', author: 'Dr Y', text: 'Admitted, MR K0360000001100' },
    { writtenAt: '2026-10-31T08:00', text: '  ' },
  ];
  const { prompt, included, omitted } = buildCaseSummaryPrompt({ age: '45', sex: 'Male', notes, name: 'Ali Khan', mrNumber: 'K0360000001100' });
  assert.equal(included, 2);
  assert.equal(omitted, 0);
  assert.ok(prompt.indexOf('2026-11-01 08:00 · ER') < prompt.indexOf('2026-11-02 09:05 · Surgery'));
  assert.ok(!/Ali|K036|Dr [YZ]/.test(prompt));
  assert.ok(buildCaseSummaryPrompt({ notes: [] }).error);
  assert.ok(buildCaseSummaryPrompt({ notes: [], extra: 'Fever today' }).prompt.endsWith('Added by the doctor today:\nFever today'));
});

test('case summary keeps the newest notes when they are too long', () => {
  const notes = ['new', 'mid', 'old'].map((t) => ({ writtenAt: '2026-11-01T08:00', text: t.repeat(4000) }));
  const { included, omitted, prompt } = buildCaseSummaryPrompt({ notes });
  assert.equal(included, 1);
  assert.equal(omitted, 2);
  assert.ok(prompt.includes('newnew') && !prompt.includes('oldold'));
});

test('case summary uses the chosen kind, handover by default', () => {
  const notes = [{ writtenAt: '2026-11-01T08:00', text: 'Post-op day 1' }];
  for (const { key, task } of CASE_SUMMARY_KINDS) {
    assert.ok(buildCaseSummaryPrompt({ kind: key, notes }).prompt.startsWith(task));
  }
  assert.ok(buildCaseSummaryPrompt({ notes }).prompt.startsWith(CASE_SUMMARY_KINDS[0].task));
  assert.equal(CASE_SUMMARY_KINDS[0].key, 'handover');
  assert.ok(buildCaseSummaryPrompt({ kind: 'nope', notes }).error);
});
