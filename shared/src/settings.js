import { DEFAULT_COUNTRY_CODE } from './phone.js';

// App-wide settings the admin changes on the Setup page. A setting missing from the stored row
// takes its default here, so a new one needs no migration.
export const SETTINGS_DEFAULTS = {
  whatsapp: { enabled: true, heading: 'Surgical D Ward', includeAssignedBy: true, includeLink: true },
  phone: { defaultCountryCode: DEFAULT_COUNTRY_CODE },
  bedAllocation: { enabled: true },
  archive: { enabled: true },
};

export const SETTINGS_HEADING_MAX_LENGTH = 40;

export function withDefaults(stored) {
  const out = {};
  for (const [section, defaults] of Object.entries(SETTINGS_DEFAULTS)) {
    out[section] = { ...defaults, ...(stored?.[section] ?? {}) };
  }
  return out;
}
