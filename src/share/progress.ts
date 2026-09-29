// 「読み込み中」画面の文言と進み具合。
import type { ShareProgress } from './types';

export const SHARE_STEPS = [
  'ファイルを受け取っています',
  '内容を確認しています',
  'AIが解析しています',
  '結果を保存しています',
] as const;

export interface ProgressView {
  title: string;
  detail: string;
  /** 0〜1 */
  ratio: number;
}

export function describeProgress(progress: ShareProgress): ProgressView {
  const { step, total, pageCount } = progress;
  const label = step <= 0 ? '準備しています' : SHARE_STEPS[Math.min(step, SHARE_STEPS.length) - 1];
  const pages = pageCount !== null && pageCount > 1 ? `全${pageCount}ページ・` : '';
  return {
    title: '読み込み中...',
    detail: `${pages}${label}（${step}/${total}）`,
    ratio: total > 0 ? Math.min(step / total, 1) : 0,
  };
}
