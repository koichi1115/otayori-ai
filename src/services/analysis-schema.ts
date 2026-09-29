/**
 * プリント解析結果の JSON Schema（Claude structured outputs: output_config.format）。
 * 制約は公式 https://platform.claude.com/docs/en/build-with-claude/structured-outputs に従う:
 *  - すべての object に additionalProperties: false
 *  - minimum/maxLength 等の数値・文字列制約は使わない
 *  - 省略可能パラメータは合計 24 個まで
 * AnalysisResult 型（src/types）と対応させること。
 */
const person = { type: 'string', description: '対象の子供の名前' } as const;
const text = { type: 'string' } as const;
const isoDate = { type: 'string', format: 'date', description: 'YYYY-MM-DD' } as const;

export const ANALYSIS_JSON_SCHEMA = {
  type: 'object',
  properties: {
    title: text,
    source: text,
    category: { type: 'string', enum: ['notice', 'action_required'] },
    summary: text,
    suggestedFileName: text,
    events: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: text,
          date: isoDate,
          startTime: { type: 'string', description: 'HH:MM（24時間表記）' },
          endTime: { type: 'string', description: 'HH:MM（24時間表記）' },
          location: text,
          targetPerson: person,
          description: text,
        },
        required: ['title', 'date', 'targetPerson', 'description'],
        additionalProperties: false,
      },
    },
    todos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: text,
          dueDate: isoDate,
          targetPerson: person,
          description: text,
        },
        required: ['title', 'targetPerson', 'description'],
        additionalProperties: false,
      },
    },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: text,
          dueDate: isoDate,
          targetPerson: person,
          description: text,
        },
        required: ['name', 'targetPerson', 'description'],
        additionalProperties: false,
      },
    },
  },
  required: ['title', 'source', 'category', 'summary', 'suggestedFileName', 'events', 'todos', 'items'],
  additionalProperties: false,
} as const;
