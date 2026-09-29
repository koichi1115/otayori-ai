// 初回起動のオンボーディングへ送るかの判定。共有取込の画面を上書きしないためだけの小さな純粋関数。
import { SHARE_IMPORT_ROUTE } from './native-intent-path';

export function shouldGoToOnboarding(input: { onboardingDone: string | null; pathname: string }): boolean {
  if (input.onboardingDone === '1') return false;
  return input.pathname !== SHARE_IMPORT_ROUTE;
}
