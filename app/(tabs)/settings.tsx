import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, Shadows, BorderRadius } from '../../src/constants/theme';
import { getAllSettings, setSetting } from '../../src/db/settings';
import { signInWithGoogle, isGoogleConnected, disconnectGoogle } from '../../src/services/google-auth';
import type { AppSettings, LLMProvider } from '../../src/types';

const LLM_OPTIONS: { label: string; value: LLMProvider; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'Claude', value: 'claude', icon: 'sparkles-outline' },
  { label: 'Gemini', value: 'gemini', icon: 'diamond-outline' },
  { label: 'GPT', value: 'openai', icon: 'flash-outline' },
];

export default function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');
  const [loading, setLoading] = useState(true);

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
    if (!googleClientId.trim()) {
      Alert.alert('入力エラー', 'Google OAuth Client IDを入力してください。\n\nGoogle Cloud Consoleで取得できます。');
      return;
    }
    try {
      await signInWithGoogle(googleClientId.trim());
      setGoogleConnected(true);
      Alert.alert('連携完了', 'Googleアカウントとの連携が完了しました');
    } catch (e: any) {
      Alert.alert('認証エラー', e.message);
    }
  };

  const handleGoogleDisconnect = () => {
    Alert.alert('連携解除', 'Google連携を解除しますか？\nDrive・カレンダー・タスクへのアクセスが無効になります。', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '解除', style: 'destructive',
        onPress: async () => { await disconnectGoogle(); setGoogleConnected(false); },
      },
    ]);
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
      {/* LLM Provider */}
      <View style={styles.sectionHeader}>
        <Ionicons name="hardware-chip-outline" size={20} color={Colors.text} />
        <Text style={styles.sectionTitle}>AIモデル設定</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>使用するAI</Text>
        <View style={styles.segmented}>
          {LLM_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.segment, settings.llmProvider === opt.value && styles.segmentActive]}
              onPress={() => updateSetting('llmProvider', opt.value)}
              activeOpacity={0.7}
              accessibilityLabel={`${opt.label}を選択`}
              accessibilityRole="button"
            >
              <Ionicons
                name={opt.icon}
                size={16}
                color={settings.llmProvider === opt.value ? '#fff' : Colors.text}
              />
              <Text style={[
                styles.segmentText,
                settings.llmProvider === opt.value && styles.segmentTextActive,
              ]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {settings.llmProvider === 'claude' && (
          <>
            <Text style={styles.label}>Claude API Key</Text>
            <TextInput
              style={styles.input}
              value={settings.claudeApiKey}
              onChangeText={(v) => updateSetting('claudeApiKey', v)}
              placeholder="sk-ant-..."
              placeholderTextColor={Colors.textSecondary}
              secureTextEntry
              autoCapitalize="none"
              accessibilityLabel="Claude APIキー"
            />
            <Text style={styles.label}>モデル</Text>
            <TextInput
              style={styles.input}
              value={settings.claudeModel}
              onChangeText={(v) => updateSetting('claudeModel', v)}
              autoCapitalize="none"
              accessibilityLabel="Claudeモデル名"
            />
          </>
        )}

        {settings.llmProvider === 'gemini' && (
          <>
            <Text style={styles.label}>Gemini API Key</Text>
            <TextInput
              style={styles.input}
              value={settings.geminiApiKey}
              onChangeText={(v) => updateSetting('geminiApiKey', v)}
              placeholder="AI..."
              placeholderTextColor={Colors.textSecondary}
              secureTextEntry
              autoCapitalize="none"
              accessibilityLabel="Gemini APIキー"
            />
            <Text style={styles.label}>モデル</Text>
            <TextInput
              style={styles.input}
              value={settings.geminiModel}
              onChangeText={(v) => updateSetting('geminiModel', v)}
              autoCapitalize="none"
              accessibilityLabel="Geminiモデル名"
            />
          </>
        )}

        {settings.llmProvider === 'openai' && (
          <>
            <Text style={styles.label}>OpenAI API Key</Text>
            <TextInput
              style={styles.input}
              value={settings.openaiApiKey}
              onChangeText={(v) => updateSetting('openaiApiKey', v)}
              placeholder="sk-..."
              placeholderTextColor={Colors.textSecondary}
              secureTextEntry
              autoCapitalize="none"
              accessibilityLabel="OpenAI APIキー"
            />
            <Text style={styles.label}>モデル</Text>
            <TextInput
              style={styles.input}
              value={settings.openaiModel}
              onChangeText={(v) => updateSetting('openaiModel', v)}
              autoCapitalize="none"
              accessibilityLabel="OpenAIモデル名"
            />
          </>
        )}
      </View>

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
            <Text style={styles.hint}>Drive, カレンダー, タスクへのアクセスが有効です</Text>

            <Text style={styles.label}>Drive保存先フォルダID</Text>
            <TextInput
              style={styles.input}
              value={settings.driveFolderId || ''}
              onChangeText={(v) => updateSetting('driveFolderId', v)}
              placeholder="Google DriveのフォルダID"
              placeholderTextColor={Colors.textSecondary}
              autoCapitalize="none"
              accessibilityLabel="DriveフォルダID"
            />

            <Text style={styles.label}>カレンダーID</Text>
            <TextInput
              style={styles.input}
              value={settings.calendarId || ''}
              onChangeText={(v) => updateSetting('calendarId', v)}
              placeholder="primary（デフォルト）"
              placeholderTextColor={Colors.textSecondary}
              autoCapitalize="none"
              accessibilityLabel="カレンダーID"
            />

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
            <Text style={styles.label}>Google OAuth Client ID</Text>
            <TextInput
              style={styles.input}
              value={googleClientId}
              onChangeText={setGoogleClientId}
              placeholder="xxxxx.apps.googleusercontent.com"
              placeholderTextColor={Colors.textSecondary}
              autoCapitalize="none"
              accessibilityLabel="Google OAuth Client ID"
            />
            <Text style={styles.hint}>Google Cloud Consoleでプロジェクトを作成し、OAuth Client IDを取得してください</Text>

            <TouchableOpacity
              style={styles.button}
              onPress={handleGoogleSignIn}
              activeOpacity={0.7}
              accessibilityLabel="Googleアカウントと連携"
              accessibilityRole="button"
            >
              <Ionicons name="logo-google" size={18} color="#fff" />
              <Text style={styles.buttonText}>Googleアカウントと連携</Text>
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
        <Text style={styles.label}>Channel Access Token</Text>
        <TextInput
          style={styles.input}
          value={settings.lineChannelAccessToken || ''}
          onChangeText={(v) => updateSetting('lineChannelAccessToken', v)}
          placeholderTextColor={Colors.textSecondary}
          secureTextEntry
          autoCapitalize="none"
          accessibilityLabel="LINE Channel Access Token"
        />
        <Text style={styles.label}>User ID</Text>
        <TextInput
          style={styles.input}
          value={settings.lineUserId || ''}
          onChangeText={(v) => updateSetting('lineUserId', v)}
          placeholderTextColor={Colors.textSecondary}
          autoCapitalize="none"
          accessibilityLabel="LINE User ID"
        />
        <Text style={styles.hint}>LINE Developersでチャネルを作成し、トークンとユーザーIDを設定してください</Text>
      </View>

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
  segmented: { flexDirection: 'row', gap: Spacing.xs },
  segment: {
    flex: 1, flexDirection: 'row', paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm,
    alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
  },
  segmentActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  segmentText: { fontSize: FontSize.sm, color: Colors.text },
  segmentTextActive: { color: '#fff', fontWeight: '600' },
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
  hint: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: Spacing.xs, lineHeight: 16 },
});
