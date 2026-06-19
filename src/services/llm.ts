import type { AnalysisResult, LLMProvider, Child, Facility } from '../types';
import { getLLMConfig } from '../db/settings';
import { getChildren } from '../db/children';
import { getFacilities } from '../db/facilities';

function buildPrompt(children: Child[], facilities: Facility[]): string {
  const today = new Date().toISOString().split('T')[0];
  const year = new Date().getFullYear();

  let childrenInfo = '';
  children.forEach((child, i) => {
    const genderStr = child.gender === 'male' ? '男性' : '女性';
    childrenInfo += `${i + 1}人目: ${child.name} ${genderStr} ${child.birthdate}生まれ`;
    if (child.className) childrenInfo += ` (${child.className})`;
    childrenInfo += '\n';
  });

  let facilitiesInfo = '';
  facilities.forEach((f) => {
    const typeStr = f.type === 'nursery' ? '保育園' : f.type === 'school' ? '学校' : '習い事';
    facilitiesInfo += `- ${f.name} (${typeStr})`;
    if (f.address) facilitiesInfo += ` 所在地: ${f.address}`;
    if (f.notes) facilitiesInfo += `\n  ${f.notes}`;
    facilitiesInfo += '\n';
  });

  const childNames = children.map(c => `"${c.name}"`).join(' or ');

  return `#指示
以下のPDF資料を分析し、JSONのみを出力してください。

## 前提知識
今日の日付: ${today}
年が記載されていない日付は${year}年として解釈してください。

### 子供の情報
${childrenInfo || '(未登録)'}

### 施設の情報
${facilitiesInfo || '(未登録)'}

## 出力フォーマット
必ず以下のJSON形式のみを出力してください。説明文やマークダウン記法は含めないでください:

{
  "title": "ドキュメントのタイトル（例: ○○保育園 6月園だより）",
  "source": "発行元の施設名",
  "category": "notice または action_required（TODOや持ち物、提出物がある場合はaction_required）",
  "summary": "要約内容（500文字程度、箇条書き形式、*は使わず・や-を使用）",
  "suggestedFileName": "推奨ファイル名（例: 2025-06_○○保育園_6月園だより.pdf）",
  "events": [
    {
      "title": "イベント名",
      "date": "YYYY-MM-DD",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "location": "場所",
      "targetPerson": "対象の子供の名前",
      "description": "詳細"
    }
  ],
  "todos": [
    {
      "title": "TODO内容",
      "dueDate": "YYYY-MM-DD",
      "targetPerson": "対象の子供の名前",
      "description": "詳細"
    }
  ],
  "items": [
    {
      "name": "持ち物名",
      "dueDate": "YYYY-MM-DD",
      "targetPerson": "対象の子供の名前",
      "description": "詳細"
    }
  ]
}

## ルール
1. 5ページ以上のPDFは対象外
2. ハルシネーションしないこと。判断がつかない場合はsummaryにその旨を記載
3. 日付はYYYY-MM-DD、時刻はHH:MM（24時間表記）
4. targetPersonは必ず ${childNames || '"子供の名前"'} で記載
5. events, todos, itemsは該当がなければ空配列[]
6. categoryは、TODOや持ち物、提出物、準備が必要なものが1つでもあれば "action_required"、なければ "notice"
7. suggestedFileNameはYYYY-MM_発行元_タイトル.pdf の形式`;
}

async function callClaude(apiKey: string, model: string, prompt: string, pdfBase64: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBase64,
              },
            },
            { type: 'text', text: prompt },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error (${response.status}): ${error}`);
  }

  const result = await response.json();
  return result.content[0].text;
}

async function callGemini(apiKey: string, model: string, prompt: string, pdfBase64: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            { inline_data: { mime_type: 'application/pdf', data: pdfBase64 } },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${error}`);
  }

  const result = await response.json();
  return result.candidates[0].content.parts[0].text;
}

async function callOpenAI(apiKey: string, model: string, prompt: string, pdfBase64: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: `data:application/pdf;base64,${pdfBase64}` },
            },
          ],
        },
      ],
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${error}`);
  }

  const result = await response.json();
  return result.choices[0].message.content;
}

function parseResponse(text: string): AnalysisResult {
  let jsonText = text.trim();
  // Remove markdown code fences if present
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?$/g, '').trim();
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/```\n?/g, '').trim();
  }

  // Try to find JSON object if response contains extra text
  if (!jsonText.startsWith('{')) {
    const match = jsonText.match(/\{[\s\S]*\}/);
    if (match) jsonText = match[0];
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    throw new Error(`AI応答のJSON解析に失敗しました。応答の先頭200文字:\n${text.substring(0, 200)}`);
  }

  // Validate required fields with defaults
  return {
    title: parsed.title || '(タイトル不明)',
    source: parsed.source || '(発行元不明)',
    category: parsed.category === 'action_required' ? 'action_required' : 'notice',
    summary: parsed.summary || '',
    suggestedFileName: parsed.suggestedFileName || '',
    events: Array.isArray(parsed.events) ? parsed.events : [],
    todos: Array.isArray(parsed.todos) ? parsed.todos : [],
    items: Array.isArray(parsed.items) ? parsed.items : [],
  };
}

const callers: Record<LLMProvider, (apiKey: string, model: string, prompt: string, pdf: string) => Promise<string>> = {
  claude: callClaude,
  gemini: callGemini,
  openai: callOpenAI,
};

export async function analyzePDF(pdfBase64: string): Promise<AnalysisResult> {
  const config = await getLLMConfig();
  if (!config.apiKey) {
    throw new Error(`${config.provider}のAPIキーが設定されていません。設定画面から入力してください。`);
  }

  const children = await getChildren();
  const facilities = await getFacilities();
  const prompt = buildPrompt(children, facilities);

  const caller = callers[config.provider];

  let responseText: string;
  try {
    responseText = await caller(config.apiKey, config.model, prompt, pdfBase64);
  } catch (e: any) {
    if (e.message?.includes('Network request failed') || e.message?.includes('fetch')) {
      throw new Error('ネットワーク接続に失敗しました。インターネット接続を確認してください。');
    }
    if (e.message?.includes('401')) {
      throw new Error(`${config.provider}のAPIキーが無効です。設定画面で正しいキーを入力してください。`);
    }
    if (e.message?.includes('429')) {
      throw new Error('APIのレート制限に達しました。しばらく待ってから再試行してください。');
    }
    throw e;
  }

  return parseResponse(responseText);
}
