# おたよりAI - アプリケーション仕様書

**バージョン**: 0.1.0
**作成日**: 2026-06-19
**ステータス**: Phase 0 完了（基盤構築済み）

---

## 1. プロダクト概要

### 1.1 アプリ名
**おたよりAI**

### 1.2 コンセプト
保育園・学校・習い事から届くプリント（PDF）をAIで自動解析し、イベント・TODO・持ち物を抽出してカレンダー登録・リマインド通知まで一気通貫で行うiOSアプリ。

### 1.3 ターゲットユーザー
- 子供を保育園・幼稚園・学校に通わせている保護者
- 特に共働き家庭、子供が複数いる家庭
- プリントの整理・予定管理に課題を感じている人

### 1.4 解決する課題

| 課題 | 現状 | おたよりAIでの解決 |
|------|------|-------------------|
| ファイル名管理 | PDFのファイル名を手動で変更 | AIが `YYYY-MM_発行元_タイトル.pdf` 形式で自動生成 |
| 仕分け | 「単なるお知らせ」と「要対応」を手動で判別 | AIが `notice` / `action_required` に自動分類 |
| 予定登録 | プリントを読んでカレンダーに手入力 | AIがイベントを抽出し、Googleカレンダーに自動登録 |
| TODO管理 | プリントを読んでタスクに手入力 | AIがTODO・持ち物を抽出し、タスク登録 |
| リマインド | 自分で期限を覚えておく | LINE通知 + アプリ内Push通知で自動リマインド |
| 子供情報 | GASプロンプトにハードコード | アプリ内設定画面で管理、動的にプロンプト生成 |

