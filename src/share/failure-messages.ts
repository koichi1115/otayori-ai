// 失敗時に出す日本語メッセージ。「理由 + 次の一手」を1文で。
import type { FailureReason } from './types';

const MESSAGES: Record<FailureReason, string> = {
  not_received: 'ファイルを受け取れませんでした。もう一度共有するか、写真で撮って読み込めます',
  not_a_file: 'リンクやテキストは読み込めません。PDFや画像として共有するか、写真で撮って読み込めます',
  not_supported: 'PDFと画像以外は読み込めません。プリントを写真で撮って読み込めます',
  empty: 'ファイルが空でした。もう一度共有するか、写真で撮って読み込めます',
  too_large: 'ファイルが大きすぎて読み込めませんでした。ページを減らして小さくするか、写真で撮って読み込めます',
  unreadable: 'このファイルは読めませんでした。写真で撮って読み込めます',
  encrypted: 'パスワード付きのPDFは読み込めません。パスワードを解除するか、写真で撮って読み込めます',
  network: 'ネットワークに接続できず解析できませんでした。接続を確認して、もう一度共有してください',
  analysis: 'プリントの内容を読み取れませんでした。もう一度お試しいただくか、写真で撮って読み込めます',
  save: '解析結果を保存できませんでした。もう一度共有してお試しください',
};

export const FAILURE_REASONS = Object.keys(MESSAGES) as FailureReason[];

export function failureMessage(reason: FailureReason): string {
  return MESSAGES[reason];
}
