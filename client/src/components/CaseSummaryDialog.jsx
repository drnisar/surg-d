import { useState } from 'react';
import { CASE_SUMMARY_EXTRA_MAX, CASE_SUMMARY_KINDS, buildCaseSummaryPrompt } from '@surg-d/shared';
import AiChatButtons from './AiChatButtons.jsx';
import { hospitalDay } from '../dates.js';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

// Sends the patient's HMIS notes to the doctor's own AI chat with the chosen kind of summary requested.
// The name and MR number are replaced wherever they appear in the notes, and note authors aren't sent.
export default function CaseSummaryDialog({ mrNumber, name, patient, bed, notes, onClose }) {
  const [kind, setKind] = useState(CASE_SUMMARY_KINDS[0].key);
  const [extra, setExtra] = useState('');
  const [error, setError] = useState('');

  const input = { kind, age: patient?.age, sex: patient?.sex, hospitalDay: hospitalDay(bed?.admittedAt), notes, name, mrNumber };
  const { included, omitted } = buildCaseSummaryPrompt(input);
  const hint = CASE_SUMMARY_KINDS.find((k) => k.key === kind)?.hint;

  const prompt = () => {
    const result = buildCaseSummaryPrompt({ ...input, extra });
    setError(result.error ?? '');
    return result.prompt;
  };

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Case summary</DialogTitle>
          <DialogDescription>
            The buttons open your own ChatGPT, Claude or Copilot with the HMIS notes and your chosen request typed in.
            The patient's name and MR number are replaced in the notes, but other details in them still go to your AI
            account. Check the summary against the notes before using it.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => e.preventDefault()} className="grid gap-4">
          <p className="m-0 text-sm">
            {included ? `${included} note${included === 1 ? '' : 's'} from HMIS will be included` : 'No notes in HMIS'}
            {omitted > 0 && ` (the ${omitted} oldest left out to keep the request short)`}.
          </p>
          <div className="grid gap-2">
            <Label htmlFor="summary-kind">Summary type</Label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger id="summary-kind" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CASE_SUMMARY_KINDS.map((k) => (
                  <SelectItem key={k.key} value={k.key}>
                    {k.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="summary-extra">Anything to add (optional)</Label>
            <Textarea
              id="summary-extra"
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              maxLength={CASE_SUMMARY_EXTRA_MAX}
              rows={3}
              placeholder={hint}
            />
          </div>
          {error && <p className="m-0 text-sm text-destructive">{error}</p>}
          <AiChatButtons getPrompt={prompt} />
        </form>
      </DialogContent>
    </Dialog>
  );
}
