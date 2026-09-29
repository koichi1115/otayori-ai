/**
 * LLM モデル名・料金・既定値の単一の定義元。
 * モデル名リテラルはこのファイル以外に書かない（__tests__/llm-constants.test.ts が検査する）。
 *
 * 根拠（公式ドキュメント、MODEL_VERIFIED_AT に確認）:
 *  - Claude: https://platform.claude.com/docs/en/about-claude/models/overview
 *            https://platform.claude.com/docs/en/about-claude/model-deprecations
 *            https://platform.claude.com/docs/en/models/sonnet-5-5/migration-guide
 *  - Gemini: https://ai.google.dev/gemini-api/docs/models
 *  - OpenAI: https://platform.openai.com/docs/models
 * 更新手順は docs/LLM_MODELS.md を参照。
 */

/** 公式ドキュメントでモデル名・廃止予定を確認した日時（JST） */
export const MODEL_VERIFIED_AT = '2026-09-29T21:05+09:00';

export type ClaudeEffort = 'low' | 'medium' | 'high';

export interface ClaudeModelInfo {
  id: string;
  label: string;
  description: string;
  /** USD / 100万トークン（公式 pricing、確認日は MODEL_VERIFIED_AT） */
  inputPerMTok: number;
  outputPerMTok: number;
  /** output_config.effort に対応するか（Haiku 4.5 は非対応） */
  supportsEffort: boolean;
  /** 公式が示す「この日より前には退役しない」日付 (YYYY-MM-DD) */
  retiresNotBefore: string;
}

export const CLAUDE_MODELS: readonly ClaudeModelInfo[] = [
  {
    id: 'claude-sonnet-5-5',
    label: 'Claude Sonnet 5.5（標準）',
    description: '速さと精度のバランス。標準設定。',
    inputPerMTok: 2,
    outputPerMTok: 10,
    supportsEffort: true,
    retiresNotBefore: '2027-09-28',
  },
  {
    id: 'claude-opus-5-5',
    label: 'Claude Opus 5.5（高精度）',
    description: '複雑なプリント向け。やや遅く、料金は約2倍。',
    inputPerMTok: 4,
    outputPerMTok: 20,
    supportsEffort: true,
    retiresNotBefore: '2027-09-22',
  },
  {
    id: 'claude-haiku-4-5-20251001',
    label: 'Claude Haiku 4.5（節約・旧標準）',
    description: '最速・低コスト。2026-10-15 以降に退役の可能性あり。',
    inputPerMTok: 1,
    outputPerMTok: 5,
    supportsEffort: false,
    retiresNotBefore: '2026-10-15',
  },
];

/** 新しい標準モデル */
export const DEFAULT_CLAUDE_MODEL = 'claude-sonnet-5-5';

/** 変更前の標準モデル。比較スクリプトのベースラインとしてのみ使う。 */
export const BASELINE_CLAUDE_MODEL = 'claude-haiku-4-5-20251001';

/**
 * Gemini / OpenAI は現状 analyzePDF から呼ばれない（設定 DB の既定値のみ）。
 * 公式ページに載っている現行モデルを既定値にしておく。
 */
export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';
export const DEFAULT_OPENAI_MODEL = 'gpt-6-sol';

/** プリント解析で使う effort（対応モデルのみ送信） */
export const DEFAULT_CLAUDE_EFFORT: ClaudeEffort = 'medium';

/**
 * max_tokens は thinking トークンも含む上限（公式 migration guide）。
 * 抽出 JSON 本体は数百〜千数百トークンなので、思考分の余裕を見て 16000。
 */
export const ANALYSIS_MAX_TOKENS = 16000;

export function findClaudeModel(id: string): ClaudeModelInfo | undefined {
  return CLAUDE_MODELS.find((m) => m.id === id);
}

export function supportsEffort(id: string): boolean {
  return findClaudeModel(id)?.supportsEffort ?? true;
}
