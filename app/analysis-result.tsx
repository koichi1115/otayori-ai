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

export default function AnalysisResultScreen() {
  const { docId } = useLocalSearchParams<{ docId: string }>();
  const [doc, setDoc] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [todos, setTodos] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);

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
});
