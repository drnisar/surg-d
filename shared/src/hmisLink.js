// The admin's HMIS link template (Setup) for one patient: every {mr} becomes the MR number.
// Returns null when no link is set, so the button stays hidden.
export function hmisPatientUrl(template, mr) {
  const url = String(template ?? '').trim();
  if (!url) return null;
  return url.replaceAll('{mr}', encodeURIComponent(mr ?? ''));
}

// KTH's own Android app for HIS, "Medical Information KTH" on Google Play.
export const KTH_APP_PACKAGE = 'pk.edu.kth.mobile_app_kth';

// An Android intent link to the KTH app by package name. If the app isn't installed, or has no screen
// that accepts links from the browser (unknown: the app documents none), Chrome goes to `fallbackUrl`
// (e.g. the HMIS web link), or to the app's Play Store page without one. It can't pick a patient.
export function kthAppIntentUrl(fallbackUrl) {
  const fallback = fallbackUrl ? `S.browser_fallback_url=${encodeURIComponent(fallbackUrl)};` : '';
  return `intent://#Intent;package=${KTH_APP_PACKAGE};${fallback}end`;
}
