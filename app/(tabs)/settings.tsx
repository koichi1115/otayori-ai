import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Colors, Spacing, FontSize } from '../../src/constants/theme';
import { getAllSettings, setSetting } from '../../src/db/settings';
import type { AppSettings, LLMProvider } from '../../src/types';

const LLM_OPTIONS: { label: string; value: LLMProvider }[] = [
  { label: 'Claude (Anthropic)', value: 'claude' },
  { label: 'Gemini (Google)', value: 'gemini' },
  { label: 'GPT (OpenAI)', value: 'openai' },
];

export default function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      setSettings(await getAllSettings());
    } catch { /* */ }
  }, []);

  useFocusEffect(useCallback(() => { loadSettings(); }, [loadSettings]));

  const updateSetting = async (key: keyof AppSettings, value: string) => {
    await setSetting(key, value);
    setSettings(prev => prev ? { ...prev, [key]: value } : prev);
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
      </View>

      {/* Google */}
      <Text style={styles.sectionTitle}>Google連携</Text>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => Alert.alert('準備中', 'Google認証はPhase 2で実装予定です')}
        >
          <Text style={styles.buttonText}>Googleアカウントと連携</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>Google Drive, カレンダーとの連携に使用します</Text>
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
    backgroundColor: Colors.primary, borderRadius: 8, padding: Spacing.md, alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: FontSize.md, fontWeight: '600' },
  hint: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: Spacing.xs, textAlign: 'center' },
});
