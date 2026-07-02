# App Store 審査提出資料

## 基本情報

| 項目 | 内容 |
|------|------|
| アプリ名 | ぷりかん！ |
| サブタイトル | 学校プリントをAIで自動整理 |
| Bundle ID | com.otayori.ai |
| カテゴリ（プライマリ） | Productivity（仕事効率化） |
| カテゴリ（セカンダリ） | Education（教育） |
| 対象年齢 | 4+（ユーザー生成コンテンツなし） |
| 価格 | 無料（アプリ内課金あり ※後述の料金体系による） |

---

## App Store 説明文

### プロモーションテキスト（170文字以内）
学校・保育園のプリント、もう見落としません。PDFや写真を取り込むだけで、AIがイベント・TODO・持ち物を自動抽出。LINE通知と事前リマインダーで、大事な予定と提出物を逃しません。

### 説明文（4000文字以内）

ぷりかん！は、学校・保育園・習い事から届くプリントをAIで自動解析し、予定管理を劇的にラクにするアプリです。

■ こんな悩みを解決します
・大量のプリントから予定を拾うのが面倒
・提出物の期限をうっかり忘れてしまう
・持ち物リストを見落として子供に申し訳ない思いをした
・プリントのファイル名を手動で整理するのが大変

■ 主な機能

【AI自動解析】
PDFや写真を取り込むだけで、高精度AIが内容を分析。イベント（運動会、遠足）、TODO（同意書提出、申込み）、持ち物（水着、弁当）を自動で抽出・分類します。

【カメラでスキャン】
紙のプリントをその場で撮影して取り込み。ファイル選択にも対応しています。

【LINE通知】
解析結果をLINEで自動通知。パートナーとの情報共有もスムーズに。

【事前リマインダー】
期限のあるTODO・持ち物を、指定した日数前にLINEでお知らせ。提出忘れを防ぎます。

【複数の子供・施設に対応】
子供の名前やクラス、通っている施設を登録しておくと、AIが「誰の」「どこの」プリントかを正確に判別します。

■ こんな方におすすめ
・共働きで忙しい保護者の方
・子供が複数いて、プリント管理が大変な方
・紙のプリントをデジタル化して整理したい方
・提出物の期限を絶対に忘れたくない方

■ ご利用にあたって
・AI解析機能はアプリに組み込み済み。面倒な設定は不要です
・ログイン不要ですぐに使えます
・LINE通知・リマインダーにはLINE公式アカウントの友だち追加が必要です（任意）

---

### キーワード（100文字以内）
プリント管理,学校,保育園,幼稚園,AI,PDF,スキャン,TODO,持ち物,子育て,おたより,自動整理,予定管理,LINE通知,リマインダー

---

## 審査メモ（App Review Notes）

### デモアカウント情報
本アプリはログイン不要でご利用いただけます。AI解析機能はアプリに組み込み済みです。

レビュー用のテスト手順：
1. アプリを起動
2. 「子供・施設」タブで子供情報を追加（例: 名前「太郎」、性別「男」、生年月日「2020-01-01」）
3. 「スキャン」タブで「ファイルから選択」をタップし、添付のテスト用PDFを選択
4. AI解析結果が表示されることを確認

### 審査用添付ファイル
- テスト用PDF（サンプルの園だより）を添付予定

---

## スクリーンショット仕様

### iPhone 6.7インチ（iPhone 15 Pro Max / 16 Pro Max）- 必須
1. **ホーム画面** - ダッシュボード（TODO、イベント、最近のプリント）
2. **スキャン画面** - ファイル選択／カメラ撮影の取り込み方法
3. **解析結果画面** - AIが抽出したイベント・TODO・持ち物
4. **履歴画面** - 処理済みプリント一覧（検索・フィルタ）
5. **設定画面** - LINE通知・リマインダー設定

※ v1.0では Google連携（Drive/カレンダー/タスク）UIを非搭載にしたため、旧スクショの「Google連携」画面は差し替えること。

### iPhone 6.1インチ（iPhone 15 Pro / 16 Pro）- 必須
同上5枚

---

## アプリ内課金（IAP）情報

※料金体系が確定次第記載

---

## プライバシー関連

### App Tracking Transparency
トラッキングなし（ATT対応不要）

### データ収集の開示（App Privacy）

| データタイプ | 収集 | 用途 | ユーザーに紐付け |
|-------------|------|------|----------------|
| 写真またはビデオ | ○ | App Functionality | いいえ |
| ファイルとドキュメント | ○ | App Functionality | いいえ |
| ユーザーコンテンツ | ○ | App Functionality | いいえ |

