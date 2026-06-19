import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize } from '../../src/constants/theme';
import { analyzePDF } from '../../src/services/llm';
import { getDatabase } from '../../src/db/database';

export default function ScanScreen() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState('');

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const file = result.assets[0];
      await processFile(file.uri, file.name);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const processFile = async (uri: string, fileName: string) => {
    setIsProcessing(true);
    setStatusText('PDFを読み込み中...');

    try {
      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      setStatusText('AI解析中...');
      const analysisResult = await analyzePDF(base64);

      // Save to DB
      setStatusText('保存中...');
      const db = await getDatabase();
      const docResult = await db.runAsync(
        `INSERT INTO documents (file_name, original_file_name, file_path, status, category, source, title, summary, raw_json)
         VALUES (?, ?, ?, 'completed', ?, ?, ?, ?, ?)`,
        [
          analysisResult.suggestedFileName || fileName,
          fileName,
          uri,
          analysisResult.category,
          analysisResult.source,
          analysisResult.title,
          analysisResult.summary,
          JSON.stringify(analysisResult),
        ]
      );

      const docId = docResult.lastInsertRowId;

      // Save events
      for (const event of analysisResult.events) {
        await db.runAsync(
          'INSERT INTO events (document_id, title, date, start_time, end_time, location, target_person, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [docId, event.title, event.date, event.startTime || null, event.endTime || null, event.location || null, event.targetPerson, event.description]
        );
      }

      // Save todos
      for (const todo of analysisResult.todos) {
        await db.runAsync(
          'INSERT INTO todos (document_id, title, due_date, target_person, description) VALUES (?, ?, ?, ?, ?)',
          [docId, todo.title, todo.dueDate || null, todo.targetPerson, todo.description]
        );
      }

      // Save items
      for (const item of analysisResult.items) {
        await db.runAsync(
          'INSERT INTO items (document_id, name, due_date, target_person, description) VALUES (?, ?, ?, ?, ?)',
          [docId, item.name, item.dueDate || null, item.targetPerson, item.description]
        );
      }

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
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>{statusText}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>プリントを取り込む</Text>
      <Text style={styles.subtitle}>PDFファイルを選択して、AIが自動で解析します</Text>

      <TouchableOpacity style={styles.option} onPress={pickDocument}>
        <View style={[styles.iconCircle, { backgroundColor: Colors.primaryLight }]}>
          <Ionicons name="document" size={32} color={Colors.primary} />
        </View>
        <Text style={styles.optionTitle}>ファイルから選択</Text>
        <Text style={styles.optionDesc}>端末内のPDFを選択</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.option} onPress={() => Alert.alert('準備中', 'カメラスキャン機能はPhase 1で実装予定です')}>
        <View style={[styles.iconCircle, { backgroundColor: '#FFF3E0' }]}>
          <Ionicons name="camera" size={32} color={Colors.secondary} />
        </View>
        <Text style={styles.optionTitle}>カメラでスキャン</Text>
        <Text style={styles.optionDesc}>プリントを撮影してPDF化</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.option} onPress={() => Alert.alert('準備中', 'Google Drive連携はPhase 2で実装予定です')}>
        <View style={[styles.iconCircle, { backgroundColor: '#E8F5E9' }]}>
          <Ionicons name="cloud" size={32} color={Colors.success} />
        </View>
        <Text style={styles.optionTitle}>Google Driveから選択</Text>
        <Text style={styles.optionDesc}>Driveのフォルダから取得</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.lg },
  title: { fontSize: FontSize.xl, fontWeight: 'bold', color: Colors.text, marginBottom: Spacing.xs },
  subtitle: { fontSize: FontSize.md, color: Colors.textSecondary, marginBottom: Spacing.lg },
  option: {
    backgroundColor: Colors.surface, borderRadius: 12, padding: Spacing.lg,
    marginBottom: Spacing.md, alignItems: 'center',
  },
  iconCircle: {
    width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  optionTitle: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.text },
  optionDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  loadingText: { fontSize: FontSize.lg, color: Colors.text, marginTop: Spacing.md },
});
