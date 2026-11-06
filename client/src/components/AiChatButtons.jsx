import { useState } from 'react';
import { AI_CHATS, aiChatUrl } from '@surg-d/shared';
import { Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';

// Some browsers cap long links, so a very long request opens an empty chat and relies on the clipboard.
const MAX_URL = 8000;

const copy = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

// iPads report a Mac user agent, hence the touch check.
const isPhoneOrTablet = () =>
  navigator.userAgentData?.mobile ||
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
  (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

// Opens the doctor's installed ChatGPT, Claude or Copilot app where the device hands the link to it, else the
// signed-in website. Only the Claude desktop app and the websites fill in the request, so it is always copied
// too, for pasting. `getPrompt` returns the request, or null after showing its own error.
export default function AiChatButtons({ getPrompt }) {
  const [status, setStatus] = useState('');

  // Copying and opening run before any await so the browser treats them as part of the tap.
  const open = (service) => {
    setStatus('');
    const text = getPrompt();
    if (!text) return;
    const app = !isPhoneOrTablet() && Boolean(AI_CHATS.find((c) => c.key === service).appUrl);
    const url = aiChatUrl(service, text, { app });
    const short = url.length <= MAX_URL;
    const copying = copy(text);
    const target = short ? url : aiChatUrl(service, '', { app });
    // An app link hands off to the app without leaving the page; a new tab would stay blank.
    if (app) window.location.href = target;
    else window.open(target, '_blank', 'noopener');
    copying.then((copied) => {
      if (!copied) setStatus(short ? '' : 'The request is too long to send; use Copy request.');
      else setStatus(short ? 'Request also copied — if the chat opens empty, paste it in.' : 'Request copied — paste it into the chat.');
    });
  };

  const copyPrompt = async () => {
    setStatus('');
    const text = getPrompt();
    if (text) setStatus((await copy(text)) ? 'Request copied — paste it into any AI chat.' : 'Copying is blocked in this browser.');
  };

  return (
    <>
      {status && <p className="m-0 text-sm text-muted-foreground">{status}</p>}
      <DialogFooter className="flex-wrap">
        <Button type="button" variant="outline" onClick={copyPrompt}>
          <Copy />
          Copy request
        </Button>
        {AI_CHATS.map(({ key, label }) => (
          <Button key={key} type="button" variant={key === 'chatgpt' ? 'default' : 'outline'} onClick={() => open(key)}>
            <ExternalLink />
            Open in {label}
          </Button>
        ))}
      </DialogFooter>
    </>
  );
}
