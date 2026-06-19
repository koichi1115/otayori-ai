import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="child-form" options={{ title: '子供の情報', presentation: 'modal' }} />
      <Stack.Screen name="facility-form" options={{ title: '施設の情報', presentation: 'modal' }} />
      <Stack.Screen name="analysis-result" options={{ title: '解析結果' }} />
    </Stack>
  );
}
