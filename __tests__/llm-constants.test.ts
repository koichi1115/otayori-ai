import * as fs from 'fs';
import * as path from 'path';
import {
  CLAUDE_MODELS,
  DEFAULT_CLAUDE_MODEL,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_OPENAI_MODEL,
  MODEL_VERIFIED_AT,
  findClaudeModel,
  supportsEffort,
} from '../src/constants/llm';
import { getSetting, getAllSettings } from '../src/db/settings';
import { resolveClaudeModel } from '../src/services/llm-model';

jest.mock('../src/db/database', () => ({ getDatabase: jest.fn() }));

const ROOT = path.resolve(__dirname, '..');
const MODEL_LITERAL = /['"`](claude-(?:haiku|sonnet|opus|fable|mythos)-[\w.-]+|gemini-\d[\w.-]*|gpt-[\w.-]+)['"`]/g;

function listSourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(full);
    return /\.(ts|tsx|js)$/.test(entry.name) ? [full] : [];
  });
}

describe('モデル名の一元化', () => {
  it('モデル名リテラルは src/constants/llm.ts 以外に存在しない', () => {
    const files = [
      ...listSourceFiles(path.join(ROOT, 'src')),
      ...listSourceFiles(path.join(ROOT, 'app')),
      ...listSourceFiles(path.join(ROOT, 'scripts')),
      path.join(ROOT, 'app.config.js'),
      path.join(ROOT, 'app.json'),
    ].filter((f) => !f.endsWith(path.join('src', 'constants', 'llm.ts')));
    const offenders = files.flatMap((file) => {
      const matches = fs.readFileSync(file, 'utf8').match(MODEL_LITERAL) ?? [];
      return matches.map((m) => `${path.relative(ROOT, file)}: ${m}`);
    });
    expect(offenders).toEqual([]);
  });

  it('既定モデルはカタログに含まれる', () => {
    expect(findClaudeModel(DEFAULT_CLAUDE_MODEL)).toBeDefined();
    expect(CLAUDE_MODELS.length).toBeGreaterThanOrEqual(2);
  });

  it('既定の Claude モデルは公式ドキュメントで確認した Sonnet 5.5', () => {
    expect(DEFAULT_CLAUDE_MODEL).toBe('claude-sonnet-5-5');
  });

  it('確認日時が JST の ISO 形式で記録されている', () => {
    expect(MODEL_VERIFIED_AT).toMatch(/^2026-\d{2}-\d{2}T\d{2}:\d{2}\+09:00$/);
  });

  it('effort パラメータ対応はカタログで宣言される（Haiku 4.5 は非対応）', () => {
    expect(supportsEffort(DEFAULT_CLAUDE_MODEL)).toBe(true);
    const haiku = CLAUDE_MODELS.find((m) => m.id.includes('haiku'));
    expect(haiku).toBeDefined();
    expect(supportsEffort(haiku!.id)).toBe(false);
  });

  it('退役予定のモデルには退役予定日が付いている', () => {
    const haiku = CLAUDE_MODELS.find((m) => m.id.includes('haiku'))!;
    expect(haiku.retiresNotBefore).toBe('2026-10-15');
  });
});

describe('設定 DB の既定値', () => {
  const mockDb = { getFirstAsync: jest.fn(), getAllAsync: jest.fn(), runAsync: jest.fn() };
  beforeEach(() => {
    jest.clearAllMocks();
    (require('../src/db/database').getDatabase as jest.Mock).mockResolvedValue(mockDb);
  });

  it('claudeModel の既定値は定数と一致する', async () => {
    mockDb.getFirstAsync.mockResolvedValue(null);
    expect(await getSetting('claudeModel')).toBe(DEFAULT_CLAUDE_MODEL);
  });

  it('gemini / openai の既定値も定数から来る', async () => {
    mockDb.getAllAsync.mockResolvedValue([]);
    const s = await getAllSettings();
    expect(s.geminiModel).toBe(DEFAULT_GEMINI_MODEL);
    expect(s.openaiModel).toBe(DEFAULT_OPENAI_MODEL);
  });
});

describe('resolveClaudeModel', () => {
  it('保存値が妥当ならそれを使う', () => {
    expect(resolveClaudeModel('claude-opus-5-5')).toBe('claude-opus-5-5');
  });
  it.each([null, undefined, '', '  ', 'gpt-4o', 'claude sonnet', 'claude-../x'])(
    '不正な値 %p は既定値にフォールバックする',
    (v) => {
      expect(resolveClaudeModel(v as any)).toBe(DEFAULT_CLAUDE_MODEL);
    },
  );
});
