<p align="center">
  <img src="assets/icon.png" width="120" alt="ぷりかん！ アイコン" />
</p>

<h1 align="center">ぷりかん！</h1>

<p align="center">
  学校・保育園のプリントをAIで自動解析し、予定管理を劇的にラクにするiOSアプリ
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-iOS-blue" alt="Platform" />
  <img src="https://img.shields.io/badge/Expo-SDK%2056-000020?logo=expo" alt="Expo SDK" />
  <img src="https://img.shields.io/badge/React%20Native-0.85-61DAFB?logo=react" alt="React Native" />
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript" alt="TypeScript" />
</p>

---

## 概要

ぷりかん！は、保育園・学校・習い事から届くプリント（PDF・画像）をAIで自動解析し、**イベント・TODO・持ち物**を抽出してGoogleカレンダー/タスクに自動登録、LINE通知まで行うiOSアプリです。

### 解決する課題

- 大量のプリントから予定を拾うのが面倒
- 提出物の期限をうっかり忘れてしまう
- 持ち物リストを見落として子供に申し訳ない思いをした
- プリントのファイル名を手動で整理するのが大変

## 主な機能

| 機能 | 説明 |
|------|------|
| AI自動解析 | PDF/画像を取り込むだけで、イベント・TODO・持ち物を自動抽出・分類 |
| マルチAIモデル | Claude / Gemini / OpenAI の3モデルから選択可能 |
| Googleカレンダー連携 | イベントをワンタップでカレンダー登録（元資料リンク付き） |
| Googleタスク連携 | TODO・持ち物をタスクとして自動登録 |
| Google Drive同期 | 指定フォルダの新規ファイルを自動検出・解析 |
| LINE通知 | 解析結果をLINEで自動通知 |
| 複数子供対応 | 子供・施設情報を登録してAI精度を向上 |
| ファイル自動リネーム | AIが `YYYY-MM_発行元_タイトル.pdf` 形式で命名 |

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フレームワーク | React Native (Expo SDK 56) |
| 言語 | TypeScript 6.0 |
| ナビゲーション | expo-router (ファイルベース) |
| ローカルDB | expo-sqlite (WAL mode) |
| AI解析 | Claude API / Gemini API / OpenAI API |
| 認証 | Google OAuth 2.0 (expo-auth-session) |
| 外部連携 | Google Drive / Calendar / Tasks API, LINE Messaging API |

## アーキテクチャ

```
[PDF/画像の取り込み]
  ├── アプリ内で手動選択
  ├── カメラスキャン（予定）
  └── Google Driveフォルダ同期
        ↓
[AI解析] (Claude / Gemini / OpenAI)
  → 構造化JSON取得
        ↓
[アプリ内DB保存] ← 正のデータソース
  ├── documents（メタデータ、要約）
  ├── events（抽出イベント）
  ├── todos（抽出TODO）
  └── items（抽出持ち物）
        ↓
[外部サービスへミラー登録]
  ├── Googleカレンダー予定
  ├── Googleタスク
  └── LINE通知
```

## セットアップ

```bash
# クローン
git clone https://github.com/koichi1115/otayori-ai.git
cd otayori-ai

# 依存関係インストール
npm install

# iOS シミュレータで起動
npx expo run:ios

# または Expo Go で起動
npx expo start
```

### 必要な設定

1. **AIモデルのAPIキー** — アプリの設定画面から入力（Claude / Gemini / OpenAI のいずれか）
2. **Google連携**（任意） — Google Cloud Console で OAuth Client ID を取得
3. **LINE通知**（任意） — LINE Developers Console でチャネルアクセストークンを取得

## 画面構成

| 画面 | 説明 |
|------|------|
| ホーム | ダッシュボード（未完了TODO、今後のイベント、最近のプリント） |
| スキャン | PDF/画像の取り込み・AI解析 |
| 履歴 | 処理済みプリント一覧（検索・フィルタ対応） |
| 子供・施設 | AI解析精度向上のための基礎データ管理 |
| 設定 | AIモデル・Google連携・LINE通知の設定 |

## 背景

本アプリは [childcare-pdf-summarizer-1](https://github.com/koichi1115/childcare-pdf-summarizer-1) のGoogle Apps Script実装を、iOSネイティブアプリとして再構築したものです。

GAS版では Google Driveフォルダの5分おきポーリング → Gemini解析 → カレンダー/タスク登録 → LINE通知 という一連のフローを実現していましたが、ファイル名の手動変更やカテゴリ仕分けの手間が残っていました。ぷりかん！ではこれらを全自動化しています。

## ライセンス

MIT
