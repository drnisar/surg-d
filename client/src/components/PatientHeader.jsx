import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { hmisPatientUrl, kthAppIntentUrl } from '@surg-d/shared';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { useSettings } from '../settings.jsx';
import { Button } from '@/components/ui/button';

// One named tab for HMIS, so each "Open in HMIS" reuses and focuses it instead of adding tabs.
const HMIS_TAB = 'surgd-hmis';
const isAndroid = () => /Android/i.test(navigator.userAgent);

// Opened without noopener: a browser only finds a named tab again while this site is its opener.
// HMIS is the hospital's own system on its private network, so keeping that link is acceptable.
// An HMIS tab that's already open is only brought to the front, not reloaded: the link carries no APEX
// session, so reloading would land on the login page and lose the sign-in made in that tab. So a {mr}
// link only applies on the first open; after that the doctor pastes the copied MR number.
// The copy starts before the tab switch so it still counts as part of the click.
// On Android it opens the "Medical Information KTH" app instead (falling back to the web link).
const openHmis = (e, url, mr) => {
  e.preventDefault();
  const copied = navigator.clipboard?.writeText(mr).then(() => true, () => false) ?? Promise.resolve(false);
  if (isAndroid()) {
    window.location.href = kthAppIntentUrl(url);
    return copied;
  }
  const tab = window.open('', HMIS_TAB); // finds the tab without navigating it, or opens a blank one
  if (!tab) {
    window.location.href = url; // popup blocked: open it here instead
    return copied;
  }
  try {
    if (tab.location.href === 'about:blank') tab.location.href = url;
  } catch {
    // Reading another site's address throws: HMIS is already loaded there, so leave it as it is.
  }
  tab.focus();
  return copied;
};

// Back button, name and details for the patient pages, with "Open in HMIS" when the admin has set the
// link on Setup. `fallback` is where Back goes when the page was opened from outside the app.
export default function PatientHeader({ mr, patient, bed, fallback }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const hmisUrl = hmisPatientUrl(settings.hmis?.patientUrl, mr);
  const android = isAndroid(); // the KTH app needs no link from Setup
  const [copy, setCopy] = useState(null); // { mr, ok } for the last "Open in HMIS"
  const onOpenHmis = (e) => {
    const forMr = mr;
    openHmis(e, hmisUrl, forMr).then((ok) => setCopy({ mr: forMr, ok }));
  };
  const back = () => (location.key !== 'default' ? navigate(-1) : navigate(fallback));

  const name = patient?.name ?? bed?.patientName ?? 'Patient';
  const details = [
    mr,
    [patient?.age, patient?.sex].filter(Boolean).join(', '),
    bed?.code && `Bed ${bed.code}`,
    bed?.consultantName,
  ].filter(Boolean);

  return (
    <>
      <div>
        <Button variant="ghost" size="sm" className="-ml-2" onClick={back}>
          <ArrowLeft />
          Back
        </Button>
      </div>
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="m-0 text-2xl font-semibold">{name}</h2>
          <p className="m-0 text-sm text-muted-foreground">{details.join(' · ')}</p>
        </div>
        {(hmisUrl || android) && (
          // HMIS is on the hospital network only; a plain link is allowed from the HTTPS site.
          <div className="grid justify-items-end gap-1">
            <Button size="sm" variant="outline" asChild>
              <a
                href={android ? kthAppIntentUrl(hmisUrl) : hmisUrl}
                target={android ? undefined : HMIS_TAB}
                onClick={onOpenHmis}
                title="Opens HMIS and copies the MR number"
              >
                <ExternalLink />
                Open in HMIS
              </a>
            </Button>
            {copy?.mr === mr && (
              <p className="m-0 text-xs text-muted-foreground" role="status">
                {copy.ok ? 'MR number copied, paste it in HMIS (Ctrl+V)' : 'Copy blocked by the browser'}
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
