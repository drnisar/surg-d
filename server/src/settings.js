import { SETTINGS_DEFAULTS, SETTINGS_HEADING_MAX_LENGTH, SETTINGS_URL_MAX_LENGTH, normalizePhone, withDefaults } from '@surg-d/shared';
import { pool } from './db.js';

// Validates a full settings object from the Setup page. Error keys are `section.field`.
export function validateSettings(input) {
  const errors = {};
  const data = {};
  for (const [section, defaults] of Object.entries(SETTINGS_DEFAULTS)) {
    data[section] = {};
    for (const [field, fallback] of Object.entries(defaults)) {
      const value = input?.[section]?.[field];
      const key = `${section}.${field}`;
      if (typeof fallback === 'boolean') {
        if (typeof value === 'boolean') data[section][field] = value;
        else errors[key] = 'Must be on or off';
      }
    }
  }

  const heading = String(input?.whatsapp?.heading ?? '').trim().replace(/\s+/g, ' ');
  if (!heading) errors['whatsapp.heading'] = 'Heading is required';
  else if (heading.length > SETTINGS_HEADING_MAX_LENGTH) {
    errors['whatsapp.heading'] = `Heading must be at most ${SETTINGS_HEADING_MAX_LENGTH} characters`;
  } else data.whatsapp.heading = heading;

  try {
    // Any valid local number will do; only the country code is kept.
    data.phone.defaultCountryCode = normalizePhone(input?.phone?.defaultCountryCode, '3000000000').countryCode;
  } catch (err) {
    errors['phone.defaultCountryCode'] = err.message;
  }

  // HMIS is on the hospital network (http://172.16…), so plain http is allowed.
  const hmisUrl = String(input?.hmis?.patientUrl ?? '').trim();
  if (!hmisUrl) data.hmis.patientUrl = '';
  else if (hmisUrl.length > SETTINGS_URL_MAX_LENGTH) {
    errors['hmis.patientUrl'] = `Link must be at most ${SETTINGS_URL_MAX_LENGTH} characters`;
  } else if (!/^https?:\/\/[^\s/]+\S*$/i.test(hmisUrl)) {
    errors['hmis.patientUrl'] = 'Enter a link starting with http:// or https://';
  } else data.hmis.patientUrl = hmisUrl;

  return Object.keys(errors).length ? { errors } : { data };
}

export async function getSettings(db = pool) {
  const [rows] = await db.query('SELECT settings FROM app_settings WHERE id = 1');
  const stored = rows[0]?.settings;
  return withDefaults(typeof stored === 'string' ? JSON.parse(stored) : stored);
}

export async function saveSettings(data, userId) {
  await pool.query(
    'INSERT INTO app_settings (id, settings, updated_by) VALUES (1, ?, ?) ON DUPLICATE KEY UPDATE settings = VALUES(settings), updated_by = VALUES(updated_by)',
    [JSON.stringify(data), userId]
  );
  return getSettings();
}
