import { buildModelOptions, retirementWarning } from '../src/services/llm-model';
import { estimateCostUSD } from '../src/services/llm-cost';
import { CLAUDE_MODELS, DEFAULT_CLAUDE_MODEL } from '../src/constants/llm';

describe('buildModelOptions', () => {
  it('カタログ全件を返し、選択中のものに selected を立てる', () => {
    const opts = buildModelOptions('claude-opus-5-5');
    expect(opts.map((o) => o.id)).toEqual(CLAUDE_MODELS.map((m) => m.id));
    expect(opts.filter((o) => o.selected).map((o) => o.id)).toEqual(['claude-opus-5-5']);
  });

  it('未設定なら既定モデルが選択される', () => {
    const opts = buildModelOptions(null);
    expect(opts.find((o) => o.selected)?.id).toBe(DEFAULT_CLAUDE_MODEL);
  });

  it('カタログ外の値でも壊れず、既定モデルが選択される', () => {
    const opts = buildModelOptions('claude-unknown-9');
    expect(opts.filter((o) => o.selected)).toHaveLength(1);
  });
});

describe('retirementWarning', () => {
  const haiku = CLAUDE_MODELS.find((m) => m.id.includes('haiku'))!.id;

  it('退役予定日の 60 日以内なら警告文を返す', () => {
    expect(retirementWarning(haiku, new Date('2026-09-29T12:00:00+09:00'))).toContain('2026-10-15');
  });

  it('退役予定日を過ぎていれば警告する', () => {
    expect(retirementWarning(haiku, new Date('2026-11-01T00:00:00+09:00'))).toContain('退役');
  });

  it('十分先なら警告しない', () => {
    expect(retirementWarning(DEFAULT_CLAUDE_MODEL, new Date('2026-09-29T12:00:00+09:00'))).toBeNull();
  });

  it('未知のモデルは警告しない', () => {
    expect(retirementWarning('claude-unknown-9', new Date())).toBeNull();
  });
});

describe('estimateCostUSD', () => {
  it('Sonnet 5.5: 入力 $2 / 出力 $10 per MTok', () => {
    expect(estimateCostUSD(DEFAULT_CLAUDE_MODEL, { input_tokens: 10_000, output_tokens: 2_000 })).toBeCloseTo(0.04, 6);
  });

  it('Haiku 4.5: 入力 $1 / 出力 $5 per MTok', () => {
    const haiku = CLAUDE_MODELS.find((m) => m.id.includes('haiku'))!.id;
    expect(estimateCostUSD(haiku, { input_tokens: 10_000, output_tokens: 2_000 })).toBeCloseTo(0.02, 6);
  });

  it('未知のモデルは null', () => {
    expect(estimateCostUSD('claude-unknown-9', { input_tokens: 1, output_tokens: 1 })).toBeNull();
  });
});
