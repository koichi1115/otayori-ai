import { shouldGoToOnboarding } from '../../src/share/onboarding-guard';

describe('shouldGoToOnboarding', () => {
  it('未完了で通常起動ならオンボーディングへ', () => {
    expect(shouldGoToOnboarding({ onboardingDone: null, pathname: '/' })).toBe(true);
    expect(shouldGoToOnboarding({ onboardingDone: '0', pathname: '/(tabs)' })).toBe(true);
  });
  it('完了済みなら行かない', () => {
    expect(shouldGoToOnboarding({ onboardingDone: '1', pathname: '/' })).toBe(false);
  });
  it('共有取込中の画面を上書きしない', () => {
    expect(shouldGoToOnboarding({ onboardingDone: null, pathname: '/share-import' })).toBe(false);
  });
});
