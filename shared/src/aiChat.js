// The doctor's own signed-in AI chats. The prompt is typed in via `?q=`; without one, an empty chat opens.
// `appUrl` opens the installed desktop app instead: claude:// is documented for macOS, Windows and Linux;
// ms-copilot:chat isn't documented by Microsoft, but on macOS it prefilled 24,000 characters whole (Nov 2026).
// ChatGPT has no app link, and on phones the apps may pick up the https link but don't fill in the prompt.
// `appMaxPrompt` is the longest prompt the app takes whole (Claude cuts at about 14,000 characters, which
// would drop the newest notes). `maxUrl` overrides the default link limit for a website checked to take
// longer links (chatgpt.com served 64,000 in Nov 2026).
export const AI_CHATS = [
  { key: 'chatgpt', label: 'ChatGPT', url: 'https://chatgpt.com/', maxUrl: 64000 },
  { key: 'claude', label: 'Claude', url: 'https://claude.ai/new', appUrl: 'claude://claude.ai/new', appMaxPrompt: 13500 },
  { key: 'copilot', label: 'Copilot', url: 'https://copilot.microsoft.com/', appUrl: 'ms-copilot:chat', appMaxPrompt: 24000 },
];

export function aiChatUrl(service, prompt, { app = false } = {}) {
  const chat = AI_CHATS.find((c) => c.key === service);
  const url = (app && chat.appUrl) || chat.url;
  return prompt ? `${url}?q=${encodeURIComponent(prompt)}` : url;
}
