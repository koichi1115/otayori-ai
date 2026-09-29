import type { AnalysisResult } from '../../src/types';

export interface ExpectedAnalysis {
  events: { keyword: string; date?: string; targetPerson: string }[];
  todos: { keyword: string; dueDate?: string; targetPerson: string }[];
  items: { keyword: string; dueDate?: string; targetPerson: string }[];
  /** 出てはいけない項目（対象外の学年・別施設の行事など） */
  forbidden: { keyword: string }[];
}

export interface AnalysisScore {
  expectedTotal: number;
  actualTotal: number;
  matchedExpected: number;
  matchedActual: number;
  recall: number;
  precision: number;
  dateAccuracy: number;
  personAccuracy: number;
  forbiddenHits: number;
}

interface Flat {
  label: string;
  date?: string;
  person: string;
}

const ratio = (num: number, den: number): number => (den === 0 ? 1 : num / den);

function flattenActual(a: AnalysisResult) {
  return {
    events: a.events.map((e): Flat => ({ label: e.title, date: e.date, person: e.targetPerson })),
    todos: a.todos.map((t): Flat => ({ label: t.title, date: t.dueDate, person: t.targetPerson })),
    items: a.items.map((i): Flat => ({ label: i.name, date: i.dueDate, person: i.targetPerson })),
  };
}

type Category = 'events' | 'todos' | 'items';
const CATEGORIES: Category[] = ['events', 'todos', 'items'];

function expectedDate(e: ExpectedAnalysis, c: Category, i: number): string | undefined {
  const entry = e[c][i] as { date?: string; dueDate?: string };
  return entry.date ?? entry.dueDate;
}

/** 期待値と実際の抽出結果を突き合わせてスコア化する（決定的・API 不要） */
export function scoreAnalysis(expected: ExpectedAnalysis, actual: AnalysisResult): AnalysisScore {
  const flat = flattenActual(actual);
  let expectedTotal = 0;
  let matchedExpected = 0;
  let actualTotal = 0;
  let matchedActual = 0;
  let dated = 0;
  let datedOk = 0;
  let personOk = 0;

  for (const c of CATEGORIES) {
    expectedTotal += expected[c].length;
    actualTotal += flat[c].length;
    expected[c].forEach((exp, i) => {
      const hit = flat[c].find((a) => a.label.includes(exp.keyword));
      if (!hit) return;
      matchedExpected += 1;
      if (hit.person === exp.targetPerson) personOk += 1;
      const date = expectedDate(expected, c, i);
      if (date) {
        dated += 1;
        if (hit.date === date) datedOk += 1;
      }
    });
    matchedActual += flat[c].filter((a) => expected[c].some((exp) => a.label.includes(exp.keyword))).length;
  }

  const allLabels = CATEGORIES.flatMap((c) => flat[c].map((a) => a.label));
  const forbiddenHits = allLabels.filter((l) => expected.forbidden.some((f) => l.includes(f.keyword))).length;

  return {
    expectedTotal,
    actualTotal,
    matchedExpected,
    matchedActual,
    recall: ratio(matchedExpected, expectedTotal),
    precision: ratio(matchedActual, actualTotal),
    dateAccuracy: ratio(datedOk, dated),
    personAccuracy: ratio(personOk, matchedExpected),
    forbiddenHits,
  };
}

export interface ScoreSummary {
  count: number;
  meanRecall: number;
  meanPrecision: number;
  meanDateAccuracy: number;
  meanPersonAccuracy: number;
  totalForbiddenHits: number;
}

const mean = (xs: number[]): number => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);

export function summarize(scores: AnalysisScore[]): ScoreSummary {
  return {
    count: scores.length,
    meanRecall: mean(scores.map((s) => s.recall)),
    meanPrecision: mean(scores.map((s) => s.precision)),
    meanDateAccuracy: mean(scores.map((s) => s.dateAccuracy)),
    meanPersonAccuracy: mean(scores.map((s) => s.personAccuracy)),
    totalForbiddenHits: scores.reduce((a, s) => a + s.forbiddenHits, 0),
  };
}
