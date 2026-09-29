import { CLAUDE_MODELS, DEFAULT_CLAUDE_MODEL, findClaudeModel } from '../constants/llm';

/** Claude のモデル ID として受け付ける形式（英小文字・数字・ハイフン・ドット） */
const CLAUDE_MODEL_ID = /^claude-[a-z0-9][a-z0-9.-]*$/;

/**
 * 設定 DB に保存された値から使用する Claude モデルを決める。
 * 未設定・他社モデル名・不正な文字列は既定モデルにフォールバックする。
 */
export function resolveClaudeModel(stored: string | null | undefined): string {
  const value = stored?.trim();
  if (!value || !CLAUDE_MODEL_ID.test(value)) return DEFAULT_CLAUDE_MODEL;
  return value;
}

export interface ModelOption {
  id: string;
  label: string;
  description: string;
  selected: boolean;
}

/** 設定画面に出す選択肢。保存値が不正・カタログ外なら既定モデルを選択扱いにする。 */
export function buildModelOptions(stored: string | null | undefined): ModelOption[] {
  const current = resolveClaudeModel(stored);
  const known = CLAUDE_MODELS.some((m) => m.id === current);
  const selectedId = known ? current : DEFAULT_CLAUDE_MODEL;
  return CLAUDE_MODELS.map((m) => ({
    id: m.id,
    label: m.label,
    description: m.description,
    selected: m.id === selectedId,
  }));
}

const WARN_DAYS_BEFORE_RETIREMENT = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 退役予定日が近い（または過ぎた）モデルの警告文。問題なければ null。 */
export function retirementWarning(modelId: string, now: Date = new Date()): string | null {
  const info = findClaudeModel(modelId);
  if (!info) return null;
  const retireAt = new Date(`${info.retiresNotBefore}T00:00:00+09:00`).getTime();
  const daysLeft = Math.floor((retireAt - now.getTime()) / DAY_MS);
  if (daysLeft < 0) {
    return `このモデルは ${info.retiresNotBefore} 以降に退役している可能性があります。別のモデルを選んでください。`;
  }
  if (daysLeft <= WARN_DAYS_BEFORE_RETIREMENT) {
    return `このモデルは ${info.retiresNotBefore} 以降に退役する可能性があります。早めに別のモデルへ切り替えてください。`;
  }
  return null;
}
