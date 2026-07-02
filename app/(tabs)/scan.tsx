import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, Shadows, BorderRadius } from '../../src/constants/theme';
import { analyzePDF } from '../../src/services/llm';
import { sendLineNotification } from '../../src/services/line-notify';
import { getDatabase } from '../../src/db/database';
import { registerReminder } from '../../src/services/reminder';

function getMimeType(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop();
  switch (ext) {
    case 'jpg': case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    case 'gif': return 'image/gif';
    case 'webp': return 'image/webp';
    case 'heic': return 'image/heic';
    default: return 'application/pdf';
  }
}

export default function ScanScreen() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState('');
  const params = useLocalSearchParams<{ capturedUri?: string; capturedName?: string }>();

  useEffect(() => {
    if (params.capturedUri && params.capturedName) {
      processFile(params.capturedUri, params.capturedName);
      router.setParams({ capturedUri: undefined, capturedName: undefined });
    }
  }, [params.capturedUri]);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const file = result.assets[0];
      await processFile(file.uri, file.name);
    } catch (e: any) {
      Alert.alert('エラー', e.message);
    }
  };

  const processFile = async (uri: string, fileName: string) => {
    setIsProcessing(true);
    setStatusText('ファイルを読み込み中...');

    try {
      const file = new File(uri);
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      const mimeType = getMimeType(fileName);
      setStatusText('AI解析中...');
      const analysisResult = await analyzePDF(base64, mimeType);

      setStatusText('保存中...');
      const db = await getDatabase();
      const docResult = await db.runAsync(
        `INSERT INTO documents (file_name, original_file_name, file_path, drive_file_id, status, category, source, title, summary, raw_json)
         VALUES (?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?)`,
        [
          analysisResult.suggestedFileName || fileName,
          fileName,
          uri,
          null,
          analysisResult.category,
          analysisResult.source,
          analysisResult.title,
          analysisResult.summary,
          JSON.stringify(analysisResult),
        ]
      );

      const docId = docResult.lastInsertRowId;

      for (const event of analysisResult.events) {
        await db.runAsync(
          'INSERT INTO events (document_id, title, date, start_time, end_time, location, target_person, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [docId, event.title, event.date, event.startTime || null, event.endTime || null, event.location || null, event.targetPerson, event.description]
        );
      }

      for (const todo of analysisResult.todos) {
        await db.runAsync(
          'INSERT INTO todos (document_id, title, due_date, target_person, description) VALUES (?, ?, ?, ?, ?)',
          [docId, todo.title, todo.dueDate || null, todo.targetPerson, todo.description]
        );
      }

      for (const item of analysisResult.items) {
        await db.runAsync(
          'INSERT INTO items (document_id, name, due_date, target_person, description) VALUES (?, ?, ?, ?, ?)',
          [docId, item.name, item.dueDate || null, item.targetPerson, item.description]
        );
      }

      // Schedule LINE reminders for due-dated TODOs / items (best-effort)
      for (const todo of analysisResult.todos) {
        if (todo.dueDate) {
          registerReminder({ title: todo.title, dueDate: todo.dueDate, targetPerson: todo.targetPerson, type: 'todo', documentTitle: analysisResult.title }).catch(() => {});
        }
      }
      for (const item of analysisResult.items) {
        if (item.dueDate) {
          registerReminder({ title: item.name, dueDate: item.dueDate, targetPerson: item.targetPerson, type: 'item', documentTitle: analysisResult.title }).catch(() => {});
        }
      }

      // Send LINE notification (non-blocking)
      setStatusText('LINE通知送信中...');
      sendLineNotification(analysisResult).catch(() => {});

      setIsProcessing(false);
      setStatusText('');

      router.push({ pathname: '/analysis-result', params: { docId: String(docId) } });
    } catch (e: any) {
      setIsProcessing(false);
      setStatusText('');
      Alert.alert('解析エラー', e.message);
    }
  };

  if (isProcessing) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>{statusText}</Text>
          <Text style={styles.loadingHint}>プリントの内容をAIが解析しています</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerArea}>
        <Ionicons name="scan-outline" size={32} color={Colors.primary} />
        <Text style={styles.title}>プリントを取り込む</Text>
        <Text style={styles.subtitle}>PDF・画像ファイルを選択して、AIが自動で解析します</Text>
      </View>

      <TouchableOpacity
        style={styles.option}
        onPress={pickDocument}
        activeOpacity={0.7}
        accessibilityLabel="ファイルから選択"
        accessibilityRole="button"
      >
        <View style={[styles.iconCircle, { backgroundColor: Colors.primaryLight }]}>
          <Ionicons name="document" size={32} color={Colors.primary} />
        </View>
        <Text style={styles.optionTitle}>ファイルから選択</Text>
        <Text style={styles.optionDesc}>PDF・JPG・PNGに対応</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.option}
        onPress={() => router.push('/camera-scan')}
        activeOpacity={0.7}
        accessibilityLabel="カメラでスキャン"
        accessibilityRole="button"
      >
        <View style={[styles.iconCircle, { backgroundColor: '#FFF3E0' }]}>
          <Ionicons name="camera" size={32} color={Colors.secondary} />
        </View>
        <Text style={styles.optionTitle}>カメラでスキャン</Text>
        <Text style={styles.optionDesc}>プリントを撮影してPDF化</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xl },
  headerArea: { alignItems: 'center', marginBottom: Spacing.lg },
  title: { fontSize: FontSize.xl, fontWeight: 'bold', color: Colors.text, marginTop: Spacing.sm },
  subtitle: { fontSize: FontSize.md, color: Colors.textSecondary, marginTop: Spacing.xs, textAlign: 'center' },
  option: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg,
    marginBottom: Spacing.md, alignItems: 'center',
    ...Shadows.md,
  },
  iconCircle: {
    width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  optionTitle: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.text },
  optionDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, padding: Spacing.lg },
  loadingCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.xl,
    alignItems: 'center', width: '100%',
    ...Shadows.md,
  },
  loadingText: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.text, marginTop: Spacing.lg },
  loadingHint: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.sm },
});
