import { ANALYSIS_MAX_TOKENS, DEFAULT_CLAUDE_EFFORT, supportsEffort, type ClaudeEffort } from '../constants/llm';
import { ANALYSIS_JSON_SCHEMA } from './analysis-schema';

export const CLAUDE_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';
export const ANTHROPIC_VERSION = '2023-06-01';

export interface ClaudeRequestInput {
  apiKey: string;
  model: string;
  prompt: string;
  base64: string;
  mimeType: string;
  effort?: ClaudeEffort;
}

export interface ClaudeRequest {
  url: string;
  headers: Record<string, string>;
  body: {
    model: string;
    max_tokens: number;
    messages: { role: 'user'; content: Record<string, unknown>[] }[];
    output_config: { format: { type: 'json_schema'; schema: typeof ANALYSIS_JSON_SCHEMA }; effort?: ClaudeEffort };
  };
}

export interface ClaudeResponse {
  stop_reason?: string | null;
  content?: { type: string; text?: string; thinking?: string; signature?: string }[];
  usage?: { input_tokens: number; output_tokens: number };
}

function buildSourceBlock(mimeType: string, base64: string): Record<string, unknown> {
  const type = mimeType.startsWith('image/') ? 'image' : 'document';
  return { type, source: { type: 'base64', media_type: mimeType, data: base64 } };
}

/**
 * Messages API リクエストを組み立てる（純粋関数）。
 * Sonnet 5.5 で 400 になる temperature/top_p/top_k・assistant prefill・
 * thinking disabled/budget_tokens は送らない。
 */
export function buildClaudeRequest(input: ClaudeRequestInput): ClaudeRequest {
  const output_config: ClaudeRequest['body']['output_config'] = {
    format: { type: 'json_schema', schema: ANALYSIS_JSON_SCHEMA },
  };
  if (supportsEffort(input.model)) {
    output_config.effort = input.effort ?? DEFAULT_CLAUDE_EFFORT;
  }
  return {
    url: CLAUDE_MESSAGES_URL,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': input.apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: {
      model: input.model,
      max_tokens: ANALYSIS_MAX_TOKENS,
      // 公式: PDF/画像はテキストより前に置く
      messages: [
        { role: 'user', content: [buildSourceBlock(input.mimeType, input.base64), { type: 'text', text: input.prompt }] },
      ],
      output_config,
    },
  };
}

/**
 * レスポンスから text ブロックを取り出す。thinking ブロックが先頭に来ても壊れない。
 */
export function extractClaudeText(response: ClaudeResponse): string {
  if (response.stop_reason === 'refusal') {
    throw new Error('AIが解析を拒否しました。別のプリントで試すか、しばらくしてから再試行してください。');
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error('AIの応答が途中で切れました。プリントを分けて再試行してください。');
  }
  const text = (response.content ?? [])
    .filter((b) => b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join('');
  if (!text) throw new Error('AIの応答にテキストが含まれていません。');
  return text;
}
