// 共有取込まわりの共通型。ロジック（判定・解析呼び出し）と UI を分けるため、ここには型だけを置く。
import type { AnalysisResult } from '../types';

/** 受け取ったファイル1件（共有拡張 / 「このアプリで開く」のどちらから来ても同じ形にそろえる） */
export interface SharedPayload {
  /** file:// で始まるパス（この時点では一時領域の可能性あり） */
  uri: string;
  fileName: string;
  mimeType: string | null;
  /** バイト数。不明なら null */
  size: number | null;
}

export type FailureReason =
  | 'not_received'  // 共有されたはずのデータが届かなかった
  | 'not_a_file'    // リンク・テキストだけが共有された
  | 'not_supported' // PDF・画像ではない
  | 'empty'         // 0 バイト
  | 'too_large'     // 容量超過
  | 'unreadable'    // コピー/読み取り失敗、または中身が PDF でない
  | 'encrypted'     // パスワード付き PDF
  | 'network'       // 解析サービスへ接続できない
  | 'analysis'      // 解析結果が得られない
  | 'save';         // 保存失敗

export type ImportResult = { ok: true; docId: number } | { ok: false; reason: FailureReason };

/** 進み具合。step は 0（待機中）〜 total */
export interface ShareProgress {
  step: number;
  total: number;
  /** 確認後に分かればページ数 */
  pageCount: number | null;
}

/** アプリ領域へのコピーと読み出し（expo-file-system のアダプタ。テストでは差し替える） */
export interface FileStore {
  copyToAppStorage(sourceUri: string, fileName: string): Promise<{ uri: string; size: number }>;
  readBytes(uri: string): Promise<Uint8Array>;
  remove(uri: string): Promise<void>;
}

export interface SaveInput {
  analysis: AnalysisResult;
  fileName: string;
  uri: string;
}

export interface ImportDeps {
  store: FileStore;
  analyze: (base64: string, mimeType: string) => Promise<AnalysisResult>;
  save: (input: SaveInput) => Promise<number>;
  /** 保存後の通知（LINE・リマインダー）。失敗しても取込は成功扱い */
  notify: (analysis: AnalysisResult) => void;
}
