/**
 * Sanitize text for speech synthesis.
 * Strips code blocks, markdown, symbols, URLs, tables — anything
 * that would sound garbled when spoken by TTS.
 */
export function sanitizeForSpeech(text: string): string {
  if (!text) return '';

  let cleaned = text;

  // Remove fenced code blocks (```...```) — replace with "code block"
  cleaned = cleaned.replace(/```[\s\S]*?```/g, ' (code block) ');

  // Remove inline code `...` — replace with quoted text
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');

  // Remove markdown headings
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');

  // Remove markdown bold/italic
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
  cleaned = cleaned.replace(/__([^_]+)__/g, '$1');
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
  cleaned = cleaned.replace(/_([^_]+)_/g, '$1');

  // Remove markdown links — keep text, drop URL
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Remove images
  cleaned = cleaned.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');

  // Remove horizontal rules
  cleaned = cleaned.replace(/^---+$/gm, '');
  cleaned = cleaned.replace(/^\*---+$/gm, '');

  // Convert bullet lists: * and - to spoken words
  cleaned = cleaned.replace(/^[\s]*[-*+]\s+/gm, '• ');

  // Remove table formatting (| and -+ patterns)
  cleaned = cleaned.replace(/^\|.+\|$/gm, '');
  cleaned = cleaned.replace(/^\|[-\s|]+\|$/gm, '');
  cleaned = cleaned.replace(/\|/g, ', ');

  // Convert common symbols to words
  const symbolMap: [RegExp, string][] = [
    [/&/g, ' and '],
    [/@/g, ' at '],
    [/°/g, ' degrees '],
    [/≠/g, ' not equal to '],
    [/≈/g, ' approximately '],
    [/≤/g, ' less than or equal to '],
    [/≥/g, ' greater than or equal to '],
    [/±/g, ' plus minus '],
    [/→/g, ' leads to '],
    [/←/g, ' from '],
    [/⇒/g, ' implies '],
    [/∅/g, ' empty set '],
    [/∈/g, ' in '],
    [/∑/g, ' sum '],
    [/√/g, ' square root '],
    [/∞/g, ' infinity '],
    [/π/g, ' pi '],
    [/✓/g, ' check mark '],
    [/✗/g, ' cross mark '],
    [/\u2018|\u2019/g, "'"],   // smart single quotes → straight
    [/\u201c|\u201d/g, '"'],   // smart double quotes → straight
    [/\u2013|\u2014/g, ' — '], // em/en dash
    [/…/g, '...'],
  ];
  for (const [pattern, replacement] of symbolMap) {
    cleaned = cleaned.replace(pattern, replacement);
  }

  // Remove URLs (http/https/ftp)
  cleaned = cleaned.replace(/https?:\/\/\S+/g, ' link ');

  // Collapse multiple whitespace
  cleaned = cleaned.replace(/\s+/g, ' ');

  // Collapse multiple punctuation
  cleaned = cleaned.replace(/\.{4,}/g, '...');
  cleaned = cleaned.replace(/[!]{3,}/g, '!');
  cleaned = cleaned.replace(/[?]{3,}/g, '?');

  // Remove leading/trailing whitespace
  cleaned = cleaned.trim();

  // If nothing left after sanitization, return a placeholder
  if (!cleaned) return '[Speech was empty after sanitization]';

  return cleaned;
}

/**
 * Extract text from an ExecutionStepResult for a TTS node.
 * Handles both sandbox mocks and real API responses.
 */
export interface ExecutionStepResult {
  stepId: string;
  nodeType: string;
  request?: any;
  response?: any;
  error?: string;
}

export function extractChatText(
  results: ExecutionStepResult[],
  ttsStepId: string,
): string {
  // Walk results to find the TTS node, then find its upstream Chat text
  const ttsResult = results.find((r) => r.stepId === ttsStepId);
  if (!ttsResult?.response) return '';

  const resp = ttsResult.response;
  
  // Backend _handle_tts passes text through in response.text
  if (resp.text) return resp.text;

  // Sandbox/fallback: look for choices[0].message.content
  if (resp.choices?.[0]?.message?.content) {
    return resp.choices[0].message.content;
  }

  // Generic content field
  if (resp.content) return resp.content;

  return '';
}
