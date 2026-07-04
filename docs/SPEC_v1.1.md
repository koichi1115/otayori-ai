# ぷりかん！ v1.1 / v1.2 設計：ローカル / Apple / Google 3モード

最終更新: 2026-07-04

## 目的
- 「**ログイン不要で即使える**」という v1.0 の良さを維持（オンボーディングは C 案＝スキップ可）
- Apple ユーザーに**ネイティブ体験**（iOS カレンダー/リマインダー ＋ iCloud）
- **Guideline 4.8 対応**（Google Sign-In を出す v1.2 時点で Sign in with Apple が既に併設済み）

---

## アカウントモード（Account Mode）
アプリ状態として `accountMode: 'local' | 'apple' | 'google'` を保持（settings に保存、デフォルト `local`）。

| モード | ログイン | スケジュール | タスク/持ち物 | プリント保存 |
|---|---|---|---|---|
| **local** | なし | iOS カレンダー（EventKit） | iOS リマインダー（EventKit） | 端末ローカル |
| **apple** | Sign in with Apple | iOS カレンダー（EventKit） | iOS リマインダー（EventKit） | **iCloud** |
| **google** | Google OAuth | Google カレンダー | Google タスク | Google Drive |

> local と apple の違いは**保存先だけ**（端末 / iCloud）。スケジュール・タスクはどちらも iOS ネイティブ。
> Sign in with Apple が「iCloud 保存・同期」という**実機能の入口**になるため、SIWA が形骸化しない。

---

## オンボーディング（初回のみ・C 案・スキップ可）
3 択を対等に並べる：

1. **今すぐ始める（ローカル）** → `local`・ログインなし・即ホームへ
2. **Apple でサインイン** → Sign in with Apple → `apple`（iCloud 保存が有効）
3. **Google でサインイン** → Google OAuth → `google` … **※ v1.2 で追加**

---

## 段階リリース（確定）
| バージョン | 追加内容 | モード | ログイン | 4.8 | Google 検証 |
|---|---|---|---|---|---|
| **v1.0**（審査中） | AI 解析 ＋ LINE 通知/リマインダー | — | なし | 非該当 | 不要 |
| **v1.1** | ＋ iOS ネイティブ（EventKit）＋ Sign in with Apple ＋ **共有シート取込** | local / apple | SIWA（任意） | **非該当**（Google 無し） | **不要** |
| **v1.2** | ＋ Google モード（Calendar/Tasks/Drive） | ＋ google | ＋ Google | **対応**（SIWA 既存） | 必要（通過後） |

> **iCloud 保存は (b) 方式で確定**：v1.1 の apple モードは当面**ローカル保存**とし、
> iCloud 同期は v1.1.x 以降で追加する。apple モードの当面の意味は
> 「SIWA サインイン＋（将来の）iCloud への入口」。オンボーディングの文言も
> 「iCloud 同期（近日対応）」等、誇大にならない表現にする。

> v1.1 は Google を含まないので **4.8 も Google 検証も不要**。SIWA は Apple 自身のサービスなので単独で出しても問題なし。
> v1.2 で Google Sign-In を足す時点では SIWA が既にあるため、4.8 は自動的に満たされる。

---

## 設定画面（既存を拡張）
- 現在のモード表示 ＋ **モード切替**
  - `local ⇄ apple`：Sign in with Apple のサインイン/アウト（iCloud 保存の ON/OFF）
  - `→ google`（v1.2）：Google OAuth
- リマインダー日数設定（既存・LINE と共通）
- LINE 通知設定（既存・全モード共通）

---

## 解析結果画面の「登録」ボタン（モードで出し分け）
| 対象 | local / apple | google（v1.2） |
|---|---|---|
| イベント | EventKit `createEventAsync` → iOS カレンダー | Google Calendar API |
| TODO / 持ち物 | EventKit `createReminderAsync` → iOS リマインダー | Google Tasks API |

- ボタンのラベル/アイコンもモードで変更
- LINE 通知・事前リマインダーは**全モード共通**で従来通り

---

## モード切替時のデータ扱い（確定）
- **移行はしない**。切替後に**新規登録した項目から**新モードの登録先/保存先を適用。
- 既に iOS カレンダー等に登録済みの予定はそのまま（重複登録しない）。

---

## 権限（Permissions）
- **local / apple**：
  - iOS 17+ **書き込み専用カレンダーアクセス** `NSCalendarsWriteOnlyAccessUsageDescription`（追加専用＝最小権限）
  - リマインダー `NSRemindersFullAccessUsageDescription`
  - カメラ（既存）
- **apple 追加**：iCloud 対応（下記「要調査」）
- **google**（v1.2）：Google OAuth（機微スコープ検証の通過が前提）

---

## 実装スタック
- `expo-apple-authentication`（Sign in with Apple）
- `expo-calendar`（EventKit：events ＋ reminders、iOS）
- iCloud 保存 → **要調査**（下記）
- Google 実装は `feature/google-integration` から取り込み（v1.2）

