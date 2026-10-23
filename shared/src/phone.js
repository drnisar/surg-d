export const DEFAULT_COUNTRY_CODE = '+92';

// Returns { countryCode: '+92', phoneNumber: '3001234567', full: '+923001234567' }.
// A single leading zero on the local number is dropped (0300... -> 300...).
export function normalizePhone(countryCode, phoneNumber) {
  const cc = String(countryCode ?? '').replace(/[^\d]/g, '');
  if (!/^\d{1,4}$/.test(cc)) throw new Error('Country code must be 1-4 digits');

  let number = String(phoneNumber ?? '').replace(/[\s\-().]/g, '');
  if (!/^\d+$/.test(number)) throw new Error('Phone number must contain digits only');
  if (number.startsWith('0')) number = number.slice(1);
  if (number.length < 6 || number.length > 12) throw new Error('Phone number must be 6-12 digits');

  return { countryCode: `+${cc}`, phoneNumber: number, full: `+${cc}${number}` };
}
