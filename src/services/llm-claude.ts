import { buildClaudeRequest, extractClaudeText, type ClaudeRequestInput, type ClaudeResponse } from './llm-request';

export interface ClaudeCallResult {
  text: string;
  usage: { input_tokens: number; output_tokens: number } | null;
  stopReason: string | null;
}

/** Messages API を fetch で呼ぶ（SDK は使わない。RN で追加依存を避けるため）。 */
export async function callClaude(input: ClaudeRequestInput): Promise<ClaudeCallResult> {
  const req = buildClaudeRequest(input);
  const response = await fetch(req.url, {
    method: 'POST',
    headers: req.headers,
    body: JSON.stringify(req.body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error (${response.status}): ${error}`);
  }

  const result = (await response.json()) as ClaudeResponse;
  return {
    text: extractClaudeText(result),
    usage: result.usage ?? null,
    stopReason: result.stop_reason ?? null,
  };
}
