# 共有取込（他アプリ → ぷりかん！）の仕組みと Mac 確認手順

## 流れ
1. **受け取り**（ネイティブ）
   - 共有シート: `expo-share-intent` の Share Extension が、ファイルを App Group（`group.com.otayori.ai`）へコピーし、`otayori-ai://dataUrl=otayori-aiShareKey?...#file` でアプリを開く。
   - 「このアプリで開く」: `CFBundleDocumentTypes`（PDF・画像）。iOS がアプリ領域の `Documents/Inbox/` にコピーし `file://` で開く。
2. **振り分け**: `app/+native-intent.ts` → `src/share/native-intent-path.ts` が、どちらも `/share-import` へ送る（起動時・起動中の両方で呼ばれる）。
3. **取込画面** `app/share-import.tsx`（表示だけ）→ 状態機械 `src/share/use-share-import-flow.ts`
4. **取込処理** `src/share/run-share-import.ts`: 種類・サイズ判定 → アプリ領域（`Documents/shared-inbox/`）へコピー → 実サイズ・PDFヘッダー・暗号化の検査 → 解析（`analyzePDF`）→ 保存（`src/services/document-import.ts`）
5. **遷移** `src/share/share-navigation.ts`: 成功 → 解析結果。失敗 → 理由＋「写真で撮って読み込む」ボタン。

## ネイティブ設定を変えたので Mac で再ビルドが必須
`app.json` の `ios.infoPlist`（`CFBundleDocumentTypes` / `LSSupportsOpeningDocumentsInPlace`）と、`expo-share-intent` の `iosActivationRules` を変更している。
JS だけの更新（OTA）では反映されない。

```bash
git fetch && git checkout fix/pdf-share-intake
npm ci
npx expo prebuild --clean        # ios/ を作り直す（Share Extension・App Group・Info.plist を再生成）
open ios/AI.xcworkspace          # Xcode: 下記の署名を確認 → 実機へ Run（または EAS Build）
```
- Xcode で **ShareExtension ターゲット**の Signing の Team を設定（prebuild ログに `No DEVELOPMENT_TEAM found` が出る）。
- アプリ本体と ShareExtension の両方に **App Groups: `group.com.otayori.ai`** が付いていることを確認（Apple Developer の App ID にも必要）。
- 古いビルドが入っている実機は、一度アプリを削除してから入れ直すと共有シートの並びが更新されやすい。
- コミット済みの `ios/` は古い prebuild 結果（Share Extension なし・entitlements 空）。`--clean` で置き換わる。

## 実機での確認手順（iOS）
共通: 解析には API キー入りのビルドが必要（`CLAUDE_API_KEY`）。オフライン確認用に機内モードも使う。

| # | 操作 | 期待する結果 |
|---|------|--------------|
| 1 | **Safari** で PDF を開く → 共有 → ぷりかん！ | すぐ「読み込み中...」→ 手順の進み具合 → 解析結果 |
| 2 | **ファイル**アプリの PDF → 共有 → ぷりかん！ | 同上 |
| 3 | 連絡帳系アプリで PDF → 共有 → ぷりかん！（出なければ「このアプリで開く」→ ぷりかん！） | 同上 |
| 4 | 3 ページ以上の PDF | 「全Nページ」と「n/4」、進み具合バー |
| 5 | **コールド起動**（ぷりかん！をスワイプで完全終了してから共有） | アプリが開いた瞬間から「読み込み中」。ホーム画面で止まらない |
| 6 | **起動中**（ぷりかん！を開いたまま別アプリへ → 共有） | 同上。終わったら解析結果、戻るとホーム |
| 7 | テキスト・リンクだけ共有（Safari のページ共有） | 「リンクやテキストは読み込めません…写真で撮って読み込めます」＋カメラボタン（そもそもぷりかん！が共有シートに出ないのも期待通り） |
| 8 | .txt / .docx を「このアプリで開く」 | 「PDFと画像以外は読み込めません…」 |
| 9 | パスワード付き PDF | 「パスワード付きのPDFは読み込めません…」 |
| 10 | 機内モード | 「ネットワークに接続できず…」 |
| 11 | 20MB 超の PDF | 「ファイルが大きすぎて…」 |
| 12 | 失敗画面の「写真で撮って読み込む」/「ホームへ戻る」 | それぞれカメラ画面 / ホーム。戻るとホームに戻れる |
| 13 | 初回起動（未オンボーディング）で共有 | 共有取込が優先される（オンボーディングで上書きされない） |

## 実機確認が必要な未確認点
- Safari が PDF を「PDF ＋ URL」の 2 アイテムで渡す場合に、Share Extension が先頭アイテムを PDF として処理できるか（述語は通るように広げたが、拡張本体は先頭アイテムしか見ない）。
- Xcode 署名・App Group の Team 設定。
