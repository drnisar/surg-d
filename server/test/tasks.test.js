import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normaliseBeds } from '../src/hospitalBeds.js';
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
