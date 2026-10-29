// MR number layout (14 chars), e.g. K0360000001100:
//   hospital code (3) + employee type (1) + self/dependent (2) + employee code (8, zero-padded)
// Staff type an employee code: '1100' uses the default type 6; '5-1100' sets the type digit to 5.
export const HOSPITAL_CODE = 'K03'; // Khyber Teaching Hospital
export const EMPLOYEE_TYPE = '6';
export const SELF_DEPENDENT = '00';
export const MR_LENGTH = 14;
const EMPLOYEE_CODE_LENGTH = 8;

const MR_PATTERN = /^([A-Z]\d{2})(\d)(\d{2})(\d{8})$/;
// Optional type digit and hyphen, then the code: '1100' or '5-1100'.
export const EMPLOYEE_CODE_PATTERN = /^(?:(\d)-)?(\d{1,8})$/;

export function buildMrNumber(employeeCode, { hospitalCode = HOSPITAL_CODE, employeeType = EMPLOYEE_TYPE } = {}) {
  const match = EMPLOYEE_CODE_PATTERN.exec(String(employeeCode ?? '').trim());
  if (!match || Number(match[2]) === 0) {
    throw new Error('Employee code must be 1-8 digits (not zero), optionally after a type digit and hyphen, e.g. 5-1100');
  }
  const [, type = employeeType, code] = match;
  return `${hospitalCode}${type}${SELF_DEPENDENT}${code.padStart(EMPLOYEE_CODE_LENGTH, '0')}`;
}

// The employee code as staff type it: '1100' for the default type, '5-1100' otherwise.
export function employeeCodeOf(mr) {
  const parsed = parseMrNumber(mr);
  if (!parsed) return '';
  return parsed.employeeType === EMPLOYEE_TYPE ? parsed.employeeCode : `${parsed.employeeType}-${parsed.employeeCode}`;
}

export function parseMrNumber(mr) {
  const match = MR_PATTERN.exec(String(mr ?? '').trim().toUpperCase());
  if (!match) return null;
  const [, hospitalCode, employeeType, dependent, paddedCode] = match;
  return {
    hospitalCode,
    employeeType,
    dependent,
    employeeCode: String(Number(paddedCode)),
  };
}

export function isValidEmployeeMr(mr) {
  const parsed = parseMrNumber(mr);
  return Boolean(
    parsed &&
      parsed.hospitalCode === HOSPITAL_CODE &&
      parsed.dependent === SELF_DEPENDENT &&
      parsed.employeeCode !== '0'
  );
}
