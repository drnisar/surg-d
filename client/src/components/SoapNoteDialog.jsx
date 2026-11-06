import { useState } from 'react';
import { SOAP_FIELDS, buildSoapPrompt, cleanSoapValues } from '@surg-d/shared';
import AiChatButtons from './AiChatButtons.jsx';
import { hospitalDay } from '../dates.js';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const SECTIONS = [
  ['context', 'Patient'],
  ['S', 'Subjective'],
  ['O', 'Objective'],
  ['A', 'Assessment'],
  ['P', 'Plan'],
];

// The doctor enters the day's values; the buttons open their own signed-in AI chat with a SOAP request
// typed in. Nothing goes through the app's server, and no name or MR number is included.
export default function SoapNoteDialog({ patient, bed, onClose }) {
  const [values, setValues] = useState(() => ({
    age: patient?.age ?? '',
    sex: patient?.sex ?? '',
    hospitalDay: hospitalDay(bed?.admittedAt),
  }));
  const [error, setError] = useState('');

  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));

  const prompt = () => {
    const { data, error: invalid } = cleanSoapValues(values);
    setError(invalid ?? '');
    return invalid ? null : buildSoapPrompt(data);
  };

  const field = ({ key, label, max, multiline, placeholder }) => {
    const Control = multiline ? Textarea : Input;
    return (
      <div key={key} className={multiline ? 'grid content-start gap-2 md:col-span-2' : 'grid content-start gap-2'}>
        <Label htmlFor={`soap-${key}`}>{label}</Label>
        <Control
          id={`soap-${key}`}
          value={values[key] ?? ''}
          onChange={set(key)}
          maxLength={max}
          placeholder={placeholder}
          {...(multiline && { rows: 2 })}
        />
      </div>
    );
  };

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg md:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Daily progress note (SOAP)</DialogTitle>
          <DialogDescription>
            Fill in what you have; empty fields are left out. The buttons open your own ChatGPT, Claude or Copilot with
            the request typed in. No name or MR number is included, and the chat is kept in your AI account. Check the
            note before pasting it into HMIS.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => e.preventDefault()} className="grid gap-6">
          {SECTIONS.map(([section, title]) => (
            <fieldset key={section} className="m-0 grid gap-4 border-0 p-0 md:grid-cols-2">
              <legend className="mb-3 p-0 text-sm font-semibold">{title}</legend>
              {SOAP_FIELDS.filter((f) => f.section === section).map(field)}
            </fieldset>
          ))}
          {error && <p className="m-0 text-sm text-destructive">{error}</p>}
          <AiChatButtons getPrompt={prompt} />
        </form>
      </DialogContent>
    </Dialog>
  );
}
