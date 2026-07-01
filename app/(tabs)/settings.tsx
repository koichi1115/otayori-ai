import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Linking } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Colors, Spacing, FontSize, Shadows, BorderRadius } from '../../src/constants/theme';
import { getAllSettings, setSetting } from '../../src/db/settings';
import { signInWithGoogle, isGoogleConnected, disconnectGoogle } from '../../src/services/google-auth';
import type { AppSettings } from '../../src/types';

// LINE公式アカウントの友だち追加URL（後で実際のURLに置き換え）
const LINE_FRIEND_ADD_URL = 'https://line.me/R/ti/p/@760llvzb';

export default function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setSettings(await getAllSettings());
      setGoogleConnected(await isGoogleConnected());
    } catch { /* */ } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadSettings(); }, [loadSettings]));

  const updateSetting = async (key: keyof AppSettings, value: string) => {
    await setSetting(key, value);
    setSettings(prev => prev ? { ...prev, [key]: value } : prev);
  };

  const handleGoogleSignIn = async () => {
    const clientId = Constants.expoConfig?.extra?.googleOAuthClientId;
    if (!clientId) {
      Alert.alert('設定エラー', 'Google OAuth Client IDが設定されていません');
      return;
    }
    setSigningIn(true);
    try {
      await signInWithGoogle(clientId);
      setGoogleConnected(true);
      Alert.alert('連携完了', 'Googleアカウントとの連携が完了しました');
    } catch (e: any) {
      Alert.alert('認証エラー', e.message);
    } finally {
      setSigningIn(false);
    }
  };

  const handleGoogleDisconnect = () => {
    Alert.alert('連携解除', 'Google連携を解除しますか？\nDrive・カレンダーへのアクセスが無効になります。', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '解除', style: 'destructive',
        onPress: async () => { await disconnectGoogle(); setGoogleConnected(false); },
      },
    ]);
  };

  const lineRoomId = settings?.lineUserId || '';
  const isLineConnected = !!lineRoomId;

  if (loading || !settings) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Google */}
      <View style={styles.sectionHeader}>
        <Ionicons name="logo-google" size={20} color={Colors.text} />
        <Text style={styles.sectionTitle}>Google連携</Text>
      </View>
      <View style={styles.card}>
        {googleConnected ? (
          <>
            <View style={styles.connectedRow}>
              <View style={styles.statusDot} />
              <Text style={styles.connectedText}>Googleアカウント連携済み</Text>
            </View>
            <Text style={styles.hint}>Drive, カレンダーへのアクセスが有効です</Text>

            <TouchableOpacity
              style={styles.dangerButton}
              onPress={handleGoogleDisconnect}
              activeOpacity={0.7}
              accessibilityLabel="Google連携を解除"
              accessibilityRole="button"
            >
              <Ionicons name="unlink-outline" size={16} color={Colors.danger} />
              <Text style={styles.dangerButtonText}>連携を解除</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.descText}>Googleアカウントと連携すると、プリントのDrive保存やカレンダー登録ができます。</Text>
            <TouchableOpacity
              style={[styles.button, signingIn && { opacity: 0.6 }]}
              onPress={handleGoogleSignIn}
              activeOpacity={0.7}
              disabled={signingIn}
              accessibilityLabel="Googleアカウントと連携"
              accessibilityRole="button"
            >
              {signingIn ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="logo-google" size={18} color="#fff" />
              )}
              <Text style={styles.buttonText}>{signingIn ? '認証中...' : 'Googleアカウントと連携'}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* LINE */}
      <View style={styles.sectionHeader}>
        <Ionicons name="chatbubble-outline" size={20} color={Colors.text} />
        <Text style={styles.sectionTitle}>LINE通知</Text>
      </View>
      <View style={styles.card}>
        {isLineConnected ? (
          <>
            <View style={styles.connectedRow}>
              <View style={styles.statusDot} />
              <Text style={styles.connectedText}>LINE通知 設定済み</Text>
            </View>
            <Text style={styles.hint}>ルームID: {lineRoomId}</Text>

            <TouchableOpacity
              style={styles.dangerButton}
              onPress={() => {
                Alert.alert('LINE連携を解除', 'ルームIDを削除しますか？', [
                  { text: 'キャンセル', style: 'cancel' },
                  { text: '解除', style: 'destructive', onPress: () => updateSetting('lineUserId', '') },
                ]);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="unlink-outline" size={16} color={Colors.danger} />
              <Text style={styles.dangerButtonText}>連携を解除</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.descText}>LINE公式アカウントを友だち追加すると、プリントの通知をLINEで受け取れます。</Text>

            <TouchableOpacity
              style={styles.lineButton}
              onPress={() => Linking.openURL(LINE_FRIEND_ADD_URL)}
              activeOpacity={0.7}
              accessibilityLabel="LINE公式アカウントを友だち追加"
              accessibilityRole="button"
            >
              <Ionicons name="chatbubble" size={18} color="#fff" />
              <Text style={styles.buttonText}>友だち追加</Text>
            </TouchableOpacity>

            <Text style={[styles.label, { marginTop: Spacing.lg }]}>ルームID</Text>
            <Text style={styles.hint}>友だち追加後、公式アカウントからルームIDが届きます。そのIDを入力してください。</Text>
            <TextInput
              style={[styles.input, { marginTop: Spacing.xs }]}
              value={settings.lineUserId || ''}
              onChangeText={(v) => updateSetting('lineUserId', v)}
              placeholder="ルームIDを入力"
              placeholderTextColor={Colors.textSecondary}
              autoCapitalize="none"
              accessibilityLabel="LINEルームID"
            />
          </>
        )}
      </View>

      {/* Reminder */}
      {isLineConnected && (
        <>
          <View style={styles.sectionHeader}>
            <Ionicons name="notifications-outline" size={20} color={Colors.text} />
            <Text style={styles.sectionTitle}>リマインダー</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.descText}>期限のあるTODO・持ち物をLINEで事前通知します。</Text>
            <Text style={styles.label}>何日前に通知する？</Text>
            <View style={styles.reminderOptions}>
              {['1', '2', '3', '5', '7'].map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.reminderChip,
                    settings.reminderDaysBefore === d && styles.reminderChipActive,
                  ]}
                  onPress={() => updateSetting('reminderDaysBefore', d)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.reminderChipText,
                    settings.reminderDaysBefore === d && styles.reminderChipTextActive,
                  ]}>
                    {d}日前
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.md },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    marginTop: Spacing.lg, marginBottom: Spacing.sm,
  },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.text },
  card: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  label: { fontSize: FontSize.sm, fontWeight: '500', color: Colors.textSecondary, marginTop: Spacing.sm, marginBottom: Spacing.xs },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, padding: Spacing.sm,
    fontSize: FontSize.md, backgroundColor: Colors.background, color: Colors.text,
  },
  button: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: BorderRadius.sm, padding: Spacing.md,
    marginTop: Spacing.md, gap: Spacing.sm,
    ...Shadows.sm,
  },
  buttonText: { color: '#fff', fontSize: FontSize.md, fontWeight: '600' },
  dangerButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
    backgroundColor: 'transparent', borderRadius: BorderRadius.sm, padding: Spacing.sm,
    marginTop: Spacing.md, borderWidth: 1, borderColor: Colors.danger,
  },
  dangerButtonText: { color: Colors.danger, fontSize: FontSize.sm, fontWeight: '500' },
  connectedRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.success },
  connectedText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.success },
  descText: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.sm },
  hint: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: Spacing.xs, lineHeight: 16 },
  lineButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#06C755', borderRadius: BorderRadius.sm, padding: Spacing.md,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  reminderOptions: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.xs,
  },
  reminderChip: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  reminderChipActive: {
    backgroundColor: Colors.primary, borderColor: Colors.primary,
  },
  reminderChipText: { fontSize: FontSize.md, color: Colors.text, fontWeight: '500' },
  reminderChipTextActive: { color: '#fff' },
});
