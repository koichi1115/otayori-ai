import { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../src/constants/theme';
import { setSetting } from '../src/db/settings';

/**
 * Deep link handler for LINE連携
 * URL: otayori-ai://link-line?id=<LINE_USER_ID>
 */
export default function LinkLineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  useEffect(() => {
    (async () => {
      if (!id) return;
      await setSetting('lineUserId', id);
      // Wait a moment so the user sees the success screen
      setTimeout(() => {
        router.replace('/(tabs)/settings');
      }, 2000);
    })();
  }, [id]);

  if (!id) {
    return (
      <View style={styles.container}>
        <Ionicons name="alert-circle" size={48} color={Colors.danger} />
        <Text style={styles.title}>連携エラー</Text>
        <Text style={styles.desc}>IDが見つかりません。LINEから再度お試しください。</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Ionicons name="checkmark-circle" size={64} color={Colors.success} />
        <Text style={styles.title}>LINE連携完了！</Text>
        <Text style={styles.desc}>プリントの通知がLINEに届くようになりました</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.background, padding: Spacing.lg,
  },
  card: {
    alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg, padding: Spacing.xl,
    width: '100%', ...Shadows.md,
  },
  title: {
    fontSize: FontSize.xl, fontWeight: 'bold', color: Colors.text,
    marginTop: Spacing.md,
  },
  desc: {
    fontSize: FontSize.md, color: Colors.textSecondary,
    marginTop: Spacing.sm, textAlign: 'center',
  },
});
