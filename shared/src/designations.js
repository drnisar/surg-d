export const ROLES = {
  ADMIN: 'admin',
  CONSULTANT: 'consultant',
  MANAGER: 'manager',
  DOCTOR: 'doctor',
  NURSE: 'nurse',
};

export const ROLE_LABELS = {
  admin: 'Admin',
  consultant: 'Consultant',
  manager: 'Manager',
  doctor: 'Doctor',
  nurse: 'Nurse',
};

// Ordered by seniority. Each designation maps to exactly one role.
export const DESIGNATIONS = [
  { key: 'professor', label: 'Professor', short: 'Prof', role: ROLES.CONSULTANT },
  { key: 'associate_professor', label: 'Associate Professor', short: 'Assoc Prof', role: ROLES.CONSULTANT },
  { key: 'assistant_professor', label: 'Assistant Professor', short: 'Asst Prof', role: ROLES.CONSULTANT },
  { key: 'experiential_registrar', label: 'Experiential Registrar', short: 'ER', role: ROLES.MANAGER },
  { key: 'trainee_registrar', label: 'Trainee Registrar', short: 'TR', role: ROLES.MANAGER },
  { key: 'trainee_medical_officer', label: 'Trainee Medical Officer', short: 'TMO', role: ROLES.DOCTOR },
  { key: 'house_officer', label: 'House Officer', short: 'HO', role: ROLES.DOCTOR },
  { key: 'nurse', label: 'Nurse', short: 'Nurse', role: ROLES.NURSE },
];

export const DESIGNATION_KEYS = DESIGNATIONS.map((d) => d.key);

export function roleForDesignation(designation) {
  return DESIGNATIONS.find((d) => d.key === designation)?.role ?? null;
}

export function designationLabel(designation) {
  return DESIGNATIONS.find((d) => d.key === designation)?.label ?? designation ?? '';
}

// Abbreviation used where space is tight, e.g. the printed roster: 'HO', 'TMO', 'Prof'.
export function designationShort(designation) {
  return DESIGNATIONS.find((d) => d.key === designation)?.short ?? '';
}

// Designations each user may add on the Staff page: the admin any, an Experiential Registrar the junior doctors.
const ADDABLE_BY_DESIGNATION = {
  experiential_registrar: ['trainee_medical_officer', 'house_officer'],
};

export function addableDesignations({ role, designation }) {
  if (role === ROLES.ADMIN) return DESIGNATION_KEYS;
  return ADDABLE_BY_DESIGNATION[designation] ?? [];
}

// Whoever may add a designation may also edit employees who hold it; the admin edits anyone.
export function canEditEmployee(user, employee) {
  if (user.role === ROLES.ADMIN) return true;
  return Boolean(employee.designation) && addableDesignations(user).includes(employee.designation);
}
