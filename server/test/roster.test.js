import { test } from 'node:test';
import assert from 'node:assert/strict';
import { daysInMonth, isValidDate } from '@surg-d/shared';
import { validateRosterUpdate } from '../src/roster.js';

test('lists days of a month', () => {
  assert.equal(daysInMonth('2026-02').length, 28);
  assert.equal(daysInMonth('2028-02').length, 29);
  assert.equal(daysInMonth('2026-10').at(-1), '2026-10-31');
  assert.equal(daysInMonth('2026-13'), null);
  assert.equal(daysInMonth('oct'), null);
});

test('validates dates', () => {
  assert.ok(isValidDate('2026-10-31'));
  assert.ok(!isValidDate('2026-11-31'));
  assert.ok(!isValidDate('2026-1-01'));
});

test('validateRosterUpdate accepts a slot and a whole day', () => {
  const slot = validateRosterUpdate({ dates: ['2026-10-22'], shifts: ['morning'], location: 'or', employeeIds: ['3', 4] });
  assert.equal(slot.errors, null);
  assert.deepEqual(slot.data, {
    dates: ['2026-10-22'],
    shifts: ['morning'],
    location: 'or',
    employeeIds: [3, 4],
    mode: 'replace',
  });

  const day = validateRosterUpdate({
    dates: ['2026-10-22'],
    shifts: ['morning', 'evening'],
    location: 'sau',
    employeeIds: [3],
    mode: 'add',
  });
  assert.equal(day.errors, null);
});

test('validateRosterUpdate allows clearing a slot but rejects bad input', () => {
  assert.equal(validateRosterUpdate({ dates: ['2026-10-22'], shifts: ['evening'], location: 'opd', employeeIds: [] }).errors, null);
  const { errors } = validateRosterUpdate({ dates: ['2026-02-30'], shifts: ['night'], location: 'icu', employeeIds: [0], mode: 'swap' });
  assert.deepEqual(Object.keys(errors).sort(), ['dates', 'employeeIds', 'location', 'mode', 'shifts']);
  const emptyAdd = validateRosterUpdate({ dates: ['2026-10-22'], shifts: ['morning'], location: 'ward', employeeIds: [], mode: 'add' });
  assert.ok(emptyAdd.errors.employeeIds);
});
