import { BED_ALLOCATION_LIMIT, BED_CODE_PATTERN } from '@surg-d/shared';

// Puts the given doctors on every bed in `bedCodes`. mode 'replace' clears those beds first
// (an empty employeeIds just clears them); 'add' keeps whoever already covers them.
export function validateBedAllocation(input) {
  const errors = {};
  const bedCodes = [
    ...new Set((Array.isArray(input.bedCodes) ? input.bedCodes : []).map((c) => String(c ?? '').trim().toUpperCase())),
  ];
  const employeeIds = [...new Set(Array.isArray(input.employeeIds) ? input.employeeIds.map(Number) : [])];
  const mode = input.mode ?? 'add';

  if (!bedCodes.length || bedCodes.length > BED_ALLOCATION_LIMIT) errors.bedCodes = `Select 1-${BED_ALLOCATION_LIMIT} beds`;
  else if (!bedCodes.every((c) => BED_CODE_PATTERN.test(c))) errors.bedCodes = 'Unknown bed';
  if (!employeeIds.every((id) => Number.isInteger(id) && id > 0)) errors.employeeIds = 'Invalid employee id';
  if (!['replace', 'add'].includes(mode)) errors.mode = "Mode must be 'replace' or 'add'";
  if (mode === 'add' && !employeeIds.length) errors.employeeIds = 'Select at least one doctor';

  return { data: { bedCodes, employeeIds, mode }, errors: Object.keys(errors).length ? errors : null };
}

export function toAllocationDto(row) {
  return {
    bedCode: row.bed_code,
    doctor: { id: row.employee_id, fullName: row.full_name, designation: row.designation },
  };
}
