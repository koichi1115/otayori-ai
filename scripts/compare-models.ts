/**
 * 実 API を叩くモデル比較スクリプト（jest とは別。課金が発生する）。
 *
 *   ドライラン（API を叩かない。リクエスト組み立てと概算コスト上限を表示）:
 *     npm run compare:models
 *   実行（明示フラグ必須。ANTHROPIC_API_KEY が必要）:
 *     ANTHROPIC_API_KEY=... npm run compare:models -- --run [--models=a,b] [--repeat=1] [--out=report.json]
 *
 * 入力は fixtures/prints/ の架空プリント（PDF 2 + 写真 1）のみ。実際のプリントは使わない。
 * API キーは環境変数からのみ読み、出力・ログ・レポートには書かない。
 */
import * as fs from 'fs';
import * as path from 'path';
import { buildPrompt } from '../src/services/llm-prompt';
import { parseResponse } from '../src/services/llm-parse';
import { buildClaudeRequest, extractClaudeText, type ClaudeResponse } from '../src/services/llm-request';
import { estimateCostUSD } from '../src/services/llm-cost';
import { BASELINE_CLAUDE_MODEL, MODEL_VERIFIED_AT } from '../src/constants/llm';
import type { Child, Facility } from '../src/types';
import { scoreAnalysis, type ExpectedAnalysis } from './lib/score';
import { estimateRunCost, formatReport, parseArgs, type ModelRunResult } from './lib/compare';

const FIXTURE_DIR = path.resolve(__dirname, '../fixtures/prints');

interface FixtureFile extends ExpectedAnalysis {
  mimeType: string;
}
interface Fixture {
  context: {
    facilities: { id: number; name: string; type: Facility['type']; notes: string }[];
    children: { id: number; name: string; gender: Child['gender']; birthdate: string; className: string; facilityId: number }[];
  };
  files: Record<string, FixtureFile>;
}

function loadFixture(): Fixture {
  return JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, 'expected.json'), 'utf8'));
}

function buildContext(fx: Fixture) {
  const facilities = fx.context.facilities.map((f) => ({ ...f, address: '', createdAt: '', updatedAt: '' })) as Facility[];
  const children = fx.context.children.map((c) => ({ ...c, createdAt: '', updatedAt: '' })) as Child[];
  return { facilities, children };
}

async function runOne(apiKey: string, model: string, file: string, spec: FixtureFile, prompt: string): Promise<ModelRunResult> {
  const base64 = fs.readFileSync(path.join(FIXTURE_DIR, file)).toString('base64');
  const req = buildClaudeRequest({ apiKey, model, prompt, base64, mimeType: spec.mimeType });
  const started = Date.now();
  try {
    const res = await fetch(req.url, { method: 'POST', headers: req.headers, body: JSON.stringify(req.body) });
    const ms = Date.now() - started;
    if (!res.ok) {
      // レスポンス本文は API キーを含まないが、長くなるので先頭のみ
      return { model, file, ms, usage: null, costUSD: null, score: null, error: `HTTP ${res.status}: ${(await res.text()).slice(0, 300)}` };
    }
    const json = (await res.json()) as ClaudeResponse;
    const analysis = parseResponse(extractClaudeText(json));
    const usage = json.usage ?? null;
    return { model, file, ms, usage, costUSD: usage ? estimateCostUSD(model, usage) : null, score: scoreAnalysis(spec, analysis), error: null };
  } catch (e) {
    return { model, file, ms: Date.now() - started, usage: null, costUSD: null, score: null, error: (e as Error).message };
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const fx = loadFixture();
  const files = Object.keys(fx.files);
  const est = estimateRunCost(args.models, files.length, args.repeat);
  const { children, facilities } = buildContext(fx);
  const prompt = buildPrompt(children, facilities);

  console.log(`公式確認日時: ${MODEL_VERIFIED_AT} / ベースライン: ${BASELINE_CLAUDE_MODEL}`);
  console.log(`対象: ${files.join(', ')}`);
  console.log(`モデル: ${args.models.join(', ')} × ${args.repeat} 回 = ${est.calls} 呼び出し（概算コスト上限 約 $${est.maxUSD.toFixed(2)}）`);

  if (!args.run) {
    for (const m of args.models) {
      const req = buildClaudeRequest({ apiKey: 'DRY_RUN', model: m, prompt, base64: '<base64>', mimeType: 'application/pdf' });
      const shown = JSON.stringify({ ...req.body, output_config: { ...req.body.output_config, format: { type: 'json_schema', schema: '<省略>' } } });
      console.log(`\n[dry-run] ${m}\n  POST ${req.url}\n  body(先頭) ${shown.slice(0, 200)}...`);
    }
    console.log('\nドライランのため API は呼んでいません。実行するには --run を付けてください。');
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY が未設定です。実 API 比較は実行しません。');
    process.exit(2);
  }

  const results: ModelRunResult[] = [];
  for (const model of args.models) {
    for (const file of files) {
      for (let i = 0; i < args.repeat; i++) {
        const r = await runOne(apiKey, model, file, fx.files[file], prompt);
        results.push(r);
        console.log(`${model} / ${file} #${i + 1}: ${r.error ? 'ERROR ' + r.error : `${r.ms}ms recall=${r.score!.recall.toFixed(2)}`}`);
      }
    }
  }
  const report = formatReport(results, BASELINE_CLAUDE_MODEL);
  console.log('\n' + report);
  if (args.out) {
    fs.writeFileSync(args.out, JSON.stringify({ verifiedAt: MODEL_VERIFIED_AT, results, report }, null, 2));
    console.log(`\nレポートを書き出しました: ${args.out}`);
  }
}

main().catch((e) => {
  console.error((e as Error).message);
  process.exit(1);
});
