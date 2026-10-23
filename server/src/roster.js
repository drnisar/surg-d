import { LOCATION_KEYS, SHIFT_KEYS, isValidDate } from '@surg-d/shared';

const MAX_DATES = 31;

// Validates a roster update: the given employees are placed at `location` for every (date, shift) pair.
// mode 'replace' clears that location in those shifts first; 'add' keeps whoever is already there.
export function validateRosterUpdate(input) {
  const errors = {};
  const dates = [...new Set(Array.isArray(input.dates) ? input.dates : [])];
  const shifts = [...new Set(Array.isArray(input.shifts) ? input.shifts : [])];
  const employeeIds = [...new Set(Array.isArray(input.employeeIds) ? input.employeeIds.map(Number) : [])];
  const { location } = input;
  const mode = input.mode ?? 'replace';

  if (!dates.length || dates.length > MAX_DATES) errors.dates = `Provide 1-${MAX_DATES} dates`;
  else if (!dates.every(isValidDate)) errors.dates = 'Dates must be valid YYYY-MM-DD values';

  if (!shifts.length || !shifts.every((s) => SHIFT_KEYS.includes(s))) errors.shifts = `Shifts must be one of ${SHIFT_KEYS.join(', ')}`;
  if (!LOCATION_KEYS.includes(location)) errors.location = `Location must be one of ${LOCATION_KEYS.join(', ')}`;
  if (!employeeIds.every((id) => Number.isInteger(id) && id > 0)) errors.employeeIds = 'Invalid employee id';
  if (!['replace', 'add'].includes(mode)) errors.mode = "Mode must be 'replace' or 'add'";
  if (mode === 'add' && !employeeIds.length) errors.employeeIds = 'Select at least one employee to add';

  return { data: { dates, shifts, location, employeeIds, mode }, errors: Object.keys(errors).length ? errors : null };
}

export function toAssignmentDto(row) {
  return {
    id: row.id,
    date: row.duty_date,
    shift: row.shift,
    location: row.location,
    employee: {
      id: row.employee_id,
      fullName: row.full_name,
      mrNumber: row.mr_number,
      designation: row.designation,
      role: row.role,
      phone: row.country_code ? `${row.country_code}${row.phone_number}` : undefined,
    },
  };
}
