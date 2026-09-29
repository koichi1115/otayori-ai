// expo-router の +native-intent から呼ぶ、外部から来た URL の振り分け（純粋関数）。
// 1) 共有拡張が開く  otayori-ai://dataUrl=<key>ShareKey?nonce=..#file
// 2) 「このアプリで開く」の file:///.../xxx.pdf
// どちらも「見つからない画面」ではなく共有取込画面へ送る。

export const SHARE_IMPORT_ROUTE = '/share-import';

const SHARE_EXTENSION_URL = /dataUrl=[^?#&]*ShareKey/;
const FILE_URL = /^file:\/\//i;

export function resolveSystemPath(path: string): string {
  try {
    if (typeof path !== 'string') return '/';
    if (SHARE_EXTENSION_URL.test(path)) return SHARE_IMPORT_ROUTE;
    if (FILE_URL.test(path)) return `${SHARE_IMPORT_ROUTE}?fileUri=${encodeURIComponent(path)}`;
    return path;
  } catch {
    return '/';
  }
}
