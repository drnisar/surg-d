// MR number layout (14 chars), e.g. K0360000001100:
//   hospital code (3) + employee type (1) + self/dependent (2) + employee code (8, zero-padded)
export const HOSPITAL_CODE = 'K03'; // Khyber Teaching Hospital
export const EMPLOYEE_TYPE = '6';
export const SELF_DEPENDENT = '00';
export const MR_LENGTH = 14;
const EMPLOYEE_CODE_LENGTH = 8;

const MR_PATTERN = /^([A-Z]\d{2})(\d)(\d{2})(\d{8})$/;

export function buildMrNumber(employeeCode, { hospitalCode = HOSPITAL_CODE, employeeType = EMPLOYEE_TYPE } = {}) {
  const code = String(employeeCode ?? '').trim();
  if (!/^\d{1,8}$/.test(code) || Number(code) === 0) {
    throw new Error('Employee code must be 1-8 digits and not zero');
  }
  return `${hospitalCode}${employeeType}${SELF_DEPENDENT}${code.padStart(EMPLOYEE_CODE_LENGTH, '0')}`;
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
      parsed.employeeType === EMPLOYEE_TYPE &&
      parsed.dependent === SELF_DEPENDENT &&
      parsed.employeeCode !== '0'
  );
}
