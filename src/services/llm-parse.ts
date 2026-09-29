import type { AnalysisResult } from '../types';

export function parseResponse(text: string): AnalysisResult {
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
