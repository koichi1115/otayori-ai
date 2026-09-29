# TestFlight 手順書（release/purikan-testflight）

対象ブランチ: `release/purikan-testflight`（PR #2 モデル更新 + PR #3 見た目調整 + PR #4 PDF共有取込 を統合したもの）。
この手順は **Mac + Apple Developer アカウントが必要**。リポジトリ側では TestFlight への提出は行っていない。
事実を確認できなかった項目は「要確認」と書いてある。推測で埋めていない。

## 0. 現在の version / build（リポジトリ上の事実）

| 項目 | 値 | 出典 |
|---|---|---|
| アプリ名 | ぷりかん！ | `app.json` |
| Bundle ID（本体） | `com.otayori.ai` | `app.json` `ios.bundleIdentifier` |
| Bundle ID（Share Extension） | `com.otayori.ai.share-extension` | `expo-share-intent` が prebuild で生成（検証済み: 下記 §2） |
| App Group | `group.com.otayori.ai` | prebuild 検証で本体・拡張の両 entitlements に入ることを確認 |
| version（MARKETING_VERSION） | **1.1.0** | `app.json` `expo.version`（コミット 8f67340 で 1.1.0 に同期） |
| buildNumber | **47** | `app.json` `ios.buildNumber`（コミット 8f67340「Mac側ビルド実態に合わせる」で 44→47） |
| **次に付ける build 番号** | **48**（version は 1.1.0 のまま） | 下記の「要確認」を満たすこと |
| iOS 最低バージョン | 16.4 | prebuild 結果の `IPHONEOS_DEPLOYMENT_TARGET` |

- 公開実績: v1.0 build 45 が App Store 審査を通過し公開済み（`docs/APP_STORE.md`、2026-07-05）。App Store ID 6782348124。
- build 46 / 47 が App Store Connect にアップロード済みか、TestFlight に載っているか、審査に出したかは **リポジトリに記録がない → 要確認**。
  - 手順: App Store Connect > アプリ > TestFlight > iOS ビルド で **最大の build 番号** を見る。それ以下の番号は再利用できない。
  - 最大が 47 なら 48 を使う。48 以上が既にあれば、その次の番号にする。
- コミット 99860ae（2026-09-20）は「App Store 審査で 5.1.1 違反として指摘された」マイク用途説明の削除。指摘された提出物の build 番号・再提出の有無は **要確認**（リポジトリに記録なし）。
- `app.json` の buildNumber は本 PR では **変更していない**（`__tests__/app-config-share.test.ts` が 47 を固定しており、ASC 側の最新番号を確認する前に決め打ちしないため）。
  Mac で §3 の手順により 48（または確認した次の番号）に上げる。上げたら `__tests__/app-config-share.test.ts` の期待値も合わせる（別コミットで良い）。
- 注意: リポジトリにコミット済みの `ios/` は古い prebuild 結果（version 0.1.0 / build 1、Share Extension なし）。`app.json` の値は `prebuild` で `ios/` に反映される。

## 1. Mac でブランチを取得

```bash
git fetch origin
git switch release/purikan-testflight
npm ci            # .npmrc の legacy-peer-deps=true が効く。npm を使う（package-lock.json）
npm test && npx tsc --noEmit   # 任意。Linux 側では通過済み（PR 本文参照）
```

## 2. ネイティブ設定を再生成（必須）

PDF 共有の Share Extension・App Group・Info.plist（`CFBundleDocumentTypes` など）を `app.json` から作り直す。JS だけの更新では反映されない。

```bash
npx expo prebuild --platform ios --clean
```

