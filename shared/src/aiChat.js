// The doctor's own signed-in AI chats. The prompt is typed in via `?q=`; without one, an empty chat opens.
// `appUrl` opens the installed desktop app instead. Only Claude documents one (claude:// on macOS, Windows
// and Linux); the other apps, and Claude on phones, may pick up the https link but don't fill in the prompt.
export const AI_CHATS = [
  { key: 'chatgpt', label: 'ChatGPT', url: 'https://chatgpt.com/' },
  { key: 'claude', label: 'Claude', url: 'https://claude.ai/new', appUrl: 'claude://claude.ai/new' },
  { key: 'copilot', label: 'Copilot', url: 'https://copilot.microsoft.com/' },
];

export function aiChatUrl(service, prompt, { app = false } = {}) {
  const chat = AI_CHATS.find((c) => c.key === service);
  const url = (app && chat.appUrl) || chat.url;
  return prompt ? `${url}?q=${encodeURIComponent(prompt)}` : url;
}
