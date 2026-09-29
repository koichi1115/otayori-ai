// 受け取ったファイルが取り込める種類・サイズかを、名前と MIME とサイズだけで判定する（純粋関数）。
import type { FailureReason, SharedPayload } from './types';

/** Claude API のリクエスト上限（base64 化で 4/3 倍）に余裕を持たせた上限 */
export const MAX_SHARED_FILE_BYTES = 20 * 1024 * 1024;

const IMAGE_MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
};

export type Classification =
  | { ok: true; kind: 'pdf' | 'image'; mimeType: string }
  | { ok: false; reason: Extract<FailureReason, 'not_supported' | 'empty' | 'too_large'> };

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot < 0 ? '' : fileName.slice(dot + 1).toLowerCase();
}

function detectKind(fileName: string, mimeType: string | null): { kind: 'pdf' | 'image'; mimeType: string } | null {
  const mime = (mimeType ?? '').toLowerCase();
  const ext = extensionOf(fileName);
  if (mime === 'application/pdf' || ext === 'pdf') return { kind: 'pdf', mimeType: 'application/pdf' };
  if (mime.startsWith('image/')) return { kind: 'image', mimeType: mime };
  const imageMime = IMAGE_MIME_BY_EXT[ext];
  return imageMime ? { kind: 'image', mimeType: imageMime } : null;
}

export function classifySharedFile(file: Pick<SharedPayload, 'fileName' | 'mimeType' | 'size'>): Classification {
  const detected = detectKind(file.fileName, file.mimeType);
  if (!detected) return { ok: false, reason: 'not_supported' };
  if (file.size === 0) return { ok: false, reason: 'empty' };
  if (file.size !== null && file.size > MAX_SHARED_FILE_BYTES) return { ok: false, reason: 'too_large' };
  return { ok: true, ...detected };
}