---

## 共有シート取込（Share / Open-in 対応）— v1.1 新機能

**課題**：現状、ファイルアプリ・Safari・メール・LINE 等で PDF/画像をプレビューして
「共有」を押しても、共有シートにぷりかん！が表示されず、取り込みは
アプリ内の DocumentPicker からしかできない。

**ゴール**：他アプリで受け取ったプリント（PDF・画像）を、共有シートから
**「ぷりかん！」を選ぶだけで取込 → AI 解析フローへ直行**できる。

### 挙動
1. 他アプリで PDF/画像を共有 → 共有シートにぷりかん！が表示される
2. 選択するとぷりかん！が開き、受け取ったファイルで**即座に解析開始**
   （スキャン画面のファイル選択後と同じフロー・同じローディング UI）
3. 解析完了 → 解析結果画面へ（通常フローと合流）
4. 複数ファイル共有時は 1 件ずつ順次処理（v1.1 は先頭 1 件のみでも可、要検討）

### 実装方式（実装時に Expo v56 ドキュメントで確定）
- **案 A: ドキュメントタイプ宣言**（`CFBundleDocumentTypes` ＋ `LSSupportsOpeningDocumentsInPlace`
  を `app.json` の `ios.infoPlist` に追加）→「Open in / このアプリで開く」経由。
  ネイティブ拡張なしで済む可能性があり最も軽い。ファイルは Linking の file:// URL で受領。
- **案 B: Share Extension**（`expo-share-intent` 等の config plugin）→ 共有シートの
  アプリ行に確実に出る。ネイティブターゲット追加（EAS Build 必須・Expo Go 不可）。
- まず案 A で実現できる表示範囲を確認し、共有シートに出ないケースが多ければ案 B。

### 対応フォーマット
- PDF（`com.adobe.pdf`）/ 画像（`public.image`: JPG, PNG, HEIC）— 既存 getMimeType と一致させる

---

## UI/UX 品質要件（機能と同格の要件として扱う）

### オンボーディング
- 3 択は**縦並びカード**で対等に。ただし「今すぐ始める」を最上段＋最も視覚的に軽く（＝摩擦ゼロを演出）
- Sign in with Apple ボタンは **Apple 公式デザイン（`AppleAuthenticationButton`）** をそのまま使用（HIG 準拠・審査対策にもなる）
- マスコット（カワウソ）をオンボーディングに登場させ、ブランドの一貫性を出す
- スキップ後もいつでも設定から選び直せることを一文で明示（不安の除去）

### 登録ボタン（解析結果画面）
- モードで**ラベルとアイコンが変わる**だけでなく、登録先が一目で分かる（例: カレンダーアイコン＋「iOS カレンダーへ」）
- 登録成功時は **haptic feedback（`expo-haptics` notificationAsync success）＋軽いチェックアニメーション**。Alert の連打はしない
- 登録済みの項目は**ボタンを「登録済み ✓」表示に変え、二重登録を防ぐ**（v1.0 からの改善点）
- 一括登録（イベント全部/TODO 全部）と個別登録の両方を提供

### 権限プロンプト（5.1.1 の教訓を活かす）
- カレンダー/リマインダー権限は**初回の登録ボタンタップ時**に OS ダイアログを直接出す（事前カスタム画面は置かない）
- 恒久拒否時のみ「設定を開く」導線を表示

### モード切替（設定画面）
- 現在のモードを**カード型のステータス表示**で常に可視化（v1.0 の LINE 連携済み表示と同じトーン）
- 切替時に「何が変わるか」を 1 画面で説明（登録先・保存先の変化を表で見せる）
- 破壊的な変化ではないこと（既存データはそのまま）を明示

### 全体
- ローディング・エラー状態は v1.0 の意匠（loadingCard 等）を踏襲し一貫性を保つ
- VoiceOver：すべての新規ボタンに accessibilityLabel / Role を付与（v1.0 の慣習を継続）
- ダークモード非対応のまま（v1.0 踏襲、`userInterfaceStyle: light`）だが、色は theme.ts のトークンのみ使用

---

## ⚠️ 要調査・要検討（実装前に確認）
1. ~~iCloud 保存の実現方法~~ → **(b) で確定**。v1.1 の apple モードは当面ローカル保存、
   iCloud 同期（CloudKit / ubiquity container）は v1.1.x で別途調査・実装。
2. 共有シート取込：案 A（ドキュメントタイプ宣言）で共有シートに出るかを実機確認 → 不足なら案 B（Share Extension）。
3. 共有取込の複数ファイル対応（v1.1 は先頭 1 件のみか、順次処理か）。
4. google モードの calendar スコープを `calendar.events` に狭めるか（最小スコープ審査対策・v1.2）。
5. Sign in with Apple で取得した名前/メールの用途（現状アプリはアカウント不要なので保持のみ）。
