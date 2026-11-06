import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normaliseBeds } from '../src/hospitalBeds.js';
import { parseHmisDate, toHistoryDto } from '../src/hospitalHistory.js';
import { createdRangeSql, parseCreatedRange, validateTask } from '../src/tasks.js';

test('parseCreatedRange reads epoch-ms bounds and builds SQL', () => {
  const { range, error } = parseCreatedRange({ from: '1761418800000', to: '1761505200000' });
  assert.equal(error, null);
  assert.deepEqual(createdRangeSql(range), {
    where: ['t.created_at >= FROM_UNIXTIME(?)', 't.created_at < FROM_UNIXTIME(?)'],
    params: [1761418800, 1761505200],
  });
  // Archive: only an upper bound.
  assert.deepEqual(createdRangeSql(parseCreatedRange({ to: '1761418800000' }).range).where, ['t.created_at < FROM_UNIXTIME(?)']);
  assert.deepEqual(createdRangeSql(parseCreatedRange({}).range), { where: [], params: [] });
});

test('parseCreatedRange rejects bad bounds', () => {
  assert.ok(parseCreatedRange({ from: 'yesterday' }).error);
  assert.ok(parseCreatedRange({ to: '-5' }).error);
  assert.ok(parseCreatedRange({ from: '2000', to: '1000' }).error);
});

// Made-up rows in the hospital API's shape.
test('normaliseBeds maps hospital rows, drops excluded beds and sorts by code', () => {
  const rows = [
    { DoctorName: 'Dr  Consultant ', Speciality: 'AP SDW', PatientName: 'Patient  B', PatientMRNO: 'k0300000000002', BedId: 'K031550', AdmissionDate: '2026-10-20T10:00:00' },
    { DoctorName: 'Dr Consultant', Speciality: 'PROF. SDW', PatientName: 'Patient A', PatientMRNO: 'K0300000000001', BedId: 'K031539', AdmissionDate: '2026-10-21T09:00:00' },
    { DoctorName: 'Dr Consultant', Speciality: 'AP SDW', PatientName: 'Holding', PatientMRNO: 'K0300000000003', BedId: 'ORHB-1', AdmissionDate: null },
  ];
  const beds = normaliseBeds(rows, ['ORHB-1']);
  assert.deepEqual(beds.map((b) => b.code), ['K031539', 'K031550']);
  assert.deepEqual(beds[1], {
    code: 'K031550',
    patientName: 'Patient B',
    mrNumber: 'K0300000000002',
    consultantName: 'Dr Consultant',
    unit: 'AP SDW',
    admittedAt: '2026-10-20T10:00:00',
  });
  assert.deepEqual(normaliseBeds(null), []);
});

test('normaliseBeds reads BedDesc and drops a whole excluded group', () => {
  const rows = [
    { PatientMRNO: 'K0300000000001', BedDesc: 'SUR-D-04(M)' },
    { PatientMRNO: 'K0300000000002', BedDesc: 'ORHB-5' },
    { PatientMRNO: 'K0300000000003', BedDesc: 'ORHBX-1' },
    { PatientMRNO: 'K0300000000004', BedId: 'K031539' },
  ];
  assert.deepEqual(normaliseBeds(rows, ['ORHB']).map((b) => b.code), ['K031539', 'ORHBX-1', 'SUR-D-04(M)']);
});

test('validateTask accepts the hospital bed codes with brackets', () => {
  assert.equal(validateTask({ bedCode: 'sur-d-04(m)', description: 'Review', assignedTo: 1 }).data.bedCode, 'SUR-D-04(M)');
  assert.equal(validateTask({ bedCode: 'SUR-D-04(M)', description: 'Review', assignedTo: 1 }).errors, null);
  assert.ok(validateTask({ bedCode: 'SUR D 04', description: 'Review', assignedTo: 1 }).errors.bedCode);
});

test('normaliseBeds keeps the latest admission when a bed is listed twice', () => {
  const beds = normaliseBeds([
    { BedId: 'K031539', PatientMRNO: 'K0300000000001', AdmissionDate: '2026-10-01T09:00:00' },
    { BedId: 'K031539', PatientMRNO: 'K0300000000009', AdmissionDate: '2026-10-25T09:00:00' },
  ]);
  assert.equal(beds.length, 1);
  assert.equal(beds[0].mrNumber, 'K0300000000009');
});

test('validateTask normalises input', () => {
  const { data, errors } = validateTask({ bedCode: 'sdw-07', description: '  Change   dressing ', assignedTo: '4' });
  assert.equal(errors, null);
  assert.deepEqual(data, { bedCode: 'SDW-07', descriptions: ['Change dressing'], assignedTo: 4 });
});

test('validateTask accepts several tasks for one doctor, dropping blanks and duplicates', () => {
  const { data, errors } = validateTask({
    bedCode: 'SDW-01',
    descriptions: ['Remove drain', ' ', 'Pass NG tube', 'Remove  drain'],
    assignedTo: 4,
  });
  assert.equal(errors, null);
  assert.deepEqual(data.descriptions, ['Remove drain', 'Pass NG tube']);
  assert.ok(validateTask({ bedCode: 'SDW-01', descriptions: Array.from({ length: 21 }, (_, i) => `t${i}`), assignedTo: 4 }).errors.description);
  assert.ok(validateTask({ bedCode: 'SDW-01', descriptions: [], assignedTo: 4 }).errors.description);
});

