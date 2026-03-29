export interface ChannelProtocol {
  channel: string;
  debounceMs: number;
  systemPromptPrefix?: string;
  maxHistoryMessages?: number;
}

export const PROTOCOLS: Record<string, ChannelProtocol> = {
  WHATSAPP: {
    channel: 'WHATSAPP',
    debounceMs: 25000, // 25 seconds wait for silence
    systemPromptPrefix: "You are communicating via WhatsApp. Use a conversational, friendly tone. Keep responses relatively concise and use emojis where appropriate to feel natural.",
    maxHistoryMessages: 20
  },
  GMAIL: {
    channel: 'GMAIL',
    debounceMs: 0, // Emails are usually complete thoughts
    systemPromptPrefix: "You are communicating via Email. Maintain a professional and helpful tone. Use formal greetings, structured paragraphs, and a clear sign-off.",
    maxHistoryMessages: 10
  },
  EMAIL: {
    channel: 'EMAIL',
    debounceMs: 0,
    systemPromptPrefix: "You are communicating via Email. Maintain a professional and helpful tone.",
    maxHistoryMessages: 10
  },
  WEB: {
    channel: 'WEB',
    debounceMs: 2000, // Short debounce for web chat
    systemPromptPrefix: "You are communicating via a web chat interface. Be helpful and direct.",
    maxHistoryMessages: 15
  }
};

export function getProtocol(channel?: string): ChannelProtocol {
  if (!channel) return { channel: 'UNKNOWN', debounceMs: 5000 };
  const normalized = channel.toUpperCase();
  return PROTOCOLS[normalized] || { channel: normalized, debounceMs: 5000 };
}
