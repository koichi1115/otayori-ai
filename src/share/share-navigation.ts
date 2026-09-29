// 共有取込画面からの画面遷移だけを集める。共有で開いた直後は戻る先が無いので、先にホームを土台に置く。
import { router } from 'expo-router';

export function showHome(): void {
  router.replace('/(tabs)');
}

export function showResult(docId: number): void {
  router.replace('/(tabs)');
  router.push({ pathname: '/analysis-result', params: { docId: String(docId) } });
}

export function showCamera(): void {
  router.replace('/(tabs)');
  router.push('/camera-scan');
}
