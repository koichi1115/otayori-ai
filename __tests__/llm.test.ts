jest.mock('../src/db/settings', () => ({
  getLLMConfig: jest.fn(),
}));
jest.mock('../src/db/children', () => ({
  getChildren: jest.fn(),
}));
jest.mock('../src/db/facilities', () => ({
  getFacilities: jest.fn(),
}));

import { parseResponse, buildPrompt } from '../src/services/llm';
import type { Child, Facility } from '../src/types';

describe('parseResponse', () => {
  const validJson = JSON.stringify({
    title: '6月園だより',
    source: 'さくら保育園',
    category: 'action_required',
    summary: '6月の行事予定です',
    suggestedFileName: '2025-06_さくら保育園_6月園だより.pdf',
    events: [
      {
        title: '保育参観',
        date: '2025-06-15',
        startTime: '10:00',
        endTime: '11:30',
        location: 'ホール',
        targetPerson: '太郎',
        description: '親子で参加',
      },
    ],
    todos: [
      {
        title: '出欠表提出',
        dueDate: '2025-06-10',
        targetPerson: '太郎',
        description: '担任に提出',
      },
    ],
    items: [
      {
        name: '水筒',
        dueDate: '2025-06-15',
        targetPerson: '太郎',
        description: 'プール用',
      },
    ],
  });

  it('parses valid JSON response', () => {
    const result = parseResponse(validJson);
    expect(result.title).toBe('6月園だより');
    expect(result.source).toBe('さくら保育園');
    expect(result.category).toBe('action_required');
    expect(result.events).toHaveLength(1);
    expect(result.events[0].title).toBe('保育参観');
    expect(result.todos).toHaveLength(1);
    expect(result.items).toHaveLength(1);
  });

  it('strips markdown code fences (```json)', () => {
    const wrapped = '```json\n' + validJson + '\n```';
    const result = parseResponse(wrapped);
    expect(result.title).toBe('6月園だより');
  });

  it('strips plain code fences (```)', () => {
    const wrapped = '```\n' + validJson + '\n```';
    const result = parseResponse(wrapped);
    expect(result.title).toBe('6月園だより');
  });

  it('extracts JSON from surrounding text', () => {
    const withText = 'Here is the result:\n' + validJson + '\nDone.';
    const result = parseResponse(withText);
    expect(result.title).toBe('6月園だより');
  });

  it('defaults missing title to (タイトル不明)', () => {
    const json = JSON.stringify({ source: 'test' });
    const result = parseResponse(json);
    expect(result.title).toBe('(タイトル不明)');
  });

  it('defaults missing source to (発行元不明)', () => {
    const json = JSON.stringify({ title: 'test' });
    const result = parseResponse(json);
    expect(result.source).toBe('(発行元不明)');
  });

  it('defaults category to notice when not action_required', () => {
    const json = JSON.stringify({ title: 'test', category: 'something_else' });
    const result = parseResponse(json);
    expect(result.category).toBe('notice');
  });

  it('keeps action_required category', () => {
    const json = JSON.stringify({ title: 'test', category: 'action_required' });
    const result = parseResponse(json);
    expect(result.category).toBe('action_required');
  });

  it('defaults non-array events/todos/items to empty arrays', () => {
    const json = JSON.stringify({ title: 'test', events: 'not an array', todos: null });
    const result = parseResponse(json);
    expect(result.events).toEqual([]);
    expect(result.todos).toEqual([]);
    expect(result.items).toEqual([]);
  });

  it('throws on invalid JSON', () => {
    expect(() => parseResponse('not json at all')).toThrow('JSON解析に失敗');
  });
});

describe('buildPrompt', () => {
  const baseChild: Child = {
    id: 1,
    name: '太郎',
    gender: 'male',
    birthdate: '2020-04-01',
    className: 'ぱんだ組',
    facilityId: 1,
    createdAt: '',
    updatedAt: '',
  };

  const baseFacility: Facility = {
    id: 1,
    name: 'さくら保育園',
    type: 'nursery',
    address: '東京都渋谷区1-1-1',
    notes: '延長保育あり',
    createdAt: '',
    updatedAt: '',
  };

  it('includes child name and gender', () => {
    const prompt = buildPrompt([baseChild], []);
    expect(prompt).toContain('太郎');
    expect(prompt).toContain('男性');
    expect(prompt).toContain('2020-04-01');
    expect(prompt).toContain('ぱんだ組');
  });

  it('maps female gender correctly', () => {
    const femaleChild = { ...baseChild, gender: 'female' as const };
    const prompt = buildPrompt([femaleChild], []);
    expect(prompt).toContain('女性');
  });

  it('includes facility info with type label', () => {
    const prompt = buildPrompt([], [baseFacility]);
    expect(prompt).toContain('さくら保育園');
    expect(prompt).toContain('保育園');
    expect(prompt).toContain('東京都渋谷区1-1-1');
    expect(prompt).toContain('延長保育あり');
  });

  it('maps facility types correctly', () => {
    const school = { ...baseFacility, type: 'school' as const };
    const lesson = { ...baseFacility, type: 'lesson' as const };
    expect(buildPrompt([], [school])).toContain('学校');
    expect(buildPrompt([], [lesson])).toContain('習い事');
  });

  it('shows (未登録) when no children or facilities', () => {
    const prompt = buildPrompt([], []);
    expect(prompt).toContain('(未登録)');
  });

  it('includes child names in targetPerson instruction', () => {
    const prompt = buildPrompt([baseChild], []);
    expect(prompt).toContain('"太郎"');
  });

  it('joins multiple child names with or', () => {
    const child2 = { ...baseChild, id: 2, name: '花子' };
    const prompt = buildPrompt([baseChild, child2], []);
    expect(prompt).toContain('"太郎" or "花子"');
  });

  it('includes JSON format instructions', () => {
    const prompt = buildPrompt([], []);
    expect(prompt).toContain('"title"');
    expect(prompt).toContain('"events"');
    expect(prompt).toContain('"todos"');
    expect(prompt).toContain('"items"');
  });
});
