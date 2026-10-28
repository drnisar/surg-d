import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateBedAllocation } from '../src/bedAllocations.js';

test('validateBedAllocation normalises and de-duplicates', () => {
  const { data, errors } = validateBedAllocation({ bedCodes: [' k031539', 'K031539', 'K031540'], employeeIds: ['3', 3, 7] });
  assert.equal(errors, null);
  assert.deepEqual(data, { bedCodes: ['K031539', 'K031540'], employeeIds: [3, 7], mode: 'add' });
});

test('validateBedAllocation needs beds, and doctors unless replacing', () => {
  assert.ok(validateBedAllocation({ bedCodes: [], employeeIds: [1] }).errors.bedCodes);
  assert.ok(validateBedAllocation({ bedCodes: ['K031539'], employeeIds: [] }).errors.employeeIds);
  // Replacing with nobody clears the beds.
  assert.equal(validateBedAllocation({ bedCodes: ['K031539'], employeeIds: [], mode: 'replace' }).errors, null);
});

test('validateBedAllocation rejects bad input', () => {
  assert.ok(validateBedAllocation({ bedCodes: ['K03 1539'], employeeIds: [1] }).errors.bedCodes);
  assert.ok(validateBedAllocation({ bedCodes: Array.from({ length: 101 }, (_, i) => `B${i}`), employeeIds: [1] }).errors.bedCodes);
  assert.ok(validateBedAllocation({ bedCodes: ['K031539'], employeeIds: [0] }).errors.employeeIds);
  assert.ok(validateBedAllocation({ bedCodes: ['K031539'], employeeIds: [1], mode: 'move' }).errors.mode);
});