- `--clean` はコミット済みの `ios/` を消して作り直す。生成物（`ios/`）の差分は **このブランチにコミットしない**（ローカルで作業する。コミットしたい場合は別ブランチで）。
- ログに `[expo-share-intent] No DEVELOPMENT_TEAM found ...` と出るのは想定どおり（§4 で Team を設定する）。
- Linux で同じコマンドを `--no-install` 付きで試した結果（`/workspace/handoffs/purikan-release/prebuild-check.log`）:
  - 生成されたターゲットは本体（`app`）と `ShareExtension`。Xcode プロジェクト名・スキーム名は `app`。`.xcworkspace` は CocoaPods（`pod install`）後に作られるため Linux では未作成。**Mac で `ios/*.xcworkspace` の名前を要確認**（旧 `ios/AI.xcworkspace` ではなく `ios/app.xcworkspace` になる見込み）。
  - 本体・拡張の `*.entitlements` に `group.com.otayori.ai` が入る。本体には Sign in with Apple も入る。
  - 拡張の Info.plist に PDF/画像/file-url 用の `NSExtensionActivationRule` が入る。
  - 本体の Info.plist に `NSMicrophoneUsageDescription` が **無い**（5.1.1 対応の維持。§8 参照）。
  - version 1.1.0 / build 47 が本体と拡張の両方に入る（`app.json` 由来。build 番号を上げるのは §3）。
- `pod install` が prebuild 中に走らない場合は `cd ios && pod install`（Mac に CocoaPods が必要）。

## 3. build 番号を上げる

一番簡単なのは prebuild の前に `app.json` を編集すること。

```jsonc
// app.json
"version": "1.1.0",
"ios": { "buildNumber": "48" }   // ASC の最大 build + 1（§0 の要確認を先に済ませる）
```

- この場合は §2 の prebuild をやり直す（本体・拡張の両方に反映される）。
- prebuild 後に Xcode で直接変える場合は、**本体ターゲットと ShareExtension ターゲットの両方**の Build（CURRENT_PROJECT_VERSION）と Version（MARKETING_VERSION）を同じ値にする。拡張だけ古い値のままだと、アップロード時の検証で警告・エラーになることがある（要確認）。

## 4. Xcode で署名を設定

`open ios/*.xcworkspace`（`.xcodeproj` ではなく workspace を開く）。

1. Targets > **本体**（`app`）> Signing & Capabilities
   - Team を選ぶ（Automatic signing でよい）。Bundle Identifier が `com.otayori.ai` であること。
   - Capabilities に **App Groups**（`group.com.otayori.ai`）と **Sign in with Apple** があること。
2. Targets > **ShareExtension** > Signing & Capabilities
   - **Team を設定**（prebuild で空になっている）。Bundle Identifier が `com.otayori.ai.share-extension` であること。
   - Capabilities に **App Groups**（`group.com.otayori.ai`）があること。
3. Apple Developer サイト > Identifiers で、`com.otayori.ai` と `com.otayori.ai.share-extension` の両 App ID に App Group `group.com.otayori.ai` が紐付いていること。Automatic signing なら Xcode が作成・更新するが、失敗したら手動で追加。**新しい App ID（拡張用）が登録済みか、Provisioning Profile が更新されたかは要確認。**
4. Build 番号・Version が §3 の値であること（本体・拡張とも）。

## 5. `CLAUDE_API_KEY` を含むビルド環境

- キーの値はこのリポジトリ・PR・ドキュメントに書かない。
- `app.config.js` が `process.env.CLAUDE_API_KEY` を `extra.claudeApiKey` に入れる。空だとアプリは「APIキーが設定されていません」と出して解析できない（TestFlight ビルドで解析が通らない最も多い原因になる）。
- Xcode のビルド（Archive）時に環境変数を渡す方法（`expo-constants` のビルドスクリプトは `ios/.xcode.env` に続けて **`ios/.xcode.env.local`** を読み込む。`.xcode.env.local` は `.gitignore` 済み）:

  ```bash
  # Mac のローカルだけに作る（コミットしない）。<...> は実際の値に置き換える
  echo 'export CLAUDE_API_KEY=<Anthropic の API キー>' > ios/.xcode.env.local
  ```

  ※ `npx expo prebuild --clean` は `ios/` ごと消すため、prebuild のたびに作り直す。
