import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Back button, name and details for the patient pages. `fallback` is where Back goes when the page
// was opened from outside the app and there's no page to go back to.
export default function PatientHeader({ mr, patient, bed, fallback }) {
  const location = useLocation();
  const navigate = useNavigate();
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
      <div>
        <h2 className="m-0 text-2xl font-semibold">{name}</h2>
        <p className="m-0 text-sm text-muted-foreground">{details.join(' · ')}</p>
      </div>
    </>
  );
}
