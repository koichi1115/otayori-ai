// expo-share-intent の値 / 「このアプリで開く」の URL から、SharedPayload を取り出す（純粋関数）。
import type { SharedPayload } from './types';

export type PayloadResult =
  | { ok: true; payload: SharedPayload }
  | { ok: false; reason: 'not_received' | 'not_a_file' };

function toFileUri(path: string): string {
  return path.startsWith('file://') ? path : `file://${path}`;
}

function lastSegment(path: string): string {
  const segment = path.split('?')[0].split('/').pop() ?? '';
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export function toSharedPayload(intent: any): PayloadResult {
  const file = intent?.files?.[0];
  if (file) {
    const rawPath: string = file.path ?? file.filePath ?? '';
    if (rawPath) {
      return {
        ok: true,
        payload: {
          uri: toFileUri(rawPath),
          fileName: file.fileName || lastSegment(rawPath) || 'shared',
          mimeType: file.mimeType ?? null,
          size: typeof file.size === 'number' ? file.size : null,
        },
      };
    }
  }
  if (intent?.webUrl || intent?.text) return { ok: false, reason: 'not_a_file' };
  return { ok: false, reason: 'not_received' };
}

/** 「このアプリで開く」で渡された file:// URL から */
export function payloadFromFileUri(fileUri: string | undefined): PayloadResult {
  if (!fileUri) return { ok: false, reason: 'not_received' };
  return {
    ok: true,
    payload: { uri: toFileUri(fileUri), fileName: lastSegment(fileUri) || 'shared', mimeType: null, size: null },
  };
}

export interface SourceInputs {
  hasShareIntent: boolean;
  shareIntent: unknown;
  error: string | null;
  /** +native-intent が渡す「このアプリで開く」の file URL */
  fileUri: string | undefined;
}

/** 届いているものの中から取込元を決める。まだ何も無ければ null（待機） */
export function pickSource(input: SourceInputs): PayloadResult | null {
  if (input.hasShareIntent) return toSharedPayload(input.shareIntent);
  if (input.fileUri) return payloadFromFileUri(input.fileUri);
  if (input.error) return { ok: false, reason: 'not_received' };
  return null;
}
