import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize } from '../../src/constants/theme';
import { getDatabase } from '../../src/db/database';

interface DashboardData {
  pendingTodos: { id: number; title: string; targetPerson: string; dueDate: string | null }[];
  upcomingEvents: { id: number; title: string; targetPerson: string; date: string; startTime: string | null }[];
  recentDocs: { id: number; title: string; category: string; createdAt: string }[];
  totalDocs: number;
}

export default function HomeScreen() {
  const [data, setData] = useState<DashboardData>({
    pendingTodos: [],
    upcomingEvents: [],
    recentDocs: [],
    totalDocs: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const db = await getDatabase();
      const today = new Date().toISOString().split('T')[0];

      const pendingTodos = await db.getAllAsync<any>(
        'SELECT * FROM todos WHERE is_completed = 0 ORDER BY due_date ASC LIMIT 10'
      );
      const upcomingEvents = await db.getAllAsync<any>(
        'SELECT * FROM events WHERE date >= ? ORDER BY date ASC, start_time ASC LIMIT 10',
        [today]
      );
      const recentDocs = await db.getAllAsync<any>(
        'SELECT * FROM documents ORDER BY created_at DESC LIMIT 5'
      );
      const countResult = await db.getFirstAsync<any>('SELECT COUNT(*) as count FROM documents');

      setData({
        pendingTodos: pendingTodos.map((r: any) => ({
          id: r.id, title: r.title, targetPerson: r.target_person, dueDate: r.due_date,
        })),
        upcomingEvents: upcomingEvents.map((r: any) => ({
          id: r.id, title: r.title, targetPerson: r.target_person, date: r.date, startTime: r.start_time,
        })),
        recentDocs: recentDocs.map((r: any) => ({
          id: r.id, title: r.title || r.file_name, category: r.category, createdAt: r.created_at,
        })),
        totalDocs: countResult?.count ?? 0,
      });
    } catch {
      // DB not initialized yet
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>おたよりAI</Text>
        <Text style={styles.headerSubtitle}>処理済み: {data.totalDocs}件</Text>
      </View>

      <TouchableOpacity style={styles.scanButton} onPress={() => router.push('/(tabs)/scan')}>
        <Ionicons name="camera" size={24} color="#fff" />
        <Text style={styles.scanButtonText}>プリントをスキャン</Text>
      </TouchableOpacity>

      {/* Pending TODOs */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>未完了のTODO</Text>
        {data.pendingTodos.length === 0 ? (
          <Text style={styles.emptyText}>TODOはありません</Text>
        ) : (
          data.pendingTodos.map((todo) => (
            <View key={todo.id} style={[styles.card, styles.todoCard]}>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{todo.title}</Text>
                <Text style={styles.cardMeta}>
                  {todo.targetPerson}{todo.dueDate ? ` - 期限: ${todo.dueDate}` : ''}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Upcoming Events */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>今後のイベント</Text>
        {data.upcomingEvents.length === 0 ? (
          <Text style={styles.emptyText}>イベントはありません</Text>
        ) : (
          data.upcomingEvents.map((event) => (
            <View key={event.id} style={[styles.card, styles.eventCard]}>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{event.title}</Text>
                <Text style={styles.cardMeta}>
                  {event.targetPerson} - {event.date}{event.startTime ? ` ${event.startTime}` : ''}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Recent Documents */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>最近のプリント</Text>
        {data.recentDocs.length === 0 ? (
          <Text style={styles.emptyText}>まだプリントが登録されていません</Text>
        ) : (
          data.recentDocs.map((doc) => (
            <View key={doc.id} style={styles.card}>
              <View style={styles.cardContent}>
                <View style={styles.cardRow}>
                  <Text style={[
                    styles.badge,
                    doc.category === 'action_required' ? styles.badgeAction : styles.badgeNotice,
                  ]}>
                    {doc.category === 'action_required' ? '要対応' : 'お知らせ'}
                  </Text>
                  <Text style={styles.cardTitle} numberOfLines={1}>{doc.title}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: Spacing.lg, paddingTop: Spacing.xl, backgroundColor: Colors.primary },
  headerTitle: { fontSize: FontSize.xxl, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.8)', marginTop: Spacing.xs },
  scanButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.secondary, margin: Spacing.md, padding: Spacing.md,
    borderRadius: 12, gap: Spacing.sm,
  },
  scanButtonText: { color: '#fff', fontSize: FontSize.lg, fontWeight: '600' },
  section: { paddingHorizontal: Spacing.md, marginTop: Spacing.md },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.text, marginBottom: Spacing.sm },
  emptyText: { color: Colors.textSecondary, fontSize: FontSize.md, paddingVertical: Spacing.sm },
  card: {
    backgroundColor: Colors.surface, borderRadius: 10, padding: Spacing.md,
    marginBottom: Spacing.sm, borderLeftWidth: 4, borderLeftColor: Colors.border,
  },
  todoCard: { borderLeftColor: Colors.warning },
  eventCard: { borderLeftColor: Colors.primary },
  cardContent: { flex: 1 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cardTitle: { fontSize: FontSize.md, fontWeight: '500', color: Colors.text, flex: 1 },
  cardMeta: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  badge: {
    fontSize: FontSize.xs, fontWeight: '600', paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4, overflow: 'hidden',
  },
  badgeAction: { backgroundColor: Colors.actionRequired, color: '#8B0000' },
  badgeNotice: { backgroundColor: Colors.notice, color: '#003366' },
});
