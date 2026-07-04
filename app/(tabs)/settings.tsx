import { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Linking, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, FontSize, Shadows, BorderRadius } from '../../src/constants/theme';
import { getAllSettings, setSetting } from '../../src/db/settings';
import type { AppSettings } from '../../src/types';

// LINE公式アカウントの友だち追加URL（後で実際のURLに置き換え）
const LINE_FRIEND_ADD_URL = 'https://line.me/R/ti/p/@760llvzb';

export default function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      setSettings(await getAllSettings());
    } catch { /* */ } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadSettings(); }, [loadSettings]));

  const updateSetting = async (key: keyof AppSettings, value: string) => {
    await setSetting(key, value);
    setSettings(prev => prev ? { ...prev, [key]: value } : prev);
  };

  const lineRoomId = settings?.lineUserId || '';
  const isLineConnected = !!lineRoomId;

  // --- アカウントモード（v1.1: local / apple） ---
  const [appleAvailable, setAppleAvailable] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => setAppleAvailable(false));
    }
  }, []);

  const isAppleMode = settings?.accountMode === 'apple';

  const handleAppleSignIn = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      await setSetting('appleUserId', credential.user);
      if (credential.email) await setSetting('appleUserEmail', credential.email);
      await setSetting('accountMode', 'apple');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      loadSettings();
    } catch (e: any) {
      if (e?.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('サインインエラー', 'Appleでのサインインに失敗しました。もう一度お試しください。');
      }
    }
  };

  const handleAppleSignOut = () => {
    Alert.alert(
      'サインアウト',
      'Appleアカウントからサインアウトしますか？\n\nこの端末のデータ（プリント・解析結果）はそのまま残ります。カレンダー・リマインダーへの登録機能も引き続き使えます。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'サインアウト', style: 'destructive',
          onPress: async () => {
            await setSetting('accountMode', 'local');
            await setSetting('appleUserId', '');
            loadSettings();
          },
        },
      ]
    );
  };

  if (loading || !settings) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* アカウント */}
      {Platform.OS === 'ios' && (
        <>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-circle-outline" size={20} color={Colors.text} />
            <Text style={styles.sectionTitle}>アカウント</Text>
          </View>
          <View style={styles.card}>
            {isAppleMode ? (
              <>
                <View style={styles.connectedRow}>
                  <View style={styles.statusDot} />
                  <Text style={styles.connectedText}>Appleアカウントでサインイン中</Text>
                </View>
                <Text style={styles.hint}>
                  予定はiOSカレンダー、TODO・持ち物はiOSリマインダーに登録できます。iCloud同期は近日対応予定です。
                </Text>
                <TouchableOpacity
                  style={styles.dangerButton}
                  onPress={handleAppleSignOut}
                  activeOpacity={0.7}
                  accessibilityLabel="Appleアカウントからサインアウト"
                  accessibilityRole="button"
                >
                  <Ionicons name="log-out-outline" size={16} color={Colors.danger} />
                  <Text style={styles.dangerButtonText}>サインアウト</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.connectedRow}>
                  <Ionicons name="phone-portrait-outline" size={16} color={Colors.primary} />
                  <Text style={styles.modeText}>この端末で利用中（登録不要）</Text>
                </View>
                <Text style={styles.hint}>
                  データはこの端末に保存されます。予定・TODOはiOSカレンダー/リマインダーに登録できます。
                </Text>
                {appleAvailable && (
                  <>
                    <AppleAuthentication.AppleAuthenticationButton
                      buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                      cornerRadius={BorderRadius.sm}
                      style={styles.appleButton}
                      onPress={handleAppleSignIn}
                    />
                    <Text style={styles.hint}>サインインすると、将来のiCloud同期（近日対応）に備えられます</Text>
                  </>
                )}
              </>
            )}
          </View>
        </>
      )}

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
  modeText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  appleButton: { width: '100%', height: 44, marginTop: Spacing.md },
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
