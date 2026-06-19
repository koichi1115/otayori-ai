import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize } from '../../src/constants/theme';
import { analyzePDF } from '../../src/services/llm';
import { sendLineNotification } from '../../src/services/line-notify';
import { getDatabase } from '../../src/db/database';
import { syncDriveFolder } from '../../src/services/drive-sync';
import { isGoogleConnected } from '../../src/services/google-auth';
import { getSetting } from '../../src/db/settings';

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
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const mimeType = getMimeType(fileName);
      setStatusText('AI解析中...');
      const analysisResult = await analyzePDF(base64, mimeType);

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
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>{statusText}</Text>
        <Text style={styles.loadingHint}>プリントの内容をAIが解析しています</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>プリントを取り込む</Text>
      <Text style={styles.subtitle}>PDF・画像ファイルを選択して、AIが自動で解析します</Text>

      <TouchableOpacity style={styles.option} onPress={pickDocument}>
        <View style={[styles.iconCircle, { backgroundColor: Colors.primaryLight }]}>
          <Ionicons name="document" size={32} color={Colors.primary} />
        </View>
        <Text style={styles.optionTitle}>ファイルから選択</Text>
        <Text style={styles.optionDesc}>PDF・JPG・PNGに対応</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.option} onPress={() => Alert.alert('準備中', 'カメラスキャン機能は次のアップデートで実装予定です')}>
        <View style={[styles.iconCircle, { backgroundColor: '#FFF3E0' }]}>
          <Ionicons name="camera" size={32} color={Colors.secondary} />
        </View>
        <Text style={styles.optionTitle}>カメラでスキャン</Text>
        <Text style={styles.optionDesc}>プリントを撮影してPDF化</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.option} onPress={async () => {
        const connected = await isGoogleConnected();
        if (!connected) {
          Alert.alert('未連携', '設定画面からGoogleアカウントを連携してください');
          return;
        }
        const folderId = await getSetting('driveFolderId');
        if (!folderId) {
          Alert.alert('未設定', '設定画面でGoogle DriveのフォルダIDを入力してください');
          return;
        }
        setIsProcessing(true);
        setStatusText('Google Driveフォルダを同期中...');
        try {
          const result = await syncDriveFolder(true);
          setIsProcessing(false);
          setStatusText('');
          if (result.processed === 0 && result.errors === 0) {
            Alert.alert('同期完了', '新しいファイルはありませんでした');
          } else {
            Alert.alert(
              '同期完了',
              `処理: ${result.processed}件\nスキップ: ${result.skipped}件\nエラー: ${result.errors}件` +
              (result.details.length > 0 ? '\n\n' + result.details.join('\n') : '')
            );
          }
        } catch (e: any) {
          setIsProcessing(false);
          setStatusText('');
          Alert.alert('同期エラー', e.message);
        }
      }}>
        <View style={[styles.iconCircle, { backgroundColor: '#E8F5E9' }]}>
          <Ionicons name="cloud-download" size={32} color={Colors.success} />
        </View>
        <Text style={styles.optionTitle}>Google Driveから同期</Text>
        <Text style={styles.optionDesc}>指定フォルダの新しいファイルを一括解析</Text>
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
  loadingHint: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.xs },
});
