// 受け取ったファイル1件を「コピー → 確認 → 解析 → 保存」まで進める。
// 依存（ファイル・解析・DB・通知）は引数で受け取るので、画面や実機なしでテストできる。
import { classifySharedFile } from './classify-shared-file';
import { bytesToBase64 } from './base64';
import { inspectPdfBytes } from './pdf-inspect';
import { SHARE_STEPS } from './progress';
import type { FailureReason, ImportDeps, ImportResult, SharedPayload, ShareProgress } from './types';

const TOTAL = SHARE_STEPS.length;

const fail = (reason: FailureReason): ImportResult => ({ ok: false, reason });

async function bestEffort(task: () => Promise<void>): Promise<void> {
  try {
    await task();
  } catch {
    /* 後片付けの失敗は無視 */
  }
}

function isNetworkError(e: unknown): boolean {
  const message = e instanceof Error ? e.message : '';
  return message.includes('ネットワーク') || message.includes('Network request failed');
}

/** コピー後の検査。問題があれば理由を返し、なければページ数（PDF のみ）を返す */
function inspectCopied(kind: 'pdf' | 'image', bytes: Uint8Array): { reason: FailureReason } | { pageCount: number | null } {
  if (kind === 'image') return { pageCount: null };
  const info = inspectPdfBytes(bytes);
  if (!info.isPdf) return { reason: 'unreadable' };
  if (info.encrypted) return { reason: 'encrypted' };
  return { pageCount: info.pageCount };
}

async function importCopied(
  payload: SharedPayload,
  kind: 'pdf' | 'image',
  mimeType: string,
  copy: { uri: string; size: number },
  deps: ImportDeps,
  onProgress: (p: ShareProgress) => void,
): Promise<ImportResult> {
  const recheck = classifySharedFile({ fileName: payload.fileName, mimeType, size: copy.size });
  if (!recheck.ok) return fail(recheck.reason);

  onProgress({ step: 2, total: TOTAL, pageCount: null });
  const bytes = await deps.store.readBytes(copy.uri);
  const inspected = inspectCopied(kind, bytes);
  if ('reason' in inspected) return fail(inspected.reason);

  onProgress({ step: 3, total: TOTAL, pageCount: inspected.pageCount });
  let analysis;
  try {
    analysis = await deps.analyze(bytesToBase64(bytes), mimeType);
  } catch (e) {
    return fail(isNetworkError(e) ? 'network' : 'analysis');
  }

  onProgress({ step: 4, total: TOTAL, pageCount: inspected.pageCount });
  let docId: number;
  try {
    docId = await deps.save({ analysis, fileName: payload.fileName, uri: copy.uri });
  } catch {
    return fail('save');
  }
  try {
    deps.notify(analysis);
  } catch {
    /* 通知の失敗は取込の成否に影響させない */
  }
  return { ok: true, docId };
}

export async function runShareImport(
  payload: SharedPayload,
  deps: ImportDeps,
  onProgress: (p: ShareProgress) => void,
): Promise<ImportResult> {
  const first = classifySharedFile(payload);
  let copiedUri: string | null = null;
  let result: ImportResult;
  try {
    if (!first.ok) {
      result = fail(first.reason);
    } else {
      onProgress({ step: 1, total: TOTAL, pageCount: null });
      const copy = await deps.store.copyToAppStorage(payload.uri, payload.fileName);
      copiedUri = copy.uri;
      result = await importCopied(payload, first.kind, first.mimeType, copy, deps, onProgress);
    }
  } catch {
    result = fail('unreadable');
  }
  // 失敗したときはコピーを残さない。元の一時ファイルは（アプリのコンテナ内なので）常に片付ける。
  if (!result.ok && copiedUri) await bestEffort(() => deps.store.remove(copiedUri!));
  await bestEffort(() => deps.store.remove(payload.uri));
  return result;
}