- 過去ビルド（build 47 など）でキーをどう渡したかはリポジトリに記録がない → **要確認**（上と違う方法なら、その方法を使ってよい）。
- Archive 後、アプリに API キーが埋め込まれる仕様（既存）。キーの取り扱い・上限設定は別途注意（本 PR では仕様を変えていない）。

## 6. アーカイブと App Store Connect へのアップロード

### 方法 A: Xcode（推奨。リポジトリに `eas.json` が無いため）

1. 実機（または Any iOS Device (arm64)）を選び、Scheme は `app`。
2. Product > **Archive**。
3. Organizer > Distribute App > **App Store Connect** > Upload > 署名は Automatic > Upload。
4. 「エクスポートコンプライアンス」のダイアログが出た場合は §7。

### 方法 B: EAS Build / Submit（**現状は未設定**）

- `eas.json` は **リポジトリに無い**。`app.json` に `extra.eas.projectId` と `owner: "saiko1115"` はあるが、build profile が無いので、そのまま `eas build` は動かない。
- 使う場合の目安（未検証・要確認）:
  ```bash
  npx eas-cli build:configure
  npx eas-cli secret:create --scope project --name CLAUDE_API_KEY   # 値は対話入力。ファイルに書かない
  npx eas-cli build --platform ios --profile production
  npx eas-cli submit --platform ios --latest
  ```
  Share Extension を含むアプリは EAS でも拡張用の App ID / Provisioning Profile の管理が必要で、初回は Apple ログインが対話的に必要になる。今回は方法 A を推奨。

## 7. App Store Connect（TestFlight）

1. App Store Connect > アプリ > TestFlight で、アップロードしたビルドが「処理中」→ 完了になるのを待つ（数分〜数十分。メールが届く）。
2. 「輸出コンプライアンス情報が不足」と出た場合: `app.json` に `ITSAppUsesNonExemptEncryption: false` が入っているので通常は出ない。出たら「標準的な暗号化のみ（免除）」の回答を、以前の提出と同じにする（**過去の回答は要確認**）。
3. **内部テスター**（App Store Connect のユーザー）を追加して、そのビルドを有効にする。内部テストは審査不要。外部テスターは Beta App Review が必要（今回は不要）。
4. テスターの iPhone で TestFlight アプリからインストール。**古いバージョンが入っている場合は一度アプリを削除してから入れ直す**と共有シートの並びが更新されやすい。

## 8. App Store 審査履歴との関係

- 5.1.1（マイク用途説明のプレースホルダ）: 2026-09-20 のコミット 99860ae で `NSMicrophoneUsageDescription` を削除し、`app.json` の `expo-camera` に `microphonePermission: false` を追加済み（main に入っている）。**今回の統合でこの設定に触れていない**（PR #2/#3/#4 は `app.json` のこの部分を変更していない）。prebuild 結果の Info.plist（本体・拡張）にマイク用途キーが無いことを確認済み。Mac で prebuild 後にも `grep -ri microphone ios/app/Info.plist ios/ShareExtension` が空であることを確認するとよい。
- 今回新しく増える権限・申告まわり（審査で見られうる点）:
  - Share Extension の追加（新しい App ID `com.otayori.ai.share-extension`）と App Group。
  - `CFBundleDocumentTypes`（PDF・画像を「このアプリで開く」）。Apple の用途説明文（Usage Description）が必要な権限は増えていない。
  - 拡張の `PrivacyInfo.xcprivacy`（UserDefaults / CA92.1）は `expo-share-intent` が生成。App Privacy の回答（データ収集の開示）は変更なしの想定だが **要確認**。
  - 共有シートに表示される拡張名は「ぷりかん！ - Share Extension」（生成値）。表記を変えたいか **要確認**。
- App Store 審査に出す場合は、App Review Notes の手順（`docs/APP_STORE.md`）に「PDF 共有」の手順追記が必要か **要確認**。

