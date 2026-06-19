import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize } from '../src/constants/theme';
import { getDatabase } from '../src/db/database';
import {
  toggleTodoCompleted, toggleItemCompleted,
  deleteTodo, deleteItem, deleteEvent,
  updateDocumentCategory,
} from '../src/db/documents';
import type { AnalysisResult } from '../src/types';
import { createCalendarEvent } from '../src/services/google-calendar';
import { createTask } from '../src/services/google-tasks';

export default function AnalysisResultScreen() {
  const { docId } = useLocalSearchParams<{ docId: string }>();
  const [doc, setDoc] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [todos, setTodos] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);

  const loadData = useCallback(async () => {
    const db = await getDatabase();
    const docRow = await db.getFirstAsync<any>('SELECT * FROM documents WHERE id = ?', [Number(docId)]);
    if (docRow) setDoc(docRow);
    setEvents(await db.getAllAsync<any>('SELECT * FROM events WHERE document_id = ? ORDER BY date, start_time', [Number(docId)]));
    setTodos(await db.getAllAsync<any>('SELECT * FROM todos WHERE document_id = ?', [Number(docId)]));
    setItems(await db.getAllAsync<any>('SELECT * FROM items WHERE document_id = ?', [Number(docId)]));
  }, [docId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleToggleCategory = async () => {
    if (!doc) return;
    const newCat = doc.category === 'action_required' ? 'notice' : 'action_required';
    await updateDocumentCategory(doc.id, newCat);
    loadData();
  };

  const handleDeleteEvent = (id: number, title: string) => {
    Alert.alert('削除確認', `「${title}」を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: async () => { await deleteEvent(id); loadData(); } },
    ]);
  };

  const handleDeleteTodo = (id: number, title: string) => {
    Alert.alert('削除確認', `「${title}」を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: async () => { await deleteTodo(id); loadData(); } },
    ]);
  };

  const handleDeleteItem = (id: number, name: string) => {
    Alert.alert('削除確認', `「${name}」を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: async () => { await deleteItem(id); loadData(); } },
    ]);
  };

  const handleRegisterAll = async () => {
    if (!doc) return;
    setIsRegistering(true);
    const driveFileId = doc.drive_file_id || null;
    let successCount = 0;
    let errorCount = 0;

    try {
      // Register events to Google Calendar
      const db = await getDatabase();
      for (const e of events) {
        if (e.calendar_event_id) continue; // Already registered
        try {
          const calEventId = await createCalendarEvent({
            title: e.title,
            date: e.date,
            startTime: e.start_time,
            endTime: e.end_time,
            location: e.location,
            targetPerson: e.target_person,
            description: e.description,
            driveFileId,
            documentTitle: doc.title,
          });
          await db.runAsync('UPDATE events SET calendar_event_id = ? WHERE id = ?', [calEventId, e.id]);
          successCount++;
        } catch (err: any) {
          console.warn('Event registration failed:', err.message);
          errorCount++;
        }
      }

      // Register TODOs as Google Tasks
      for (const t of todos) {
        if (t.task_id) continue;
        try {
          const taskId = await createTask({
            title: t.title,
            dueDate: t.due_date,
            targetPerson: t.target_person,
            description: t.description,
            driveFileId,
          });
          await db.runAsync('UPDATE todos SET task_id = ? WHERE id = ?', [taskId, t.id]);
          successCount++;
        } catch (err: any) {
          console.warn('Todo registration failed:', err.message);
          errorCount++;
        }
      }

      // Register items as Google Tasks
      for (const i of items) {
        try {
          await createTask({
            title: i.name,
            dueDate: i.due_date,
            targetPerson: i.target_person,
            description: i.description,
            isItem: true,
            driveFileId,
          });
          successCount++;
        } catch (err: any) {
          console.warn('Item registration failed:', err.message);
          errorCount++;
        }
      }

      loadData();
      if (errorCount === 0) {
        Alert.alert('登録完了', `${successCount}件をGoogleカレンダー/タスクに登録しました`);
      } else {
        Alert.alert('一部登録失敗', `成功: ${successCount}件 / 失敗: ${errorCount}件\nGoogle連携の設定を確認してください`);
      }
    } catch (e: any) {
      Alert.alert('登録エラー', e.message);
    } finally {
      setIsRegistering(false);
    }
  };

  const hasUnregisteredItems =
    events.some((e: any) => !e.calendar_event_id) ||
    todos.some((t: any) => !t.task_id) ||
    items.length > 0;

  if (!doc) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleToggleCategory}>
          <Text style={[
            styles.badge,
            doc.category === 'action_required' ? styles.badgeAction : styles.badgeNotice,
          ]}>
            {doc.category === 'action_required' ? '要対応' : 'お知らせ'} (タップで変更)
          </Text>
        </TouchableOpacity>
        <Text style={styles.title}>{doc.title}</Text>
        <Text style={styles.meta}>発行元: {doc.source}</Text>
        <Text style={styles.meta}>推奨ファイル名: {doc.file_name}</Text>
      </View>

      {/* Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>要約</Text>
        <View style={[styles.card, { flexDirection: 'column' }]}>
          <Text style={styles.summaryText}>{doc.summary}</Text>
        </View>
      </View>

      {/* Events */}
      {events.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>イベント ({events.length}件)</Text>
          {events.map((e: any) => (
            <View key={e.id} style={[styles.card, styles.eventCard]}>
              <Ionicons name="calendar" size={18} color={Colors.primary} />
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{e.title}</Text>
                <Text style={styles.cardMeta}>
                  {e.target_person} / {e.date}{e.start_time ? ` ${e.start_time}` : ''}
                  {e.end_time ? `〜${e.end_time}` : ''}
                </Text>
                {e.location ? <Text style={styles.cardMeta}>場所: {e.location}</Text> : null}
                {e.description ? <Text style={styles.cardDesc}>{e.description}</Text> : null}
              </View>
              <TouchableOpacity onPress={() => handleDeleteEvent(e.id, e.title)} hitSlop={8}>
                <Ionicons name="trash-outline" size={18} color={Colors.danger} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* TODOs */}
      {todos.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TODO ({todos.length}件)</Text>
          {todos.map((t: any) => (
            <View key={t.id} style={[styles.card, styles.todoCard]}>
              <TouchableOpacity
                onPress={async () => { await toggleTodoCompleted(t.id); loadData(); }}
                hitSlop={8}
              >
                <Ionicons
                  name={t.is_completed ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={t.is_completed ? Colors.success : Colors.warning}
                />
              </TouchableOpacity>
              <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, t.is_completed && styles.completedText]}>{t.title}</Text>
                <Text style={styles.cardMeta}>
                  {t.target_person}{t.due_date ? ` / 期限: ${t.due_date}` : ''}
                </Text>
                {t.description ? <Text style={styles.cardDesc}>{t.description}</Text> : null}
              </View>
              <TouchableOpacity onPress={() => handleDeleteTodo(t.id, t.title)} hitSlop={8}>
                <Ionicons name="trash-outline" size={18} color={Colors.danger} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Items */}
      {items.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>持ち物 ({items.length}件)</Text>
          {items.map((i: any) => (
            <View key={i.id} style={[styles.card, styles.itemCard]}>
              <TouchableOpacity
                onPress={async () => { await toggleItemCompleted(i.id); loadData(); }}
                hitSlop={8}
              >
                <Ionicons
                  name={i.is_completed ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={i.is_completed ? Colors.success : Colors.success}
                />
              </TouchableOpacity>
              <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, i.is_completed && styles.completedText]}>{i.name}</Text>
                <Text style={styles.cardMeta}>
                  {i.target_person}{i.due_date ? ` / 期限: ${i.due_date}` : ''}
                </Text>
                {i.description ? <Text style={styles.cardDesc}>{i.description}</Text> : null}
              </View>
              <TouchableOpacity onPress={() => handleDeleteItem(i.id, i.name)} hitSlop={8}>
                <Ionicons name="trash-outline" size={18} color={Colors.danger} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Register to Google Calendar/Tasks */}
      {(events.length > 0 || todos.length > 0 || items.length > 0) && (
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.registerButton, !hasUnregisteredItems && styles.registerButtonDisabled]}
            onPress={handleRegisterAll}
            disabled={isRegistering || !hasUnregisteredItems}
          >
            {isRegistering ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="calendar" size={20} color="#fff" />
            )}
            <Text style={styles.registerButtonText}>
              {hasUnregisteredItems
                ? 'Googleカレンダー/タスクに一括登録'
                : '登録済み'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: Spacing.lg, backgroundColor: Colors.surface },
  badge: {
    fontSize: FontSize.sm, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 4, overflow: 'hidden', alignSelf: 'flex-start', marginBottom: Spacing.sm,
  },
  badgeAction: { backgroundColor: Colors.actionRequired, color: '#8B0000' },
  badgeNotice: { backgroundColor: Colors.notice, color: '#003366' },
  title: { fontSize: FontSize.xl, fontWeight: 'bold', color: Colors.text },
  meta: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  section: { padding: Spacing.md },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.text, marginBottom: Spacing.sm },
  card: {
    backgroundColor: Colors.surface, borderRadius: 10, padding: Spacing.md,
    marginBottom: Spacing.sm, flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start',
  },
  eventCard: { borderLeftWidth: 3, borderLeftColor: Colors.primary },
  todoCard: { borderLeftWidth: 3, borderLeftColor: Colors.warning },
  itemCard: { borderLeftWidth: 3, borderLeftColor: Colors.success },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: FontSize.md, fontWeight: '500', color: Colors.text },
  completedText: { textDecorationLine: 'line-through', color: Colors.textSecondary },
  cardMeta: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 1 },
  cardDesc: { fontSize: FontSize.sm, color: Colors.text, marginTop: Spacing.xs },
  summaryText: { fontSize: FontSize.md, color: Colors.text, lineHeight: 24 },
  registerButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: 12, padding: Spacing.md,
    gap: Spacing.sm,
  },
  registerButtonDisabled: { backgroundColor: Colors.textSecondary },
  registerButtonText: { color: '#fff', fontSize: FontSize.md, fontWeight: '600' },
});
