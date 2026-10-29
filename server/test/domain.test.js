import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addableDesignations, buildMrNumber, canEditEmployee, employeeCodeOf, isValidEmployeeMr, normalizePhone, parseMrNumber, roleForDesignation, whatsappUrl } from '@surg-d/shared';
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
