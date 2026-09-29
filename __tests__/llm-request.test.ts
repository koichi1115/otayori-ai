import { buildClaudeRequest, extractClaudeText } from '../src/services/llm-request';
import { ANALYSIS_JSON_SCHEMA } from '../src/services/analysis-schema';
import { parseResponse } from '../src/services/llm-parse';
import { DEFAULT_CLAUDE_MODEL, CLAUDE_MODELS } from '../src/constants/llm';

const base = { apiKey: 'test-key', prompt: 'PROMPT', base64: 'QUJD' };

describe('buildClaudeRequest', () => {
  it('Messages API のエンドポイントとヘッダを組み立てる', () => {
    const req = buildClaudeRequest({ ...base, model: DEFAULT_CLAUDE_MODEL, mimeType: 'application/pdf' });
    expect(req.url).toBe('https://api.anthropic.com/v1/messages');
    expect(req.headers['x-api-key']).toBe('test-key');
    expect(req.headers['anthropic-version']).toBe('2023-06-01');
    expect(req.headers['Content-Type']).toBe('application/json');
  });

  it('モデル名は引数のものがそのまま body.model になる', () => {
    const body = buildClaudeRequest({ ...base, model: 'claude-opus-5-5', mimeType: 'application/pdf' }).body;
    expect(body.model).toBe('claude-opus-5-5');
  });

  it('PDF は document ブロックで、テキストより前に置く', () => {
    const { body } = buildClaudeRequest({ ...base, model: DEFAULT_CLAUDE_MODEL, mimeType: 'application/pdf' });
    const content = body.messages[0].content;
    expect(content[0]).toEqual({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: 'QUJD' },
    });
    expect(content[1]).toEqual({ type: 'text', text: 'PROMPT' });
  });

  it('画像は image ブロックになる', () => {
    const { body } = buildClaudeRequest({ ...base, model: DEFAULT_CLAUDE_MODEL, mimeType: 'image/jpeg' });
    expect(body.messages[0].content[0]).toEqual({
      type: 'image',
      source: { type: 'base64', media_type: 'image/jpeg', data: 'QUJD' },
    });
  });

  it('構造化出力は output_config.format (json_schema) で指定する（旧 output_format は使わない）', () => {
    const { body } = buildClaudeRequest({ ...base, model: DEFAULT_CLAUDE_MODEL, mimeType: 'application/pdf' });
    expect(body.output_config.format).toEqual({ type: 'json_schema', schema: ANALYSIS_JSON_SCHEMA });
    expect((body as any).output_format).toBeUndefined();
  });

  it('Sonnet 5.5 では 400 になる設定（sampling / prefill / thinking disabled / budget）を送らない', () => {
    const { body } = buildClaudeRequest({ ...base, model: DEFAULT_CLAUDE_MODEL, mimeType: 'application/pdf' });
    for (const key of ['temperature', 'top_p', 'top_k']) expect(body).not.toHaveProperty(key);
    expect(body.messages[body.messages.length - 1].role).toBe('user');
    expect(JSON.stringify(body)).not.toMatch(/budget_tokens|"disabled"/);
  });

  it('effort 対応モデルには effort を付ける', () => {
    const { body } = buildClaudeRequest({ ...base, model: DEFAULT_CLAUDE_MODEL, mimeType: 'application/pdf' });
    expect(body.output_config.effort).toBe('medium');
  });

  it('effort 非対応モデル（Haiku 4.5）には effort を付けない', () => {
    const haiku = CLAUDE_MODELS.find((m) => m.id.includes('haiku'))!.id;
    const { body } = buildClaudeRequest({ ...base, model: haiku, mimeType: 'application/pdf' });
    expect(body.output_config).not.toHaveProperty('effort');
    expect(body.output_config.format.type).toBe('json_schema');
  });

  it('effort は上書きできる（比較スクリプト用）', () => {
    const { body } = buildClaudeRequest({ ...base, model: DEFAULT_CLAUDE_MODEL, mimeType: 'application/pdf', effort: 'low' });
    expect(body.output_config.effort).toBe('low');
  });

  it('thinking トークンを含められるよう max_tokens は 4096 より大きい', () => {
    const { body } = buildClaudeRequest({ ...base, model: DEFAULT_CLAUDE_MODEL, mimeType: 'application/pdf' });
    expect(body.max_tokens).toBeGreaterThan(4096);
  });
});

