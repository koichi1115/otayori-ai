import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize } from '../../src/constants/theme';
import { getAllSettings, setSetting } from '../../src/db/settings';
import { signInWithGoogle, isGoogleConnected, disconnectGoogle } from '../../src/services/google-auth';
import type { AppSettings, LLMProvider } from '../../src/types';

const LLM_OPTIONS: { label: string; value: LLMProvider }[] = [
  { label: 'Claude (Anthropic)', value: 'claude' },
  { label: 'Gemini (Google)', value: 'gemini' },
  { label: 'GPT (OpenAI)', value: 'openai' },
];

export default function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');

  const loadSettings = useCallback(async () => {
    try {
      setSettings(await getAllSettings());
      setGoogleConnected(await isGoogleConnected());
    } catch { /* */ }
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
    Alert.alert('連携解除', 'Google連携を解除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '解除', style: 'destructive',
        onPress: async () => { await disconnectGoogle(); setGoogleConnected(false); },
      },
    ]);
  };

  if (!settings) return null;

  return (
    <ScrollView style={styles.container}>
      {/* LLM Provider */}
      <Text style={styles.sectionTitle}>AIモデル設定</Text>
      <View style={styles.card}>
        <Text style={styles.label}>使用するAI</Text>
        <View style={styles.segmented}>
          {LLM_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.segment, settings.llmProvider === opt.value && styles.segmentActive]}
              onPress={() => updateSetting('llmProvider', opt.value)}
            >
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
              secureTextEntry
              autoCapitalize="none"
            />
            <Text style={styles.label}>モデル</Text>
            <TextInput
              style={styles.input}
              value={settings.claudeModel}
              onChangeText={(v) => updateSetting('claudeModel', v)}
              autoCapitalize="none"
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
              secureTextEntry
              autoCapitalize="none"
            />
            <Text style={styles.label}>モデル</Text>
            <TextInput
              style={styles.input}
              value={settings.geminiModel}
              onChangeText={(v) => updateSetting('geminiModel', v)}
              autoCapitalize="none"
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
              secureTextEntry
              autoCapitalize="none"
            />
            <Text style={styles.label}>モデル</Text>
            <TextInput
              style={styles.input}
              value={settings.openaiModel}
              onChangeText={(v) => updateSetting('openaiModel', v)}
              autoCapitalize="none"
            />
          </>
        )}
      </View>

      {/* Google */}
      <Text style={styles.sectionTitle}>Google連携</Text>
      <View style={styles.card}>
        {googleConnected ? (
          <>
            <View style={styles.connectedRow}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              <Text style={styles.connectedText}>Googleアカウント連携済み</Text>
            </View>
            <Text style={styles.hint}>Drive, カレンダー, タスクへのアクセスが有効です</Text>

            <Text style={styles.label}>Drive保存先フォルダID</Text>
            <TextInput
              style={styles.input}
              value={settings.driveFolderId || ''}
              onChangeText={(v) => updateSetting('driveFolderId', v)}
              placeholder="Google DriveのフォルダID"
              autoCapitalize="none"
            />

            <Text style={styles.label}>カレンダーID</Text>
            <TextInput
              style={styles.input}
              value={settings.calendarId || ''}
              onChangeText={(v) => updateSetting('calendarId', v)}
              placeholder="primary（デフォルト）"
              autoCapitalize="none"
            />

            <TouchableOpacity style={styles.dangerButton} onPress={handleGoogleDisconnect}>
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
              autoCapitalize="none"
            />
            <Text style={styles.hint}>Google Cloud Consoleでプロジェクトを作成し、OAuth Client IDを取得してください</Text>

            <TouchableOpacity style={styles.button} onPress={handleGoogleSignIn}>
              <Ionicons name="logo-google" size={18} color="#fff" />
              <Text style={styles.buttonText}>Googleアカウントと連携</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* LINE */}
      <Text style={styles.sectionTitle}>LINE通知</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Channel Access Token</Text>
        <TextInput
          style={styles.input}
          value={settings.lineChannelAccessToken || ''}
          onChangeText={(v) => updateSetting('lineChannelAccessToken', v)}
          secureTextEntry
          autoCapitalize="none"
        />
        <Text style={styles.label}>User ID</Text>
        <TextInput
          style={styles.input}
          value={settings.lineUserId || ''}
          onChangeText={(v) => updateSetting('lineUserId', v)}
          autoCapitalize="none"
        />
        <Text style={styles.hint}>LINE Developersでチャネルを作成し、トークンとユーザーIDを設定してください</Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.md },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.text, marginTop: Spacing.md, marginBottom: Spacing.sm },
  card: { backgroundColor: Colors.surface, borderRadius: 10, padding: Spacing.md, marginBottom: Spacing.sm },
  label: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.sm, marginBottom: Spacing.xs },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: Spacing.sm,
    fontSize: FontSize.md, backgroundColor: Colors.background,
  },
  segmented: { flexDirection: 'row', gap: Spacing.xs },
  segment: {
    flex: 1, paddingVertical: Spacing.sm, borderRadius: 8, alignItems: 'center',
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
  },
  segmentActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  segmentText: { fontSize: FontSize.sm, color: Colors.text },
  segmentTextActive: { color: '#fff', fontWeight: '600' },
  button: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: 8, padding: Spacing.md,
    marginTop: Spacing.sm, gap: Spacing.sm,
  },
  buttonText: { color: '#fff', fontSize: FontSize.md, fontWeight: '600' },
  dangerButton: {
    backgroundColor: 'transparent', borderRadius: 8, padding: Spacing.sm,
    marginTop: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.danger,
  },
  dangerButtonText: { color: Colors.danger, fontSize: FontSize.sm },
  connectedRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  connectedText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.success },
  hint: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: Spacing.xs },
});
