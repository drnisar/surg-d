import { ROLES } from './designations.js';
import { ROSTER_EDITOR_ROLES } from './roster.js';

// Beds and their patients come from the hospital API via the server's /api/beds (e.g. 'SUR-D-04(M)').
export const BED_CODE_PATTERN = /^[A-Z0-9()-]{1,20}$/;

export const TASK_ASSIGNEE_ROLES = [ROLES.CONSULTANT, ROLES.MANAGER, ROLES.DOCTOR];
export const TASK_MAX_LENGTH = 500;
export const TASK_BATCH_LIMIT = 20;

// Standing bed allocations: the same people who edit the roster decide who covers which beds.
export const BED_ALLOCATION_EDITOR_ROLES = ROSTER_EDITOR_ROLES;
export const BED_ALLOCATION_LIMIT = 100;

// Predefined tasks offered in the dialog; free text is also allowed.
export const TASK_TEMPLATES = [
  'Change dressing',
  'Remove drain',
  'Remove stitches',
  'Take blood samples (CBC, RFTs, LFTs)',
  'Follow up lab reports',
  'Arrange blood transfusion',
  'Pass IV cannula',
  'Pass urinary catheter',
  'Remove urinary catheter',
  'Pass NG tube',
  'Review vitals and fluid chart',
  'Request imaging (X-ray / US / CT)',
  'Pre-operative assessment',
  'Take informed consent',
  'Refer to other specialty',
  'Prepare discharge summary',
];

// WhatsApp message offered after assigning tasks. Deliberately no patient name or MR number:
// it ends up in personal chats, so it names only the bed and links back to the app.
export function taskWhatsappMessage({ bedCode, descriptions, assignedBy, link }) {
  const lines =
    descriptions.length === 1
      ? [`Surgical D Ward — new task for bed ${bedCode}: ${descriptions[0]}`]
      : [`Surgical D Ward — new tasks for bed ${bedCode}:`, ...descriptions.map((d) => `• ${d}`)];
  if (assignedBy) lines.push(`Assigned by ${assignedBy}.`);
  if (link) lines.push(`Open My tasks: ${link}`);
  return lines.join('\n');
}