describe('ANALYSIS_JSON_SCHEMA（構造化出力の制約）', () => {
  const walk = (node: any, visit: (n: any) => void) => {
    if (node && typeof node === 'object') {
      visit(node);
      Object.values(node).forEach((v) => walk(v, visit));
    }
  };

  it('すべての object に additionalProperties: false がある', () => {
    walk(ANALYSIS_JSON_SCHEMA, (n) => {
      if (n.type === 'object') expect(n.additionalProperties).toBe(false);
    });
  });

  it('公式が未対応と明記するキーワードを含まない', () => {
    const banned = ['minimum', 'maximum', 'multipleOf', 'minLength', 'maxLength', 'maxItems', 'pattern'];
    walk(ANALYSIS_JSON_SCHEMA, (n) => banned.forEach((k) => expect(n).not.toHaveProperty(k)));
  });

  it('省略可能パラメータ数が公式上限 24 以内', () => {
    let optional = 0;
    walk(ANALYSIS_JSON_SCHEMA, (n) => {
      if (n.type === 'object' && n.properties) {
        optional += Object.keys(n.properties).filter((k) => !(n.required ?? []).includes(k)).length;
      }
    });
    expect(optional).toBeLessThanOrEqual(24);
  });

  it('トップレベルの必須項目が AnalysisResult と一致する', () => {
    expect(ANALYSIS_JSON_SCHEMA.required).toEqual(
      expect.arrayContaining(['title', 'source', 'category', 'summary', 'suggestedFileName', 'events', 'todos', 'items']),
    );
    expect(ANALYSIS_JSON_SCHEMA.properties.category.enum).toEqual(['notice', 'action_required']);
  });

  it('スキーマ準拠の JSON を既存の parseResponse がそのまま解釈できる', () => {
    const sample = {
      title: 'ひまわり保育園 10月園だより',
      source: 'ひまわり保育園',
      category: 'action_required',
      summary: '・遠足あり',
      suggestedFileName: '2026-10_ひまわり保育園_10月園だより.pdf',
      events: [{ title: '遠足', date: '2026-10-15', targetPerson: 'たろう', description: '' }],
      todos: [{ title: '同意書提出', dueDate: '2026-10-10', targetPerson: 'たろう', description: '' }],
      items: [{ name: 'お弁当', targetPerson: 'たろう', description: '' }],
    };
    const parsed = parseResponse(JSON.stringify(sample));
    expect(parsed.events[0].date).toBe('2026-10-15');
    expect(parsed.todos[0].dueDate).toBe('2026-10-10');
  });
});

describe('extractClaudeText', () => {
  it('thinking ブロックを飛ばして text ブロックを取り出す（content[0] 固定にしない）', () => {
    const text = extractClaudeText({
      stop_reason: 'end_turn',
      content: [
        { type: 'thinking', thinking: '', signature: 'sig' },
        { type: 'text', text: '{"title":"x"}' },
      ],
    });
    expect(text).toBe('{"title":"x"}');
  });

  it('複数の text ブロックは連結する', () => {
    expect(
      extractClaudeText({ stop_reason: 'end_turn', content: [{ type: 'text', text: '{"a":' }, { type: 'text', text: '1}' }] }),
    ).toBe('{"a":1}');
  });

  it('refusal は分かりやすいエラーにする', () => {
    expect(() => extractClaudeText({ stop_reason: 'refusal', content: [] })).toThrow('AIが解析を拒否');
  });

  it('max_tokens で切れた場合はエラーにする', () => {
    expect(() =>
      extractClaudeText({ stop_reason: 'max_tokens', content: [{ type: 'text', text: '{"title":' }] }),
    ).toThrow('途中で切れ');
  });

  it('text ブロックが無ければエラー', () => {
    expect(() => extractClaudeText({ stop_reason: 'end_turn', content: [] })).toThrow('テキスト');
  });
});
