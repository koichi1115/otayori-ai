import { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, Type, Shadows, BorderRadius, TouchTarget } from '../src/constants/theme';
import { useShareIntentValue } from '../src/share/share-intent-source';
import { pickSource } from '../src/share/shared-payload';
import { useShareImportFlow } from '../src/share/use-share-import-flow';
import { describeProgress } from '../src/share/progress';
import { failureMessage } from '../src/share/failure-messages';
import { showResult, showCamera, showHome } from '../src/share/share-navigation';

// 他のアプリの共有シート / 「このアプリで開く」から来たファイルの取込画面。
// 開いた瞬間から「読み込み中」を出し、成功すれば解析結果へ、失敗すれば理由と次の一手を出す。
export default function ShareImportScreen() {
  const { fileUri } = useLocalSearchParams<{ fileUri?: string }>();
  const { hasShareIntent, shareIntent, error, resetShareIntent } = useShareIntentValue();
  const source = pickSource({ hasShareIntent, shareIntent, error, fileUri });

  const onDone = useCallback((docId: number) => {
    resetShareIntent();
    showResult(docId);
  }, [resetShareIntent]);
  const state = useShareImportFlow(source, onDone);

  if (state.phase === 'running') {
    const view = describeProgress(state.progress);
    return (
      <View style={styles.container}>
        <View style={styles.card} accessibilityLiveRegion="polite">
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.title}>{view.title}</Text>
          <Text style={styles.detail}>{view.detail}</Text>
          <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(view.ratio * 100) }}>
            <View style={[styles.bar, { width: `${Math.round(view.ratio * 100)}%` }]} />
          </View>
        </View>
      </View>
    );
  }

  const leave = (go: () => void) => () => { resetShareIntent(); go(); };
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Ionicons name="alert-circle-outline" size={40} color={Colors.danger} />
        <Text style={styles.message} accessibilityRole="alert">{failureMessage(state.reason)}</Text>
        <TouchableOpacity style={styles.primary} onPress={leave(showCamera)} accessibilityRole="button" accessibilityLabel="写真で撮って読み込む">
          <Ionicons name="camera-outline" size={20} color={Colors.onPrimary} />
          <Text style={styles.primaryText}>写真で撮って読み込む</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondary} onPress={leave(showHome)} accessibilityRole="button" accessibilityLabel="ホームへ戻る">
          <Text style={styles.secondaryText}>ホームへ戻る</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, padding: Spacing.lg },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.xl, alignItems: 'center', width: '100%', ...Shadows.card },
  title: { ...Type.leadStrong, color: Colors.text, marginTop: Spacing.lg },
  detail: { ...Type.caption, color: Colors.textSecondary, marginTop: Spacing.sm, textAlign: 'center' },
  track: { height: Spacing.sm, width: '100%', backgroundColor: Colors.border, borderRadius: BorderRadius.full, marginTop: Spacing.md, overflow: 'hidden' },
  bar: { height: '100%', backgroundColor: Colors.primary, borderRadius: BorderRadius.full },
  message: { ...Type.body, color: Colors.text, marginTop: Spacing.md, marginBottom: Spacing.lg, textAlign: 'center' },
  primary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.primary, borderRadius: BorderRadius.md, minHeight: TouchTarget.min, paddingHorizontal: Spacing.lg, width: '100%' },
  primaryText: { ...Type.leadStrong, color: Colors.onPrimary },
  secondary: { marginTop: Spacing.md, minHeight: TouchTarget.min, paddingHorizontal: Spacing.md, justifyContent: 'center' },
  secondaryText: { ...Type.body, color: Colors.textSecondary },
});
