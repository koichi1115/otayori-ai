import type { AnalysisResult } from '../types';
import { getChildren } from '../db/children';
import { getFacilities } from '../db/facilities';
import { getSetting } from '../db/settings';
import { callClaude } from './llm-claude';
import { resolveClaudeModel } from './llm-model';
import { buildPrompt } from './llm-prompt';
import { parseResponse } from './llm-parse';

export { buildPrompt, parseResponse };

async function callGemini(apiKey: string, model: string, prompt: string, base64Data: string, mimeType: string = 'application/pdf'): Promise<string> {
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
            { inline_data: { mime_type: mimeType, data: base64Data } },
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

async function callOpenAI(apiKey: string, model: string, prompt: string, base64Data: string, mimeType: string = 'application/pdf'): Promise<string> {
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
              image_url: { url: `data:${mimeType};base64,${base64Data}` },
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

export async function analyzeDocument(base64: string, mimeType: string = 'application/pdf'): Promise<AnalysisResult> {
  return analyzePDF(base64, mimeType);
}

export async function analyzePDF(pdfBase64: string, mimeType: string = 'application/pdf'): Promise<AnalysisResult> {
  const Constants = require('expo-constants').default;
  const extra = Constants.expoConfig?.extra;
  const apiKey = extra?.claudeApiKey || process.env.EXPO_PUBLIC_CLAUDE_API_KEY || '';
  const model = resolveClaudeModel(await getSetting('claudeModel'));

  if (!apiKey) {
    const debugInfo = JSON.stringify({
      hasExpoConfig: !!Constants.expoConfig,
      hasExtra: !!extra,
      extraKeys: extra ? Object.keys(extra) : [],
      buildNumber: Constants.expoConfig?.ios?.buildNumber,
    });
    throw new Error(`APIキーが設定されていません。(debug: ${debugInfo})`);
  }

  const children = await getChildren();
  const facilities = await getFacilities();
  const prompt = buildPrompt(children, facilities);

  let responseText: string;
  try {
    ({ text: responseText } = await callClaude({ apiKey, model, prompt, base64: pdfBase64, mimeType }));
  } catch (e: any) {
    if (e.message?.includes('Network request failed') || e.message?.includes('fetch')) {
      throw new Error('ネットワーク接続に失敗しました。インターネット接続を確認してください。');
    }
    if (e.message?.includes('401') || e.message?.includes('403')) {
      throw new Error('AI解析サービスに接続できません。しばらく待ってから再試行してください。');
    }
    if (e.message?.includes('429')) {
      throw new Error('AIのリクエスト上限に達しました。しばらく待ってから再試行してください。');
    }
    throw e;
  }

  return parseResponse(responseText);
}
