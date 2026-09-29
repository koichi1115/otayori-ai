import { resolveSystemPath } from '../src/share/native-intent-path';

// 共有拡張・「このアプリで開く」から来た URL を、共有取込画面へ振り替える。
// 起動時（initial: true）と起動中（initial: false）の両方で呼ばれる。
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return resolveSystemPath(path);
}
