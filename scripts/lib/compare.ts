import { BASELINE_CLAUDE_MODEL, DEFAULT_CLAUDE_MODEL, findClaudeModel } from '../../src/constants/llm';
import { summarize, type AnalysisScore } from './score';

export interface CompareArgs {
  run: boolean;
  models: string[];
  repeat: number;
  out: string | null;
}

export function parseArgs(argv: string[]): CompareArgs {
  const args: CompareArgs = { run: false, models: [BASELINE_CLAUDE_MODEL, DEFAULT_CLAUDE_MODEL], repeat: 1, out: null };
  for (const a of argv) {
    if (a === '--run') args.run = true;
    else if (a.startsWith('--models=')) args.models = a.slice(9).split(',').filter(Boolean);
    else if (a.startsWith('--repeat=')) {
      const n = Number(a.slice(9));
      if (!Number.isInteger(n) || n < 1 || n > 3) throw new Error('--repeat は 1〜3 の整数');
      args.repeat = n;
    } else if (a.startsWith('--out=')) args.out = a.slice(6);
    else throw new Error(`未知の引数: ${a}`);
  }
  return args;
}

/** 1 呼び出しあたりの保守的な上限トークン（PDF 1〜2 ページ + プロンプト、thinking 込み出力） */
const MAX_INPUT_TOKENS_PER_CALL = 12_000;
const MAX_OUTPUT_TOKENS_PER_CALL = 8_000;

export function estimateRunCost(models: string[], fileCount: number, repeat: number) {
  const calls = models.length * fileCount * repeat;
  let maxUSD = 0;
  for (const m of models) {
    const info = findClaudeModel(m);
    if (!info) continue;
    const per =
      (MAX_INPUT_TOKENS_PER_CALL * info.inputPerMTok + MAX_OUTPUT_TOKENS_PER_CALL * info.outputPerMTok) / 1_000_000;
    maxUSD += per * fileCount * repeat;
  }
  return { calls, maxUSD };
}

export interface ModelRunResult {
  model: string;
  file: string;
  ms: number;
  usage: { input_tokens: number; output_tokens: number } | null;
  costUSD: number | null;
  score: AnalysisScore | null;
  error: string | null;
}

const pct = (x: number) => `${(x * 100).toFixed(0)}%`;

function modelStats(results: ModelRunResult[]) {
  const ok = results.filter((r) => r.score);
  const sum = summarize(ok.map((r) => r.score!));
  const n = Math.max(ok.length, 1);
  return {
    ok: ok.length,
    total: results.length,
    sum,
    meanMs: ok.reduce((a, r) => a + r.ms, 0) / n,
    totalCost: results.reduce((a, r) => a + (r.costUSD ?? 0), 0),
    inTok: ok.reduce((a, r) => a + (r.usage?.input_tokens ?? 0), 0),
    outTok: ok.reduce((a, r) => a + (r.usage?.output_tokens ?? 0), 0),
  };
}

/** 比較結果のテキストレポート。ベースラインより recall / 日付 / 対象者 / 禁止項目が悪化していれば「劣化あり」。 */
export function formatReport(results: ModelRunResult[], baseline: string): string {
  const models = [...new Set(results.map((r) => r.model))];
  const lines: string[] = ['# モデル比較結果', ''];
  const stats = new Map(models.map((m) => [m, modelStats(results.filter((r) => r.model === m))]));

  lines.push('| モデル | 成功 | recall | precision | 日付正答 | 対象者正答 | 禁止項目 | 平均応答(ms) | 入力tok | 出力tok | 概算USD |');
  lines.push('|---|---|---|---|---|---|---|---|---|---|---|');
  for (const m of models) {
    const s = stats.get(m)!;
    lines.push(
      `| ${m} | ${s.ok}/${s.total} | ${pct(s.sum.meanRecall)} | ${pct(s.sum.meanPrecision)} | ${pct(s.sum.meanDateAccuracy)} | ${pct(s.sum.meanPersonAccuracy)} | ${s.sum.totalForbiddenHits} | ${s.meanMs.toFixed(0)} | ${s.inTok} | ${s.outTok} | ${s.totalCost.toFixed(4)} |`,
    );
  }

  const base = stats.get(baseline);
  lines.push('');
  for (const m of models.filter((x) => x !== baseline)) {
    const s = stats.get(m)!;
    if (!base) {
      lines.push(`- ${m}: ベースライン ${baseline} の結果がないため比較不可`);
      continue;
    }
    const eps = 1e-9;
    const degraded =
      s.ok < s.total ||
      s.sum.meanRecall < base.sum.meanRecall - eps ||
      s.sum.meanDateAccuracy < base.sum.meanDateAccuracy - eps ||
      s.sum.meanPersonAccuracy < base.sum.meanPersonAccuracy - eps ||
      s.sum.totalForbiddenHits > base.sum.totalForbiddenHits;
    lines.push(`- ${m} vs ${baseline}: ${degraded ? '劣化あり' : '劣化なし'}`);
  }

  const errors = results.filter((r) => r.error);
  if (errors.length) {
    lines.push('', '## エラー');
    for (const e of errors) lines.push(`- ${e.model} / ${e.file}: ${e.error}`);
  }
  return lines.join('\n');
}
