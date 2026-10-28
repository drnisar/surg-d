import {
  DESIGNATION_KEYS,
  PASSWORD_MIN_LENGTH,
  ROLES,
  buildMrNumber,
  isValidEmployeeMr,
  normalizePhone,
  roleForDesignation,
} from '@surg-d/shared';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Validates and normalises an employee payload. `partial` allows updates that omit fields.
export function validateEmployee(input, { partial = false } = {}) {
  const errors = {};
  const out = {};
  const has = (key) => input[key] !== undefined && input[key] !== null && input[key] !== '';
  const required = (key) => !partial || input[key] !== undefined;

  if (has('mrNumber')) {
    const mr = String(input.mrNumber).trim().toUpperCase();
    if (isValidEmployeeMr(mr)) out.mr_number = mr;
    else errors.mrNumber = 'MR number must be 14 characters, e.g. K0360000001100';
  } else if (has('employeeCode')) {
    try {
      out.mr_number = buildMrNumber(input.employeeCode);
    } catch (e) {
      errors.employeeCode = e.message;
    }
  } else if (!partial) {
    errors.employeeCode = 'Employee code or MR number is required';
  }

  if (has('fullName')) out.full_name = String(input.fullName).trim().replace(/\s+/g, ' ');
  else if (required('fullName')) errors.fullName = 'Full name is required';

  for (const [key, column] of [['email', 'email'], ['officialEmail', 'official_email']]) {
    if (has(key)) {
      const value = String(input[key]).trim().toLowerCase();
      if (EMAIL_PATTERN.test(value)) out[column] = value;
      else errors[key] = 'Invalid email address';
    } else if (required(key)) {
      errors[key] = 'Email is required';
    }
  }

  if (has('phoneNumber') || has('countryCode')) {
    try {
      const phone = normalizePhone(input.countryCode, input.phoneNumber);
      out.country_code = phone.countryCode;
      out.phone_number = phone.phoneNumber;
    } catch (e) {
      errors.phoneNumber = e.message;
    }
  } else if (required('phoneNumber')) {
    errors.phoneNumber = 'Phone number is required';
  }

  // Role is derived from designation; only an admin account may have no designation.
  const isAdmin = input.role === ROLES.ADMIN;
  if (has('designation')) {
    if (DESIGNATION_KEYS.includes(input.designation)) {
      out.designation = input.designation;
      out.role = isAdmin ? ROLES.ADMIN : roleForDesignation(input.designation);
    } else {
      errors.designation = 'Unknown designation';
    }
  } else if (isAdmin) {
    out.designation = null;
    out.role = ROLES.ADMIN;
  } else if (required('designation')) {
    errors.designation = 'Designation is required';
  }

  if (has('password')) {
    if (String(input.password).length < PASSWORD_MIN_LENGTH) {
      errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
    }
    else out.password = String(input.password);
  }

  if (input.isActive !== undefined) out.is_active = input.isActive ? 1 : 0;

  return { data: out, errors: Object.keys(errors).length ? errors : null };
}

export function toEmployeeDto(row) {
  return {
    id: row.id,
    mrNumber: row.mr_number,
    fullName: row.full_name,
    email: row.email,
    officialEmail: row.official_email,
    countryCode: row.country_code,
    phoneNumber: row.phone_number,
    phone: `${row.country_code}${row.phone_number}`,
    designation: row.designation,
    role: row.role,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// A user changing their own password. Whether `currentPassword` is right is checked against the stored hash.
export function validatePasswordChange(input) {
  const errors = {};
  const currentPassword = String(input.currentPassword ?? '');
  const newPassword = String(input.newPassword ?? '');

  if (!currentPassword) errors.currentPassword = 'Enter your current password';
  if (newPassword.length < PASSWORD_MIN_LENGTH) {
    errors.newPassword = `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  } else if (newPassword === currentPassword) {
    errors.newPassword = 'Choose a password different from the current one';
  }

  return { data: { currentPassword, newPassword }, errors: Object.keys(errors).length ? errors : null };
}
