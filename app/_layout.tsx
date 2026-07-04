import { useEffect, useRef } from 'react';
import { Stack, router, useRootNavigationState } from 'expo-router';
import { getSetting } from '../src/db/settings';

// expo-share-intent はネイティブ拡張のため、Expo Go等モジュール不在の環境では
// クラッシュせずに無効化する（EAS/実機ビルドでのみ有効）
let useShareIntent: () => { hasShareIntent: boolean; shareIntent: any; resetShareIntent: () => void };
try {
  useShareIntent = require('expo-share-intent').useShareIntent;
} catch {
  useShareIntent = () => ({ hasShareIntent: false, shareIntent: null, resetShareIntent: () => {} });
}

export default function RootLayout() {
  const navState = useRootNavigationState();
  const navReady = !!navState?.key;
  const onboardingChecked = useRef(false);

  // 初回起動時のみオンボーディングへ（C案・スキップ可）
  useEffect(() => {
    if (!navReady || onboardingChecked.current) return;
    onboardingChecked.current = true;
    getSetting('onboardingDone')
      .then((v) => {
        if (v !== '1') router.replace('/onboarding');
      })
      .catch(() => { /* 失敗時は通常起動 */ });
  }, [navReady]);

  // 共有シートからのファイル取込（PDF・画像） → スキャン画面の解析フローへ直行
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();
  useEffect(() => {
    if (!navReady || !hasShareIntent) return;
    const file: any = shareIntent?.files?.[0];
    if (file) {
      const rawPath: string = file.path ?? file.filePath ?? '';
      const uri = rawPath.startsWith('file://') ? rawPath : `file://${rawPath}`;
      const name: string = file.fileName ?? rawPath.split('/').pop() ?? 'shared.pdf';
      router.push({ pathname: '/(tabs)/scan', params: { capturedUri: uri, capturedName: name } });
    }
    resetShareIntent();
  }, [navReady, hasShareIntent]);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'ホーム' }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      <Stack.Screen name="child-form" options={{ title: '子供の情報', presentation: 'modal' }} />
      <Stack.Screen name="facility-form" options={{ title: '施設の情報', presentation: 'modal' }} />
      <Stack.Screen name="analysis-result" options={{ title: '解析結果' }} />
      <Stack.Screen name="camera-scan" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
    </Stack>
  );
}
