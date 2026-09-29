# LLM モデル管理

プリント解析に使うモデルの定義は **`src/constants/llm.ts` の 1 か所**に集約しています（テストで他ファイルへのリテラル混入を検査）。

## 現在の構成

| 項目 | 内容 |
|---|---|
| プロバイダ | Anthropic（Claude）。`fetch` で Messages API を直接呼ぶ（SDK 不使用） |
| 標準モデル | `claude-sonnet-5-5`（`DEFAULT_CLAUDE_MODEL`） |
| 選択肢 | Sonnet 5.5 / Opus 5.5 / Haiku 4.5（旧標準）。設定画面「AI解析モデル」で切替、設定 DB の `claudeModel` に保存 |
| 入力 | PDF は `document` ブロック、写真は `image` ブロック（base64、テキストより前に配置） |
| 出力 | `output_config.format`（`json_schema`）で構造化 JSON。スキーマは `src/services/analysis-schema.ts` |
| effort | `output_config.effort = medium`（対応モデルのみ。Haiku 4.5 は非対応なので送らない） |
| API キー | ビルド時の環境変数 `CLAUDE_API_KEY` → `app.config.js` の `extra`（既存仕様。今回は変更なし） |

## モデルを更新する手順

1. 公式を確認する（推測でモデル名を書かない）
   - https://platform.claude.com/docs/en/about-claude/models/overview
   - https://platform.claude.com/docs/en/about-claude/model-deprecations
   - 移行ガイド（例: https://platform.claude.com/docs/en/models/sonnet-5-5/migration-guide）
2. `src/constants/llm.ts` の `CLAUDE_MODELS` / `DEFAULT_CLAUDE_MODEL` / `MODEL_VERIFIED_AT` を更新
3. 比較スクリプトで劣化がないか確認（下記）
4. `npm test && npx tsc --noEmit`

## Sonnet 5.5 で 400 になる設定（送らないこと）

`temperature` / `top_p` / `top_k`（非デフォルト値）、assistant prefill、`thinking: {type: "disabled"}`、`thinking.budget_tokens`、`output_format`（旧。`output_config.format` を使う）。

## 実 API 比較（課金あり・手動）

```bash
npm run compare:models                       # ドライラン: API を叩かず、概算コスト上限のみ表示
ANTHROPIC_API_KEY=sk-ant-... npm run compare:models -- --run --out=/tmp/compare.json
```

- 入力は `fixtures/prints/` の架空プリント（PDF 2 枚 + 写真 1 枚）。正解は `expected.json`
- 既定は Haiku 4.5（旧標準）と Sonnet 5.5 の 2 モデル × 3 枚 = 6 呼び出し（概算上限 約 $0.5）
- 評価: recall / precision / 日付正答率 / 対象者正答率 / 禁止項目（対象外学年の行事）/ 応答時間 / トークン / 概算 USD
- jest には含まれない（`npm test` は API を呼ばない）
