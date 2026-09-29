import { parseArgs, estimateRunCost, formatReport, type ModelRunResult } from '../scripts/lib/compare';
import { DEFAULT_CLAUDE_MODEL, BASELINE_CLAUDE_MODEL } from '../src/constants/llm';

describe('parseArgs', () => {
  it('引数なしは dry-run（API を叩かない）', () => {
    const a = parseArgs([]);
    expect(a.run).toBe(false);
    expect(a.models).toEqual([BASELINE_CLAUDE_MODEL, DEFAULT_CLAUDE_MODEL]);
    expect(a.repeat).toBe(1);
  });

  it('--run を明示したときだけ実行する', () => {
    expect(parseArgs(['--run']).run).toBe(true);
  });

  it('--models と --repeat と --out を解釈する', () => {
    const a = parseArgs(['--run', '--models=claude-opus-5-5,claude-sonnet-5-5', '--repeat=2', '--out=/tmp/x.json']);
    expect(a.models).toEqual(['claude-opus-5-5', 'claude-sonnet-5-5']);
    expect(a.repeat).toBe(2);
    expect(a.out).toBe('/tmp/x.json');
  });

  it('repeat は 1〜3 に制限する（課金の暴走防止）', () => {
    expect(() => parseArgs(['--repeat=0'])).toThrow();
    expect(() => parseArgs(['--repeat=4'])).toThrow();
  });

  it('未知の引数はエラー', () => {
    expect(() => parseArgs(['--all'])).toThrow('未知の引数');
  });
});

describe('estimateRunCost', () => {
  it('モデル数 × プリント数 × 回数 の呼び出し数と概算上限 USD を返す', () => {
    const e = estimateRunCost([BASELINE_CLAUDE_MODEL, DEFAULT_CLAUDE_MODEL], 3, 1);
    expect(e.calls).toBe(6);
    expect(e.maxUSD).toBeGreaterThan(0);
    expect(e.maxUSD).toBeLessThan(1);
  });
});

describe('formatReport', () => {
  const r = (model: string, over: Partial<ModelRunResult> = {}): ModelRunResult => ({
    model,
    file: 'a.pdf',
    ms: 1000,
    usage: { input_tokens: 5000, output_tokens: 1000 },
    costUSD: 0.02,
    score: {
      expectedTotal: 4, actualTotal: 4, matchedExpected: 4, matchedActual: 4,
      recall: 1, precision: 1, dateAccuracy: 1, personAccuracy: 1, forbiddenHits: 0,
    },
    error: null,
    ...over,
  });

  it('モデルごとの平均と、ベースライン比の判定を出す', () => {
    const text = formatReport([r(BASELINE_CLAUDE_MODEL), r(DEFAULT_CLAUDE_MODEL)], BASELINE_CLAUDE_MODEL);
    expect(text).toContain(BASELINE_CLAUDE_MODEL);
    expect(text).toContain(DEFAULT_CLAUDE_MODEL);
    expect(text).toContain('劣化なし');
  });

  it('recall が下がっていれば劣化と判定する', () => {
    const worse = r(DEFAULT_CLAUDE_MODEL, {
      score: { expectedTotal: 4, actualTotal: 2, matchedExpected: 2, matchedActual: 2, recall: 0.5, precision: 1, dateAccuracy: 1, personAccuracy: 1, forbiddenHits: 0 },
    });
    expect(formatReport([r(BASELINE_CLAUDE_MODEL), worse], BASELINE_CLAUDE_MODEL)).toContain('劣化あり');
  });

  it('エラーがあれば結果に出す', () => {
    const text = formatReport([r(BASELINE_CLAUDE_MODEL, { error: 'HTTP 401', score: null, usage: null, costUSD: null })], BASELINE_CLAUDE_MODEL);
    expect(text).toContain('HTTP 401');
  });
});
