import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, FontSize, Shadows, BorderRadius } from '../src/constants/theme';
import { setSetting } from '../src/db/settings';

/**
 * 初回オンボーディング（C案）
 * - 「今すぐ始める」= localモード。摩擦ゼロで即ホームへ
 * - 「Appleでサインイン」= appleモード。公式ボタン（HIG準拠）
 * - v1.1ではGoogleは出さない（v1.2で追加）
 * - どの選択でも、あとから設定で変更できることを明示
 */
export default function OnboardingScreen() {
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => setAppleAvailable(false));
    }
  }, []);

  const finish = async (mode: 'local' | 'apple') => {
    await setSetting('accountMode', mode);
    await setSetting('onboardingDone', '1');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace('/(tabs)');
  };

  const startLocal = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await finish('local');
    } finally {
      setBusy(false);
    }
  };

  const signInWithApple = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      await setSetting('appleUserId', credential.user);
      // メールは初回サインイン時のみ返る
      if (credential.email) await setSetting('appleUserEmail', credential.email);
      await finish('apple');
    } catch (e: any) {
      // ユーザーキャンセルは黙って戻す
      if (e?.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('サインインエラー', 'Appleでのサインインに失敗しました。もう一度お試しください。');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Image source={require('../assets/icon.png')} style={styles.mascot} />
        <Text style={styles.title}>ぷりかん！へようこそ</Text>
        <Text style={styles.subtitle}>
          学校・保育園のプリントをAIが解析し、{'\n'}予定・提出物・持ち物を自動で整理します
        </Text>
      </View>

      <View style={styles.options}>
        {/* 今すぐ始める（最上段・最も軽く） */}
        <TouchableOpacity
          style={styles.primaryOption}
          onPress={startLocal}
          disabled={busy}
          activeOpacity={0.7}
          accessibilityLabel="今すぐ始める"
          accessibilityRole="button"
        >
          <Ionicons name="rocket-outline" size={22} color="#fff" />
          <View style={styles.optionTextWrap}>
            <Text style={styles.primaryOptionTitle}>今すぐ始める</Text>
            <Text style={styles.primaryOptionDesc}>登録不要。データはこの端末に保存されます</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>

        {/* Apple公式サインインボタン（HIG準拠） */}
        {appleAvailable && (
          <>
            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>または</Text>
              <View style={styles.divider} />
            </View>
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={BorderRadius.md}
              style={styles.appleButton}
              onPress={signInWithApple}
            />
            <Text style={styles.appleHint}>
              サインインすると、将来のiCloud同期（近日対応）に備えられます
            </Text>
          </>
        )}
      </View>

      <Text style={styles.footnote}>選択はあとから「設定」でいつでも変更できます</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg, paddingTop: 80, paddingBottom: 48,
  },
  hero: { alignItems: 'center' },
  mascot: {
    width: 140, height: 140, borderRadius: 32,
    ...Shadows.lg,
  },
  title: {
    fontSize: FontSize.xxl, fontWeight: 'bold', color: Colors.text,
    marginTop: Spacing.lg,
  },
  subtitle: {
    fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center',
    lineHeight: 22, marginTop: Spacing.sm,
  },
  options: { flex: 1, justifyContent: 'center' },
  primaryOption: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.primary, borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md + 2,
    ...Shadows.md,
  },
  optionTextWrap: { flex: 1 },
  primaryOptionTitle: { color: '#fff', fontSize: FontSize.lg, fontWeight: '700' },
  primaryOptionDesc: { color: 'rgba(255,255,255,0.85)', fontSize: FontSize.xs, marginTop: 2 },
  dividerRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    marginVertical: Spacing.lg,
  },
  divider: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  appleButton: { width: '100%', height: 50 },
  appleHint: {
    fontSize: FontSize.xs, color: Colors.textSecondary, textAlign: 'center',
    marginTop: Spacing.sm, lineHeight: 16,
  },
  footnote: {
    fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center',
  },
});
