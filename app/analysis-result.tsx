import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, Shadows, BorderRadius } from '../src/constants/theme';
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
    Alert.alert('削除確認', `「${title}」を削除しますか？\nこの操作は取り消せません。`, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: async () => { await deleteEvent(id); loadData(); } },
    ]);
  };

  const handleDeleteTodo = (id: number, title: string) => {
    Alert.alert('削除確認', `「${title}」を削除しますか？\nこの操作は取り消せません。`, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: async () => { await deleteTodo(id); loadData(); } },
    ]);
  };

  const handleDeleteItem = (id: number, name: string) => {
    Alert.alert('削除確認', `「${name}」を削除しますか？\nこの操作は取り消せません。`, [
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
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleToggleCategory}
          activeOpacity={0.7}
          accessibilityLabel="カテゴリを変更"
          accessibilityRole="button"
        >
          <View style={[
            styles.badgeContainer,
            doc.category === 'action_required' ? styles.badgeActionBg : styles.badgeNoticeBg,
          ]}>
            <Ionicons
              name={doc.category === 'action_required' ? 'alert-circle' : 'information-circle'}
              size={14}
              color={doc.category === 'action_required' ? '#8B0000' : '#003366'}
            />
            <Text style={[
              styles.badge,
              doc.category === 'action_required' ? styles.badgeAction : styles.badgeNotice,
            ]}>
              {doc.category === 'action_required' ? '要対応' : 'お知らせ'}
            </Text>
            <Ionicons name="swap-horizontal" size={12} color={Colors.textSecondary} />
          </View>
        </TouchableOpacity>
        <Text style={styles.title}>{doc.title}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="business-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.meta}>{doc.source}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="document-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.meta}>{doc.file_name}</Text>
        </View>
      </View>

      {/* Summary */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="reader-outline" size={18} color={Colors.text} />
          <Text style={styles.sectionTitle}>要約</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryText}>{doc.summary}</Text>
        </View>
      </View>

      {/* Events */}
      {events.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar" size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>イベント ({events.length}件)</Text>
          </View>
          {events.map((e: any) => (
            <View key={e.id} style={[styles.card, styles.eventCard]}>
              <View style={styles.cardMain}>
                <Ionicons name="calendar" size={18} color={Colors.primary} />
                <View style={styles.cardContent}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardTitle}>{e.title}</Text>
                    {e.calendar_event_id && (
                      <View style={styles.registeredBadge}>
                        <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                      </View>
                    )}
                  </View>
                  <Text style={styles.cardMeta}>
                    {e.target_person} / {e.date}{e.start_time ? ` ${e.start_time}` : ''}
                    {e.end_time ? `~${e.end_time}` : ''}
                  </Text>
                  {e.location ? (
                    <View style={styles.locationRow}>
                      <Ionicons name="location-outline" size={12} color={Colors.textSecondary} />
                      <Text style={styles.cardMeta}>{e.location}</Text>
                    </View>
                  ) : null}
                  {e.description ? <Text style={styles.cardDesc}>{e.description}</Text> : null}
                </View>
              </View>
              <TouchableOpacity
                onPress={() => handleDeleteEvent(e.id, e.title)}
                hitSlop={8}
                accessibilityLabel={`${e.title}を削除`}
              >
                <Ionicons name="trash-outline" size={18} color={Colors.danger} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* TODOs */}
      {todos.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="checkbox-outline" size={18} color={Colors.warning} />
            <Text style={styles.sectionTitle}>TODO ({todos.length}件)</Text>
          </View>
          {todos.map((t: any) => (
            <View key={t.id} style={[styles.card, styles.todoCard]}>
              <View style={styles.cardMain}>
                <TouchableOpacity
                  onPress={async () => { await toggleTodoCompleted(t.id); loadData(); }}
                  hitSlop={8}
                  accessibilityLabel={t.is_completed ? `${t.title}を未完了に戻す` : `${t.title}を完了にする`}
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
              </View>
              <TouchableOpacity
                onPress={() => handleDeleteTodo(t.id, t.title)}
                hitSlop={8}
                accessibilityLabel={`${t.title}を削除`}
              >
                <Ionicons name="trash-outline" size={18} color={Colors.danger} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Items */}
      {items.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bag-handle-outline" size={18} color={Colors.success} />
            <Text style={styles.sectionTitle}>持ち物 ({items.length}件)</Text>
          </View>
          {items.map((i: any) => (
            <View key={i.id} style={[styles.card, styles.itemCard]}>
              <View style={styles.cardMain}>
                <TouchableOpacity
                  onPress={async () => { await toggleItemCompleted(i.id); loadData(); }}
                  hitSlop={8}
                  accessibilityLabel={i.is_completed ? `${i.name}を未完了に戻す` : `${i.name}を完了にする`}
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
              </View>
              <TouchableOpacity
                onPress={() => handleDeleteItem(i.id, i.name)}
                hitSlop={8}
                accessibilityLabel={`${i.name}を削除`}
              >
                <Ionicons name="trash-outline" size={18} color={Colors.danger} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* No extracted items */}
      {events.length === 0 && todos.length === 0 && items.length === 0 && (
        <View style={styles.section}>
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={40} color={Colors.border} />
            <Text style={styles.emptyTitle}>抽出された項目はありません</Text>
            <Text style={styles.emptyText}>このプリントからイベント・TODO・持ち物は検出されませんでした</Text>
          </View>
        </View>
      )}

      {/* Register to Google Calendar/Tasks */}
      {(events.length > 0 || todos.length > 0 || items.length > 0) && (
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.registerButton, !hasUnregisteredItems && styles.registerButtonDisabled]}
            onPress={handleRegisterAll}
            disabled={isRegistering || !hasUnregisteredItems}
            activeOpacity={0.7}
            accessibilityLabel={hasUnregisteredItems ? 'Googleカレンダー/タスクに一括登録' : '登録済み'}
            accessibilityRole="button"
          >
            {isRegistering ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons
                name={hasUnregisteredItems ? 'cloud-upload' : 'checkmark-circle'}
                size={20}
                color="#fff"
              />
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
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  loadingText: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.sm },
  header: {
    padding: Spacing.lg, backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  badgeContainer: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    gap: Spacing.xs, paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: BorderRadius.sm, marginBottom: Spacing.sm,
  },
  badgeActionBg: { backgroundColor: Colors.actionRequired },
  badgeNoticeBg: { backgroundColor: Colors.notice },
  badge: { fontSize: FontSize.sm, fontWeight: '600' },
  badgeAction: { color: '#8B0000' },
  badgeNotice: { color: '#003366' },
  title: { fontSize: FontSize.xl, fontWeight: 'bold', color: Colors.text, marginBottom: Spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: 2 },
  meta: { fontSize: FontSize.sm, color: Colors.textSecondary },
  section: { padding: Spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.text },
  summaryCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md,
    ...Shadows.sm,
  },
  card: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md,
    marginBottom: Spacing.sm, flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between',
    ...Shadows.sm,
  },
  cardMain: { flex: 1, flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  eventCard: { borderLeftWidth: 3, borderLeftColor: Colors.primary },
  todoCard: { borderLeftWidth: 3, borderLeftColor: Colors.warning },
  itemCard: { borderLeftWidth: 3, borderLeftColor: Colors.success },
  cardContent: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  cardTitle: { fontSize: FontSize.md, fontWeight: '500', color: Colors.text, flex: 1 },
  completedText: { textDecorationLine: 'line-through', color: Colors.textSecondary },
  cardMeta: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 1 },
  cardDesc: { fontSize: FontSize.sm, color: Colors.text, marginTop: Spacing.xs, lineHeight: 20 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 1 },
  registeredBadge: { marginLeft: Spacing.xs },
  summaryText: { fontSize: FontSize.md, color: Colors.text, lineHeight: 24 },
  emptyState: {
    alignItems: 'center', paddingVertical: Spacing.xl,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    ...Shadows.sm,
  },
  emptyTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textSecondary, marginTop: Spacing.sm },
  emptyText: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.xs, textAlign: 'center' },
  registerButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: BorderRadius.md, padding: Spacing.md,
    gap: Spacing.sm,
    ...Shadows.md,
  },
  registerButtonDisabled: { backgroundColor: Colors.textSecondary },
  registerButtonText: { color: '#fff', fontSize: FontSize.md, fontWeight: '600' },
});
