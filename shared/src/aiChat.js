// The doctor's own signed-in AI chats. The prompt is typed in via `?q=`; without one, an empty chat opens.
// `appUrl` opens the installed desktop app instead: claude:// is documented for macOS, Windows and Linux;
// ms-copilot:chat isn't documented by Microsoft. ChatGPT has no app link, and on phones the apps may pick
// up the https link but don't fill in the prompt.
export const AI_CHATS = [
  { key: 'chatgpt', label: 'ChatGPT', url: 'https://chatgpt.com/' },
  { key: 'claude', label: 'Claude', url: 'https://claude.ai/new', appUrl: 'claude://claude.ai/new' },
  { key: 'copilot', label: 'Copilot', url: 'https://copilot.microsoft.com/', appUrl: 'ms-copilot:chat' },
];

export function aiChatUrl(service, prompt, { app = false } = {}) {
  const chat = AI_CHATS.find((c) => c.key === service);
  const url = (app && chat.appUrl) || chat.url;
  return prompt ? `${url}?q=${encodeURIComponent(prompt)}` : url;
}