### 1.5 既存システムからの移行
本アプリは [childcare-pdf-summarizer-1](https://github.com/koichi1115/childcare-pdf-summarizer-1) のGoogle Apps Script（GAS）実装をiOSネイティブアプリとして再構築するもの。

#### 現行GASシステムの構成
- Google Driveフォルダを5分おきにポーリング
- Gemini 2.5 Flash APIでPDF解析（JSON形式で構造化抽出）
- Googleカレンダーにイベント登録、Googleタスクにtodo登録
- 処理履歴をGoogleスプレッドシートに記録
- LINE Messaging APIで処理結果を通知

---

## 2. 技術スタック

| レイヤー | 技術 | バージョン | 選定理由 |
|---------|------|-----------|---------|
| フレームワーク | React Native (Expo) | SDK 56 | 開発者のExpo/EAS経験、クロスプラットフォーム |
| 言語 | TypeScript | 6.0 | 型安全性 |
| ナビゲーション | expo-router | 56.x | ファイルベースルーティング |
| ローカルDB | expo-sqlite | 56.x | オフライン対応、処理履歴・設定保存 |
| AI解析（デフォルト） | Claude Haiku 4.5 | claude-haiku-4-5-20251001 | 日本語精度・JSON安定性・コスト |
| AI解析（選択可） | Gemini 2.5 Flash | gemini-2.5-flash | 最安、無料枠あり |
| AI解析（選択可） | GPT-4o mini | gpt-4o-mini | バランス型 |
| PDF取り込み | expo-document-picker | 56.x | ファイル選択 |
| カメラ | expo-camera | 56.x | プリント撮影（Phase 1） |
| ファイル操作 | expo-file-system | 56.x | Base64エンコード |
| 認証 | Google Sign-In | - | OAuth（Phase 2） |
| クラウドストレージ | Google Drive API | v3 | PDF保存・自動リネーム（Phase 2） |
| カレンダー | Google Calendar API | v3 | イベント登録（Phase 2） |
| 通知 | LINE Messaging API | v2 | 処理結果通知（Phase 3） |
| Push通知 | Expo Push Notifications | - | アプリ内リマインド（Phase 3） |

### 2.1 LLMモデル比較（選定根拠）

| モデル | 入力コスト(/1M tokens) | 出力コスト(/1M tokens) | 日本語PDF精度 | JSON安定性 |
|--------|----------------------|----------------------|-------------|-----------|
| Claude Haiku 4.5 | $0.25 | $1.25 | 高 | 非常に高 |
| Gemini 2.5 Flash | $0.15 | $0.60 | 中〜高 | 中（マークダウン囲みあり） |
| GPT-4o mini | $0.15 | $0.60 | 中 | 高 |

**デフォルト: Claude Haiku 4.5** を採用。理由:
1. 日本語の学校プリント（独特のレイアウト・表・枠囲み）の構造理解が強い
2. JSON直出しの安定性が高く、パースエラーが少ない
3. 1プリントあたり約0.01〜0.03円、月100枚でも数円のコスト
4. ハルシネーション耐性が高い（日付・持ち物の読み間違いが致命的なユースケース）

---

## 3. アプリケーション構造

### 3.1 ディレクトリ構成

```
otayori-ai/
├── app/                          # Expo Router画面定義
│   ├── _layout.tsx               # ルートStack Navigator
│   ├── child-form.tsx            # 子供追加/編集（モーダル）
│   ├── facility-form.tsx         # 施設追加/編集（モーダル）
│   ├── analysis-result.tsx       # AI解析結果表示
│   └── (tabs)/                   # タブナビゲーション
│       ├── _layout.tsx           # Tab Navigator定義
│       ├── index.tsx             # ホーム（ダッシュボード）
│       ├── scan.tsx              # スキャン/取り込み
│       ├── history.tsx           # 処理履歴一覧
│       ├── children.tsx          # 子供・施設管理
│       └── settings.tsx          # アプリ設定
├── src/
│   ├── constants/
│   │   └── theme.ts              # デザイントークン
│   ├── types/
│   │   └── index.ts              # TypeScript型定義
│   ├── db/
│   │   ├── database.ts           # SQLite初期化・スキーマ
│   │   ├── children.ts           # 子供CRUD
│   │   ├── facilities.ts         # 施設CRUD
│   │   └── settings.ts           # 設定管理
│   └── services/
│       └── llm.ts                # マルチモデルLLMサービス
├── assets/                       # アイコン・画像
├── docs/                         # ドキュメント
│   └── SPEC.md                   # 本仕様書
├── app.json                      # Expo設定
├── package.json
└── tsconfig.json
```

### 3.2 画面遷移図

```
[タブナビゲーション]
├── ホーム ──→ 解析結果（詳細タップ時）
├── スキャン ──→ 解析結果（処理完了時）
├── 履歴 ──→ 解析結果（一覧タップ時）
├── 子供・施設
│   ├── ＋ボタン ──→ 子供追加フォーム（モーダル）
│   ├── 編集ボタン ──→ 子供編集フォーム（モーダル）
│   ├── ＋ボタン ──→ 施設追加フォーム（モーダル）
│   └── 編集ボタン ──→ 施設編集フォーム（モーダル）
└── 設定
```

---

## 4. 画面仕様

### 4.1 ホーム画面（ダッシュボード）

**パス**: `/(tabs)/`
**目的**: 重要情報の一覧表示、クイックアクセス

| 要素 | 説明 |
|------|------|
| ヘッダー | アプリ名、処理済み件数 |
| スキャンボタン | プリント取り込みへのショートカット |
| 未完了TODO | `todos`テーブルから`is_completed=0`を期限順に最大10件表示 |
| 今後のイベント | `events`テーブルから今日以降を日付順に最大10件表示 |
| 最近のプリント | `documents`テーブルから作成日降順に最大5件、カテゴリバッジ付き |

**リフレッシュ**: Pull-to-refresh対応、タブフォーカス時に自動再読み込み

### 4.2 スキャン画面

**パス**: `/(tabs)/scan`
**目的**: プリントの取り込みとAI解析

#### 取り込み方法（3種）

| 方法 | ステータス | 説明 |
|------|-----------|------|
| ファイルから選択 | **実装済み** | `expo-document-picker`でPDFを選択 |
| カメラでスキャン | Phase 1 | `expo-camera`で撮影→PDF化 |
| Google Driveから | Phase 2 | Google Drive APIでフォルダ内PDF取得 |

#### 処理フロー

```
1. PDF選択
2. ファイルをBase64エンコード（expo-file-system）
3. LLMサービスに送信（analyzePDF）
   a. 子供情報・施設情報をDBから取得
   b. 動的プロンプト生成
   c. 選択中のLLMプロバイダーに応じたAPI呼び出し
   d. レスポンスJSON解析
4. DBに保存
   a. documentsテーブル（メタデータ・要約・rawJSON）
   b. eventsテーブル（抽出イベント）
   c. todosテーブル（抽出TODO）
   d. itemsテーブル（抽出持ち物）
5. 解析結果画面に遷移
```

#### 処理中UI
- ActivityIndicator + ステータステキスト（「PDFを読み込み中...」→「AI解析中...」→「保存中...」）

### 4.3 解析結果画面

**パス**: `/analysis-result?docId={id}`
**目的**: AI解析結果の確認

| セクション | 内容 |
|-----------|------|
| ヘッダー | カテゴリバッジ（要対応/お知らせ）、タイトル、発行元、推奨ファイル名 |
| 要約 | AIが生成した500文字程度の要約テキスト |
| イベント | 日時・場所・対象者・詳細（カレンダーアイコン、青系カラー） |
| TODO | 期限・対象者・詳細（チェックボックスアイコン、黄系カラー） |
| 持ち物 | 期限・対象者・詳細（バッグアイコン、緑系カラー） |

各セクションは該当データがある場合のみ表示。

### 4.4 履歴画面

**パス**: `/(tabs)/history`
**目的**: 処理済みプリントの一覧・検索

- FlatListで全ドキュメントを作成日降順に表示
- 各行: カテゴリバッジ、タイトル、発行元、処理日
- タップで解析結果画面に遷移
- 空の場合はスキャンタブへの誘導テキスト表示

### 4.5 子供・施設管理画面

**パス**: `/(tabs)/children`
**目的**: AI解析の精度を上げるための基礎データ管理

#### 子供セクション

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| name | string | ○ | 子供の名前 |
| gender | 'male' \| 'female' | ○ | 性別（セグメンテッドコントロール） |
| birthdate | string (YYYY-MM-DD) | ○ | 生年月日 |
| className | string | - | 所属クラス名（例: ぱんだ組） |
| facilityId | number | - | 所属施設（登録済み施設から選択） |

#### 施設セクション

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| name | string | ○ | 施設名 |
| type | 'nursery' \| 'school' \| 'lesson' | ○ | 種別（保育園/学校/習い事） |
| address | string | - | 住所 |
| notes | string | - | 備考（レッスン日時など自由記述） |

- CRUD操作: 追加・編集（モーダルフォーム）・削除（確認ダイアログ付き）
- 施設を削除した場合、紐づく子供の`facility_id`はNULLになる（ON DELETE SET NULL）

### 4.6 設定画面

**パス**: `/(tabs)/settings`
**目的**: AIモデル・外部連携の設定

#### AIモデル設定

| 設定項目 | デフォルト値 | 説明 |
|---------|------------|------|
| llmProvider | claude | 使用するAI（claude / gemini / openai） |
| claudeApiKey | (空) | Anthropic APIキー |
| claudeModel | claude-haiku-4-5-20251001 | Claudeモデル名 |
| geminiApiKey | (空) | Google AI APIキー |
| geminiModel | gemini-2.5-flash | Geminiモデル名 |
| openaiApiKey | (空) | OpenAI APIキー |
| openaiModel | gpt-4o-mini | OpenAIモデル名 |

#### LINE通知設定（Phase 3）

| 設定項目 | 説明 |
|---------|------|
| lineChannelAccessToken | LINE Messaging APIのチャネルアクセストークン |
| lineUserId | 通知先のLINEユーザーID |

#### Google連携（Phase 2）

| 設定項目 | 説明 |
|---------|------|
| googleAccessToken | Google OAuth アクセストークン |
| driveFolderId | PDF保存先のGoogle DriveフォルダID |
| calendarId | イベント登録先のGoogleカレンダーID |

---

## 5. データベース設計

### 5.1 概要
- **エンジン**: SQLite（expo-sqlite）
- **DB名**: `otayori-ai.db`
- **モード**: WAL（Write-Ahead Logging）
- **外部キー制約**: 有効

### 5.2 ER図

```
facilities 1──N children
documents 1──N events
documents 1──N todos
documents 1──N items
settings（独立テーブル、Key-Value）
```

### 5.3 テーブル定義

#### facilities（施設）
| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | INTEGER | PK, AUTOINCREMENT | |
| name | TEXT | NOT NULL | 施設名 |
| type | TEXT | NOT NULL, DEFAULT 'nursery' | nursery/school/lesson |
| address | TEXT | NOT NULL, DEFAULT '' | 住所 |
| notes | TEXT | NOT NULL, DEFAULT '' | 備考 |
| created_at | TEXT | NOT NULL, DEFAULT datetime('now') | |
| updated_at | TEXT | NOT NULL, DEFAULT datetime('now') | |

#### children（子供）
| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | INTEGER | PK, AUTOINCREMENT | |
| name | TEXT | NOT NULL | 名前 |
| gender | TEXT | NOT NULL, DEFAULT 'male' | male/female |
| birthdate | TEXT | NOT NULL | YYYY-MM-DD |
| class_name | TEXT | NOT NULL, DEFAULT '' | クラス名 |
| facility_id | INTEGER | FK → facilities(id) ON DELETE SET NULL | 所属施設 |
| created_at | TEXT | NOT NULL, DEFAULT datetime('now') | |
| updated_at | TEXT | NOT NULL, DEFAULT datetime('now') | |

#### documents（処理済みドキュメント）
| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | INTEGER | PK, AUTOINCREMENT | |
| file_name | TEXT | NOT NULL | AI推奨ファイル名 |
| original_file_name | TEXT | NOT NULL | 元のファイル名 |
| file_path | TEXT | NOT NULL | ローカルファイルパス |
| drive_file_id | TEXT | | Google Drive ファイルID |
| status | TEXT | NOT NULL, DEFAULT 'pending' | pending/processing/completed/error |
| category | TEXT | NOT NULL, DEFAULT 'unknown' | notice/action_required/unknown |
| source | TEXT | NOT NULL, DEFAULT '' | 発行元施設名 |
| title | TEXT | NOT NULL, DEFAULT '' | ドキュメントタイトル |
| summary | TEXT | NOT NULL, DEFAULT '' | AI要約テキスト |
| raw_json | TEXT | NOT NULL, DEFAULT '' | LLMレスポンス全体（JSON文字列） |
| error_message | TEXT | | エラー時のメッセージ |
| created_at | TEXT | NOT NULL, DEFAULT datetime('now') | |
| updated_at | TEXT | NOT NULL, DEFAULT datetime('now') | |

#### events（抽出イベント）
| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | INTEGER | PK, AUTOINCREMENT | |
| document_id | INTEGER | NOT NULL, FK → documents(id) ON DELETE CASCADE | |
| title | TEXT | NOT NULL | イベント名 |
| date | TEXT | NOT NULL | YYYY-MM-DD |
| start_time | TEXT | | HH:MM |
| end_time | TEXT | | HH:MM |
| location | TEXT | | 場所 |
| target_person | TEXT | NOT NULL | 対象の子供の名前 |
| description | TEXT | NOT NULL, DEFAULT '' | 詳細 |
| calendar_event_id | TEXT | | Google Calendar登録後のID |
| created_at | TEXT | NOT NULL, DEFAULT datetime('now') | |

#### todos（抽出TODO）
| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | INTEGER | PK, AUTOINCREMENT | |
| document_id | INTEGER | NOT NULL, FK → documents(id) ON DELETE CASCADE | |
| title | TEXT | NOT NULL | TODO内容 |
| due_date | TEXT | | 期限 YYYY-MM-DD |
| target_person | TEXT | NOT NULL | 対象の子供の名前 |
| description | TEXT | NOT NULL, DEFAULT '' | 詳細 |
| is_completed | INTEGER | NOT NULL, DEFAULT 0 | 完了フラグ |
| task_id | TEXT | | Google Tasks登録後のID |
| created_at | TEXT | NOT NULL, DEFAULT datetime('now') | |

#### items（抽出持ち物）
| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | INTEGER | PK, AUTOINCREMENT | |
| document_id | INTEGER | NOT NULL, FK → documents(id) ON DELETE CASCADE | |
| name | TEXT | NOT NULL | 持ち物名 |
| due_date | TEXT | | 期限 YYYY-MM-DD |
| target_person | TEXT | NOT NULL | 対象の子供の名前 |
| description | TEXT | NOT NULL, DEFAULT '' | 詳細 |
| is_completed | INTEGER | NOT NULL, DEFAULT 0 | 完了フラグ |
| created_at | TEXT | NOT NULL, DEFAULT datetime('now') | |

#### settings（設定）
| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| key | TEXT | PK | 設定キー |
| value | TEXT | NOT NULL, DEFAULT '' | 設定値 |

---

## 6. AI解析仕様

### 6.1 プロンプト設計

LLMへのプロンプトは `src/services/llm.ts` の `buildPrompt()` 関数で動的に生成される。

#### プロンプト構成

```
#指示
以下のPDF資料を分析し、JSONのみを出力してください。

## 前提知識
今日の日付: {動的}
年が記載されていない日付は{今年}年として解釈してください。

### 子供の情報
{DBから動的に生成: 名前、性別、生年月日、クラス名}

### 施設の情報
{DBから動的に生成: 施設名、種別、住所、備考}

## 出力フォーマット
{JSON schema}

## ルール
1. 5ページ以上のPDFは対象外
2. ハルシネーション禁止
3. 日付はYYYY-MM-DD、時刻はHH:MM
4. targetPersonは登録済み子供名で記載
5. 該当なしは空配列
6. category判定ルール
7. suggestedFileName形式
```

### 6.2 LLMレスポンス形式

```json
{
  "title": "○○保育園 6月園だより",
  "source": "○○保育園",
  "category": "action_required",
  "summary": "・6月の行事予定...",
  "suggestedFileName": "2026-06_○○保育園_6月園だより.pdf",
  "events": [
    {
      "title": "プール開き",
      "date": "2026-06-20",
      "startTime": "10:00",
      "endTime": "11:00",
      "location": "園庭プール",
      "targetPerson": "太郎",
      "description": "水着・タオル持参"
    }
  ],
  "todos": [
    {
      "title": "プール同意書の提出",
      "dueDate": "2026-06-18",
      "targetPerson": "太郎",
      "description": "先日配布した同意書に記入して提出"
    }
  ],
  "items": [
    {
      "name": "水着",
      "dueDate": "2026-06-20",
      "targetPerson": "太郎",
      "description": "名前を書いた水着、水泳帽、バスタオル"
    }
  ]
}
```

### 6.3 カテゴリ判定ルール
- **`action_required`**: TODO、持ち物、提出物、準備が必要なものが1つでもある場合
- **`notice`**: 上記がなく、情報共有のみの場合

### 6.4 プロバイダー別API呼び出し

| プロバイダー | エンドポイント | PDF送信方法 |
|-------------|--------------|------------|
| Claude | `api.anthropic.com/v1/messages` | `type: "document"`, base64, `media_type: "application/pdf"` |
| Gemini | `generativelanguage.googleapis.com/v1beta` | `inline_data`, base64, `mime_type: "application/pdf"` |
| OpenAI | `api.openai.com/v1/chat/completions` | `type: "image_url"`, data URI |

---

## 7. データフロー設計

### 7.1 全体フロー

```
[PDF/画像の取り込み]
  ├── アプリ内で手動選択
  ├── カメラスキャン
  └── Google Driveフォルダ監視（自動検知）
        ↓
[Google Driveにアップロード]
  → 自動リネーム（AI推奨ファイル名）
  → drive_file_id を取得・DB保存
        ↓
[AI解析]（Claude / Gemini / OpenAI）
  → 構造化JSON取得
        ↓
[アプリ内DB保存] ← 正のデータソース
  ├── documents（メタデータ、要約、drive_file_id）
  ├── events（抽出イベント）
  ├── todos（抽出TODO）
  └── items（抽出持ち物）
        ↓
[外部サービスへミラー登録]
  ├── Googleカレンダー予定 ← イベント
  ├── Googleタスク ← TODO・持ち物
  └── LINE通知 ← 処理結果サマリー
```

### 7.2 TODO/タスクのデータ管理方針

| 項目 | 方針 |
|------|------|
| 正のデータソース | **アプリ内DB**（todos/itemsテーブル） |
| Googleタスク | **ミラー**（カレンダーアプリで確認できる利便性のため） |
| LINE通知のトリガー | **アプリ内DB**を参照（おたよりAI登録分のみ確実にフィルタ可能） |
| TODO完了操作 | アプリ内で完了チェック → Googleタスクにも反映（片方向同期） |
| 双方向同期 | 将来課題（Googleタスク側で完了 → アプリに反映） |

**理由**: Google Tasks APIには「このアプリが登録したタスク」をフィルタする機能がない。アプリ内DBを正とすることで、LINE通知対象のフィルタやアプリ独自のリマインドロジックを確実に制御できる。

### 7.3 元資料リンクの埋め込み

Googleカレンダー・タスク登録時、descriptionに元PDFのGoogle DriveリンクURLを必ず含める。これにより、カレンダーから直接元資料を参照できる。

```
【Googleカレンダー予定のdescription例】
📋 発行元: ○○保育園
👤 対象: 太郎
📍 場所: 園庭プール
📝 内容: 水着・タオル持参

📎 元資料: https://drive.google.com/open?id=xxxxx
📄 おたよりAI登録

【Googleタスクのnotes例】
【太郎】プール同意書の提出
期限: 2026-06-18
詳細: 先日配布した同意書に記入して提出

📎 元資料: https://drive.google.com/open?id=xxxxx
📄 おたよりAI登録
```

- `drive_file_id` はアプリ内DBの `documents.drive_file_id` カラムに保存済み
- URL形式: `https://drive.google.com/open?id={drive_file_id}`
- 「📄 おたよりAI登録」のマーカーを含めることで、カレンダー上でおたよりAI経由の登録を識別可能

---

## 8. デザインシステム

### 7.1 カラーパレット

| 用途 | カラー名 | 値 |
|------|---------|-----|
| メインカラー | primary | `#4A90D9` |
| メインカラー（薄） | primaryLight | `#E8F1FB` |
| アクセント | secondary | `#FF9500` |
| 成功 | success | `#34C759` |
| 危険 | danger | `#FF3B30` |
| 警告 | warning | `#FFCC00` |
| 背景 | background | `#F5F5F5` |
| サーフェス | surface | `#FFFFFF` |
| テキスト | text | `#1C1C1E` |
| テキスト（副） | textSecondary | `#8E8E93` |
| ボーダー | border | `#E5E5EA` |
| お知らせバッジ | notice | `#A8D8EA` |
| 要対応バッジ | actionRequired | `#FFB7B2` |

### 7.2 スペーシング
`xs: 4px`, `sm: 8px`, `md: 16px`, `lg: 24px`, `xl: 32px`

### 7.3 フォントサイズ
`xs: 11`, `sm: 13`, `md: 15`, `lg: 17`, `xl: 20`, `xxl: 28`

---

## 9. 開発ロードマップ

### Phase 0: 基盤構築 ✅ 完了

- [x] Expoプロジェクト作成（React Native, TypeScript）
- [x] expo-routerによるタブナビゲーション（5タブ）
- [x] SQLiteデータベース設計・初期化（7テーブル）
- [x] 子供・施設のCRUD画面
- [x] マルチモデルLLMサービス（Claude/Gemini/OpenAI）
- [x] PDF取り込み→AI解析→DB保存→結果表示のコアフロー
- [x] 設定画面（APIキー・モデル切替）
- [x] ホームダッシュボード
- [x] 履歴画面
- [x] TypeScript型チェック・Expoビルド通過確認

### Phase 1: コア機能ブラッシュアップ

- [ ] カメラスキャン機能（expo-camera → PDF化）
- [ ] 解析結果の編集機能（イベント・TODO・持ち物の修正・削除）
- [ ] TODO/持ち物の完了チェック機能
- [ ] 履歴画面の検索・フィルタ（子供別、カテゴリ別、日付範囲）
- [ ] エラーハンドリング強化（ネットワークエラー、API制限）
- [ ] ローディング・空状態のUI改善

### Phase 2: Google連携

- [ ] Google Sign-In（OAuth 2.0）
- [ ] Google Drive API連携
  - **指定フォルダの自動監視**（PDF/画像が追加されたら自動解析 ← GAS版の再現・最優先）
  - PDFのアップロード・自動リネーム
  - 画像ファイル対応（JPG/PNG → AI解析）
- [ ] Google Calendar API連携
  - 抽出イベントのカレンダー登録
  - 登録済みイベントの更新・削除
- [ ] Google Tasks API連携
  - TODO・持ち物のタスク登録

### Phase 3: 通知・配信

- [ ] LINE Messaging API連携（処理結果の通知）
- [ ] Expo Push Notifications（TODO期限リマインド）
- [ ] バックグラウンド処理（Google Driveフォルダ監視）

### Phase 4: 磨き込み・公開準備

- [ ] UI/UXブラッシュアップ
- [ ] オンボーディングフロー（初回起動時のセットアップガイド）
- [ ] 複数ページPDF対応の改善
- [ ] 画像（写真撮影したプリント）のOCR対応
- [ ] App Store公開準備（アイコン、スクリーンショット、説明文）
- [ ] プライバシーポリシー・利用規約

---

## 10. セキュリティ考慮事項

| 項目 | 対応方針 |
|------|---------|
| APIキー保存 | SQLite（ローカルDB）に保存。将来的にexpo-secure-storeに移行検討 |
| PDF内の個人情報 | デバイス上で処理、外部送信はLLM APIのみ |
| Google OAuth | 標準のOAuth 2.0フロー、トークンはセキュアストレージに保存 |
| LINE通知 | チャネルアクセストークンはローカル保存 |
| 通信 | 全API通信はHTTPS |

---

## 11. 競合・類似サービス分析

| アプリ | PDF化 | カレンダー連携 | TODO抽出 | AI解析 | LINE通知 | 子供情報管理 |
|--------|-------|-------------|---------|--------|---------|------------|
| **おたよりAI** | ○ | ○（Google） | ○（自動） | ○（マルチモデル） | ○ | ○ |
| プリゼロ | ○ | △（有料） | × | × | × | × |
| かんたんプリント管理 | ○ | ○ | × | △（OCRのみ） | × | × |
| おたよりクリップ | ○ | × | × | × | × | × |
| Sense（海外） | × | ○ | × | ○（英語メール） | × | × |

**差別化ポイント**: 「子供情報の事前登録→PDFからの自動仕分け・TODO抽出→Googleカレンダー登録→LINE通知」の一気通貫フローは既存アプリにない。

---

## 12. 将来的な連携の可能性：EchoNote

> **ステータス**: 構想段階。現時点では具体的な実装予定なし。両アプリが単体で十分に完成した後に検討する。

[EchoNote](https://github.com/koichi1115)は同じ開発者が制作しているiOSアプリで、音声録音をAIで文字起こし・構造化ノート化するツール。技術スタック（Expo + TypeScript）やターゲットユーザー（子育て中の保護者）が共通しており、将来的に連携の可能性がある。

### 想定される連携シナリオ

| シナリオ | 概要 |
|---------|------|
| 保護者会の音声補完 | EchoNoteで録音した保護者会・面談の内容から、おたよりAIと同じ形式でTODO/イベントを抽出・統合 |
| Share Extension | iOSの共有機能を使い、おたよりAIの要約をEchoNoteに送信、またはその逆 |
| TODO統合 | 両アプリのTODOデータ構造が類似（title, dueDate, targetPerson）しており、統合表示が技術的に容易 |

### 技術的な親和性
- 両アプリともExpo (React Native) + TypeScript
- 両方ともAI解析でJSON構造化抽出を行うアーキテクチャ
- iOSのApp Groupsを利用すればアプリ間データ共有が可能

---

## 13. 用語集

| 用語 | 説明 |
|------|------|
| おたより | 保育園・学校から配布されるプリント・お知らせ文書 |
| 発行元（source） | プリントを発行した施設（保育園、ピアノ教室等） |
| カテゴリ（category） | `notice`（お知らせのみ）or `action_required`（要対応） |
| 推奨ファイル名（suggestedFileName） | AIが生成する `YYYY-MM_発行元_タイトル.pdf` 形式のファイル名 |
| LLMプロバイダー | AI解析に使用するサービス（Claude/Gemini/OpenAI） |
