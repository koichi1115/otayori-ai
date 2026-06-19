import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize } from '../src/constants/theme';
import { getDatabase } from '../src/db/database';
import type { AnalysisResult } from '../src/types';

export default function AnalysisResultScreen() {
  const { docId } = useLocalSearchParams<{ docId: string }>();
  const [doc, setDoc] = useState<any>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [todos, setTodos] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const db = await getDatabase();
      const docRow = await db.getFirstAsync<any>('SELECT * FROM documents WHERE id = ?', [Number(docId)]);
      if (docRow) {
        setDoc(docRow);
        try { setAnalysis(JSON.parse(docRow.raw_json)); } catch { /* */ }
      }
      setEvents(await db.getAllAsync<any>('SELECT * FROM events WHERE document_id = ?', [Number(docId)]));
      setTodos(await db.getAllAsync<any>('SELECT * FROM todos WHERE document_id = ?', [Number(docId)]));
      setItems(await db.getAllAsync<any>('SELECT * FROM items WHERE document_id = ?', [Number(docId)]));
    })();
  }, [docId]);

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
        <Text style={[
          styles.badge,
          doc.category === 'action_required' ? styles.badgeAction : styles.badgeNotice,
        ]}>
          {doc.category === 'action_required' ? '要対応' : 'お知らせ'}
        </Text>
        <Text style={styles.title}>{doc.title}</Text>
        <Text style={styles.meta}>発行元: {doc.source}</Text>
        <Text style={styles.meta}>推奨ファイル名: {doc.file_name}</Text>
      </View>

      {/* Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>要約</Text>
        <View style={styles.card}>
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
              <Ionicons name="checkbox-outline" size={18} color={Colors.warning} />
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{t.title}</Text>
                <Text style={styles.cardMeta}>
                  {t.target_person}{t.due_date ? ` / 期限: ${t.due_date}` : ''}
                </Text>
                {t.description ? <Text style={styles.cardDesc}>{t.description}</Text> : null}
              </View>
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
              <Ionicons name="bag-handle" size={18} color={Colors.success} />
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{i.name}</Text>
                <Text style={styles.cardMeta}>
                  {i.target_person}{i.due_date ? ` / 期限: ${i.due_date}` : ''}
                </Text>
                {i.description ? <Text style={styles.cardDesc}>{i.description}</Text> : null}
              </View>
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
    marginBottom: Spacing.sm, flexDirection: 'row', gap: Spacing.sm,
  },
  eventCard: { borderLeftWidth: 3, borderLeftColor: Colors.primary },
  todoCard: { borderLeftWidth: 3, borderLeftColor: Colors.warning },
  itemCard: { borderLeftWidth: 3, borderLeftColor: Colors.success },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: FontSize.md, fontWeight: '500', color: Colors.text },
  cardMeta: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 1 },
  cardDesc: { fontSize: FontSize.sm, color: Colors.text, marginTop: Spacing.xs },
  summaryText: { fontSize: FontSize.md, color: Colors.text, lineHeight: 24 },
});
