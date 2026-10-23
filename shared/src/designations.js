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
  { key: 'professor', label: 'Professor', role: ROLES.CONSULTANT },
  { key: 'associate_professor', label: 'Associate Professor', role: ROLES.CONSULTANT },
  { key: 'assistant_professor', label: 'Assistant Professor', role: ROLES.CONSULTANT },
  { key: 'experiential_registrar', label: 'Experiential Registrar', role: ROLES.MANAGER },
  { key: 'trainee_registrar', label: 'Trainee Registrar', role: ROLES.MANAGER },
  { key: 'trainee_medical_officer', label: 'Trainee Medical Officer', role: ROLES.DOCTOR },
  { key: 'house_officer', label: 'House Officer', role: ROLES.DOCTOR },
  { key: 'nurse', label: 'Nurse', role: ROLES.NURSE },
];

export const DESIGNATION_KEYS = DESIGNATIONS.map((d) => d.key);

export function roleForDesignation(designation) {
  return DESIGNATIONS.find((d) => d.key === designation)?.role ?? null;
}

export function designationLabel(designation) {
  return DESIGNATIONS.find((d) => d.key === designation)?.label ?? designation ?? '';
}
