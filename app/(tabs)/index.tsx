import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize } from '../../src/constants/theme';
import { getDatabase } from '../../src/db/database';
import { toggleTodoCompleted, toggleItemCompleted } from '../../src/db/documents';

interface PendingItem {
  id: number;
  title: string;
  targetPerson: string;
  dueDate: string | null;
  type: 'todo' | 'item';
}

interface DashboardData {
  pendingItems: PendingItem[];
  upcomingEvents: { id: number; title: string; targetPerson: string; date: string; startTime: string | null }[];
  recentDocs: { id: number; title: string; category: string; createdAt: string }[];
  totalDocs: number;
}

export default function HomeScreen() {
  const [data, setData] = useState<DashboardData>({
    pendingItems: [],
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
      const pendingItemsRaw = await db.getAllAsync<any>(
        'SELECT * FROM items WHERE is_completed = 0 ORDER BY due_date ASC LIMIT 10'
      );
      const upcomingEvents = await db.getAllAsync<any>(
        'SELECT * FROM events WHERE date >= ? ORDER BY date ASC, start_time ASC LIMIT 10',
        [today]
      );
      const recentDocs = await db.getAllAsync<any>(
        'SELECT * FROM documents ORDER BY created_at DESC LIMIT 5'
      );
      const countResult = await db.getFirstAsync<any>('SELECT COUNT(*) as count FROM documents');

      const allPending: PendingItem[] = [
        ...pendingTodos.map((r: any) => ({
          id: r.id, title: r.title, targetPerson: r.target_person, dueDate: r.due_date, type: 'todo' as const,
        })),
        ...pendingItemsRaw.map((r: any) => ({
          id: r.id, title: `[持ち物] ${r.name}`, targetPerson: r.target_person, dueDate: r.due_date, type: 'item' as const,
        })),
      ].sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      });

      setData({
        pendingItems: allPending,
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

      {/* Pending TODOs & Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>未完了のTODO・持ち物</Text>
        {data.pendingItems.length === 0 ? (
          <Text style={styles.emptyText}>TODOはありません</Text>
        ) : (
          data.pendingItems.map((item) => (
            <TouchableOpacity
              key={`${item.type}-${item.id}`}
              style={[styles.card, item.type === 'item' ? styles.itemCard : styles.todoCard]}
              onPress={async () => {
                if (item.type === 'todo') await toggleTodoCompleted(item.id);
                else await toggleItemCompleted(item.id);
                loadData();
              }}
              activeOpacity={0.6}
            >
              <Ionicons
                name={item.type === 'item' ? 'bag-handle-outline' : 'square-outline'}
                size={22}
                color={item.type === 'item' ? Colors.success : Colors.warning}
              />
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardMeta}>
                  {item.targetPerson}{item.dueDate ? ` - 期限: ${item.dueDate}` : ''}
                </Text>
              </View>
            </TouchableOpacity>
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
  itemCard: { borderLeftColor: Colors.success },
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