## 9. 提出前の実機チェックリスト

**最初に必ず確認（未実施のため）: Sonnet 5.5 で実際に解析が通るか**

Sonnet 5.5 の実 API 比較（`npm run compare:models`）は API キーが無く **未実施**。リクエストは `output_config.format`（json_schema）と `output_config.effort=medium` を組み合わせて送る（`docs/LLM_MODELS.md`）。この組み合わせが本番 API で通るか、公式ドキュメントに沿って組んだだけで **実機・実 API では未確認**。

- [ ] 設定 >「AI解析モデル」で **Claude Sonnet 5.5（標準）** が選ばれている。
- [ ] スキャン >「ファイルから選択」でテスト PDF（`fixtures/prints/01-hoikuen-10gatsu.pdf` など）を解析 → 解析結果（イベント・TODO・持ち物）が出る。
- [ ] 写真（`fixtures/prints/03-narai-photo.jpg`）でも解析が通る。
- [ ] エラー（400 系のメッセージ、「Claude API error (400)」など）が出る場合は、**設定 >「AI解析モデル」で Haiku 4.5 に切り替えて再試行**（Haiku 4.5 は effort を送らない）。Haiku で通れば `output_config` の組み合わせが原因。Haiku 4.5 は 2026-10-15 以降に退役する可能性があり、設定画面に警告が出る。→ その場合は提出を止めて `src/services/llm-request.ts` を直す。
- [ ] 解析時間・コスト（Sonnet 5.5 は Haiku より単価・トークンが増える見込み）が許容範囲か体感で確認。

**PDF 共有取込（PR #4）** — 詳細は `docs/SHARE_INTAKE.md`

- [ ] Safari で開いた PDF → 共有 → ぷりかん！ → 「読み込み中」→ 解析結果
- [ ] ファイルアプリの PDF → 共有 → ぷりかん！
- [ ] 連絡帳系アプリ（保育園・学校の連絡アプリ）の PDF → 共有（出なければ「このアプリで開く」）
- [ ] コールド起動（アプリを完全終了してから共有）と、起動中（開いたまま別アプリから共有）の両方
- [ ] 3 ページ以上の PDF で「全Nページ」「n/4」と進捗バーが動く
- [ ] 失敗メッセージ: テキスト/リンクのみ、.txt/.docx、パスワード付き PDF、機内モード、20MB 超。「写真で撮って読み込む」と「ホームへ戻る」が動く
- [ ] Safari が PDF を「PDF + URL」の 2 アイテムで渡す場合に拡張が PDF を処理できるか（`SHARE_INTAKE.md` の未確認点）
- [ ] 初回起動（オンボーディング前）で共有しても共有取込が優先される

**見た目（PR #3）**

- [ ] タップ領域: ホーム・履歴・解析結果（ゴミ箱・チェック・「すべて登録」）・子供/施設（編集/削除）・設定（チップ・LINE ボタン）で押し間違えない（最小 48pt）
- [ ] Dynamic Type（設定 > アクセシビリティ > 画面表示とテキストサイズ）を大きくしてもカード・設定のモデル選択・共有取込画面の文字が切れない
- [ ] 白文字が読める青ヘッダー・青ボタン、カメラ画面のガイド枠/シャッターリング（旧より細い）
- [ ] 共有取込画面と設定のモデル選択が、他の画面と同じ見た目（統合時に theme 参照へ揃えた）

**モデル切替（PR #2）**

- [ ] 設定 >「AI解析モデル」に 3 択（Sonnet 5.5 / Opus 5.5 / Haiku 4.5）が出て、選択が保存される（アプリ再起動後も維持）
- [ ] Haiku 4.5 選択時に退役予定の警告が出る

**そのほか**

- [ ] 既存機能の回帰: Sign in with Apple、LINE 連携、カメラスキャン、カレンダー/リマインダー登録
- [ ] カメラ許可・カレンダー許可の文言が日本語で、マイク許可のダイアログが出ない
