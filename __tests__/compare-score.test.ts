import { scoreAnalysis, summarize, type ExpectedAnalysis } from '../scripts/lib/score';
import type { AnalysisResult } from '../src/types';

const expected: ExpectedAnalysis = {
  events: [{ keyword: '遠足', date: '2026-10-15', targetPerson: 'たろう' }],
  todos: [{ keyword: '同意書', dueDate: '2026-10-08', targetPerson: 'たろう' }],
  items: [
    { keyword: 'お弁当', targetPerson: 'たろう' },
    { keyword: '水筒', targetPerson: 'たろう' },
  ],
  forbidden: [{ keyword: '修学旅行' }],
};

const actual = (over: Partial<AnalysisResult> = {}): AnalysisResult => ({
  title: 't',
  source: 's',
  category: 'action_required',
  summary: '',
  suggestedFileName: '',
  events: [{ title: '秋の遠足', date: '2026-10-15', targetPerson: 'たろう', description: '' }],
  todos: [{ title: '遠足の同意書を提出', dueDate: '2026-10-08', targetPerson: 'たろう', description: '' }],
  items: [
    { name: 'お弁当', targetPerson: 'たろう', description: '' },
    { name: '水筒', targetPerson: 'たろう', description: '' },
  ],
  ...over,
});

describe('scoreAnalysis', () => {
  it('完全一致なら recall/precision とも 1', () => {
    const s = scoreAnalysis(expected, actual());
    expect(s.recall).toBe(1);
    expect(s.precision).toBe(1);
    expect(s.dateAccuracy).toBe(1);
    expect(s.personAccuracy).toBe(1);
    expect(s.forbiddenHits).toBe(0);
  });

  it('抜けがあれば recall が下がる', () => {
    const s = scoreAnalysis(expected, actual({ items: [{ name: 'お弁当', targetPerson: 'たろう', description: '' }] }));
    expect(s.recall).toBeCloseTo(3 / 4, 6);
    expect(s.precision).toBe(1);
  });

  it('余計な項目があれば precision が下がる', () => {
    const s = scoreAnalysis(
      expected,
      actual({ todos: [...actual().todos, { title: '関係ない提出物', targetPerson: 'たろう', description: '' }] }),
    );
    expect(s.precision).toBeCloseTo(4 / 5, 6);
  });

  it('日付違いは一致扱いにするが dateAccuracy が下がる', () => {
    const s = scoreAnalysis(
      expected,
      actual({ events: [{ title: '遠足', date: '2026-10-16', targetPerson: 'たろう', description: '' }] }),
    );
    expect(s.recall).toBe(1);
    expect(s.dateAccuracy).toBeCloseTo(1 / 2, 6);
  });

  it('対象外の子に割り当てたら personAccuracy が下がる', () => {
    const s = scoreAnalysis(
      expected,
      actual({ items: [{ name: 'お弁当', targetPerson: 'はなこ', description: '' }, { name: '水筒', targetPerson: 'たろう', description: '' }] }),
    );
    expect(s.personAccuracy).toBeCloseTo(3 / 4, 6);
  });

  it('禁止項目（対象外学年の行事など）が出たら forbiddenHits を数える', () => {
    const s = scoreAnalysis(
      expected,
      actual({ events: [...actual().events, { title: '5年生 修学旅行説明会', date: '2026-10-20', targetPerson: 'はなこ', description: '' }] }),
    );
    expect(s.forbiddenHits).toBe(1);
  });

  it('期限が無い項目（dueDate 省略）は日付評価の対象外', () => {
    const s = scoreAnalysis(
      { events: [], todos: [], items: [{ keyword: '水筒', targetPerson: 'たろう' }], forbidden: [] },
      actual({ events: [], todos: [], items: [{ name: '水筒', targetPerson: 'たろう', description: '' }] }),
    );
    expect(s.dateAccuracy).toBe(1);
  });
});

describe('summarize', () => {
  it('複数プリントの平均・合計を出す', () => {
    const a = scoreAnalysis(expected, actual());
    const b = scoreAnalysis(expected, actual({ items: [] }));
    const sum = summarize([a, b]);
    expect(sum.meanRecall).toBeCloseTo((1 + 2 / 4) / 2, 6);
    expect(sum.totalForbiddenHits).toBe(0);
  });

  it('空配列でも壊れない', () => {
    expect(summarize([]).meanRecall).toBe(0);
  });
});
