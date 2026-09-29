import { useEffect, useRef } from 'react';
import { Stack, router, useRootNavigationState, usePathname } from 'expo-router';
import { getSetting } from '../src/db/settings';
import { ShareIntentRoot } from '../src/share/share-intent-source';
import { shouldGoToOnboarding } from '../src/share/onboarding-guard';

export default function RootLayout() {
  const navState = useRootNavigationState();
  const navReady = !!navState?.key;
  const pathname = usePathname();
  const onboardingChecked = useRef(false);

  // 初回起動時のみオンボーディングへ（C案・スキップ可）。共有取込の画面は上書きしない
  useEffect(() => {
    if (!navReady || onboardingChecked.current) return;
    onboardingChecked.current = true;
    getSetting('onboardingDone')
      .then((v) => {
        if (shouldGoToOnboarding({ onboardingDone: v, pathname })) router.replace('/onboarding');
      })
      .catch(() => { /* 失敗時は通常起動 */ });
  }, [navReady]);

  // 共有シート・「このアプリで開く」で届いたファイルは、+native-intent が /share-import へ送り、
  // その画面（app/share-import.tsx）が取込〜解析結果への遷移までを受け持つ。
  return (
    <ShareIntentRoot>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'ホーム' }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="child-form" options={{ title: '子供の情報', presentation: 'modal' }} />
        <Stack.Screen name="facility-form" options={{ title: '施設の情報', presentation: 'modal' }} />
        <Stack.Screen name="analysis-result" options={{ title: '解析結果' }} />
        <Stack.Screen name="camera-scan" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="share-import" options={{ title: 'プリントの読み込み', headerBackVisible: false, gestureEnabled: false }} />
      </Stack>
    </ShareIntentRoot>
  );
}
