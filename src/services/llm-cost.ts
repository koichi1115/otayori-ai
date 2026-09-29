import { findClaudeModel } from '../constants/llm';

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
}

/** 1 リクエストの概算料金（USD）。未知のモデルは null。 */
export function estimateCostUSD(model: string, usage: TokenUsage): number | null {
  const info = findClaudeModel(model);
  if (!info) return null;
  return (usage.input_tokens * info.inputPerMTok + usage.output_tokens * info.outputPerMTok) / 1_000_000;
}