※ すべてのデータはユーザーのデバイス上で処理され、開発者のサーバーには送信されません。AI解析時のみ、選択したAIプロバイダー（Anthropic/Google/OpenAI）のAPIにデータが送信されます。

---

## リジェクト対応履歴

### 2026-06-30 / v1.0 (build 35) — Submission 44b1f233-...

#### Guideline 4 - Design（スクロール不可）
- **指摘:** iPad Air でスキャンタブを最後までスクロールできない。
- **原因:** `app/(tabs)/scan.tsx` のルート要素が固定 `View`（flex:1）で、コンテンツが画面高を超えると下部の項目に到達不可。
- **対応:** ルート要素を `ScrollView` に変更（`contentContainerStyle` で padding 付与、`paddingBottom` 確保）。次ビルドで修正。

#### Guideline 4.8 - Login Services（Sign in with Apple 不在）
- **指摘:** 第三者ログイン（Google）を使っているのに Sign in with Apple 等の同等手段がない。
- **対応方針:** **App Review に返信して反論**（コード変更なし）。本アプリにはアカウント／ログイン機能が存在せず、Google 連携は Drive・カレンダー・タスクへアクセスするためだけのオプション機能のため、4.8（プライマリアカウントの設定・認証）に該当しない。

##### App Review への返信文（英語・コピペ用）

> Hello, and thank you for the review.
>
> Regarding Guideline 4.8 — we would like to clarify that our app does **not** use any third-party or social login service to set up or authenticate a user's primary account. In fact, the app has **no account system and no login at all**: it can be used fully without signing in to anything (as also noted in our App Review notes / demo instructions).
>
> The "Google connection" found under the Settings tab is an **optional feature integration**, not a login. It is used solely to let users who opt in access their own Google services — Google Drive (`drive.file`), Google Calendar (`calendar`), and Google Tasks (`tasks`) — so that scanned documents and extracted events/to-dos can be saved to those services. It does not create or authenticate an account within our app, and the app's core functionality (importing PDFs/photos and AI analysis) works without it.
>
> Because there is no primary account being created or authenticated via a third-party login, we believe Guideline 4.8 does not apply here. Sign in with Apple would also not provide access to Google Drive/Calendar/Tasks, so it cannot serve as an equivalent option for this integration.
>
> Please let us know if any further clarification would help. Thank you.

> **結果:** 上記4.8の反論は却下（build 44 で再指摘）。方針転換し、v1.0ではGoogle連携を撤去する（下記参照）。

---

### 2026-07-02 / v1.0 (build 44) — Submission 44b1f233-... で再リジェクト（3件）

#### Guideline 4 - Design（スクロール）→ ✅ 解消済み（今回の指摘なし）

#### Guideline 4.8 - Login Services（第三者ログイン）→ 🔧 Google連携を撤去
- **指摘:** Google サインイン（第三者ログイン）に対する SIWA 等の同等手段がない。反論は2回とも却下。
- **判断:** ログインの使いやすさに関わらず、Google サインインがある限り 4.8 は回避不可。かつ Drive/カレンダー/タスクは Google の機微スコープで正式配布には Google 審査（数週間）が必要。→ **v1.0 では Google 連携UIを全撤去**（第三者ログインが無くなり 4.8 非該当に）。
- **対応:** 設定画面のGoogle連携、スキャン画面のDrive同期・Driveアップロード、解析結果のカレンダー/タスク一括登録・Driveリンクを削除。Google関連サービスコードとフル実装は `feature/google-integration` ブランチに保全（将来 SIWA＋Google審査を伴って正式復活）。
- **代替:** 期限付きTODO・持ち物のLINE事前リマインダーは、スキャン解析時に自動登録する形で維持。

#### Guideline 5.1.1(iv) - Privacy（カメラ許可の事前プロンプト）→ 🔧 修正
- **指摘:** 許可リクエスト前のカスタム画面に「カメラを許可する」ボタン（"許可"はNG）と「戻る」離脱ボタンがある。
- **対応:** `app/camera-scan.tsx` を、起動時に直接OSの許可ダイアログを出す方式へ変更。事前プロンプト（"許可"文言ボタン・離脱ボタン）を撤廃。恒久拒否時のみ「設定を開く」導線を表示。

#### Guideline 2.1(a) - App Completeness（Google連携でエラー）→ 🔧 Google撤去で解消
- **指摘:** iPadでGoogleアカウント連携時にエラー表示。
- **原因（推定）:** OAuth同意画面のテスト公開状態／機微スコープ未検証により、審査員のGoogleアカウントがブロックされた可能性。
- **対応:** 4.8対応でGoogle連携UIごと撤去したため、この導線自体が消滅し解消。