test('validateTask rejects bad input', () => {
  const { errors } = validateTask({ bedCode: 'bad bed!', description: ' ', assignedTo: 'x' });
  assert.deepEqual(Object.keys(errors).sort(), ['assignedTo', 'bedCode', 'description']);
  assert.ok(validateTask({ bedCode: 'SDW-01', description: 'x'.repeat(501), assignedTo: 1 }).errors.description);
});

test('parseHmisDate reads month-first HMIS dates as local wall-clock time', () => {
  assert.equal(parseHmisDate('11/2/2026 9:05:00 AM'), '2026-11-02T09:05');
  assert.equal(parseHmisDate('10/28/2026 3:40:12 PM'), '2026-10-28T15:40');
  assert.equal(parseHmisDate('1/5/2026 12:15:00 AM'), '2026-01-05T00:15');
  assert.equal(parseHmisDate('1/5/2026 12:15:00 PM'), '2026-01-05T12:15');
  assert.equal(parseHmisDate('2026-11-05T19:39:00'), '2026-11-05T19:39');
  assert.equal(parseHmisDate(''), null);
  assert.equal(parseHmisDate('soon'), null);
});

test('toHistoryDto maps HMIS notes, newest first', () => {
  const row = (date, notes, plans = '') => ({
    patientMrno: 'K0300006069690 ', patientName: 'Test Patient', age: '40 Year(s)', sexDesc: 'Male',
    notesDate: date, signedDate: null, writerUserName: 'Dr A', clinicDesc: '', clinicSpecialtyDesc: '',
    patientLocationDesc: 'SUR-D', notes, plans, tests: '', remarks: '', consultantReview: '',
  });
  const dto = toHistoryDto({
    physicianNotes: [row('2026-10-28T15:40:12', 'old'), row('2026-11-02T09:05:00', 'line 1\r\nline 2', 'NPO')],
    investigations: [],
  });
  assert.deepEqual(dto.patient, { mrNumber: 'K0300006069690', name: 'Test Patient', age: '40 Year(s)', sex: 'Male' });
  assert.deepEqual(dto.notes.map((n) => n.writtenAt), ['2026-11-02T09:05', '2026-10-28T15:40']);
  assert.equal(dto.notes[0].text, 'line 1\nline 2\n\nPlan: NPO');
  assert.equal(dto.notes[0].signedAt, null);
  assert.equal(dto.notes[0].clinic, null);
  assert.deepEqual(toHistoryDto({}), { patient: null, notes: [], labs: [], otherInvestigations: [] });
});

test('toHistoryDto de-duplicates lab results across orders and groups them by report date', () => {
  const result = (id, name, value, date, normal = 'Y', range = '1 - 2') => ({
    parameterId: id, parameterName: name, resultValue: '', resultText: '', resultNumeric: value, symbol: '',
    normal, rangeText: range, reportDate: date,
  });
  // HMIS repeats every CBC result on each CBC order, and each value with two range texts.
  const cbcResults = [
    result('P1', 'HGB', 13.4, '2022-03-16T09:51:48'),
    result('P1', 'HGB', 13.4, '2022-03-16T09:51:48', 'Y', 'other range'),
    result('P2', 'PLT', 146, '2022-03-16T09:51:48', 'N'),
    result('P1', 'HGB', 0, '2021-08-31T10:00:00'),
    { ...result('P9', 'Hepatitis B Profile', null, '2021-08-31T10:00:00') },
  ];
  const order = (name, trnDate, results, extra = {}) => ({
    investigationName: name, departmentName: 'Pathology-KTH', trnDate, reportDate: null, reportAvailable: 'Y', results, ...extra,
  });
  const dto = toHistoryDto({
    physicianNotes: [],
    investigations: [
      order('CBC', '2022-03-16T08:12:47', cbcResults),
      order('CBC', '2021-08-31T08:00:00', cbcResults),
      order('XRAY CHEST', '2026-11-05T15:48:58', [], { departmentName: 'Radiology-KTH' }),
      order('XRAY CHEST', '2026-11-05T15:48:58', [], { departmentName: 'Radiology-KTH' }),
      order('ECG', '2026-11-05T15:12:15', [], { reportAvailable: 'N' }),
      order('PRIVATE ROOM:28', '2026-11-05T16:46:51', [], { departmentName: 'INPATIENT SERVICES-KTH' }),
      order('MRI', null, []),
    ],
  });
  assert.deepEqual(dto.labs.map((p) => [p.name, p.reportedAt, p.results.length]), [
    ['CBC', '2022-03-16T09:51', 2],
    ['CBC', '2021-08-31T10:00', 1],
  ]);
  assert.deepEqual(dto.labs[0].results[1], { name: 'PLT', value: '146', range: '1 - 2', abnormal: true });
  assert.equal(dto.labs[0].results[0].range, '1 - 2'); // shorter of '1 - 2' and 'other range'
  assert.equal(dto.labs[1].results[0].value, '0');
  assert.deepEqual(dto.otherInvestigations.map((i) => [i.name, i.reportAvailable]), [['XRAY CHEST', true], ['ECG', false]]);
});
