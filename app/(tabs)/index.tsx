import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Image } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, Shadows, BorderRadius } from '../../src/constants/theme';
import { getDatabase } from '../../src/db/database';
import { toggleTodoCompleted, toggleItemCompleted } from '../../src/db/documents';

interface PendingItem {
  id: number;
  title: string;
  targetPerson: string;
  dueDate: string | null;
  type: 'todo' | 'item';
  documentId: number;
  isCompleted: boolean;
  description: string;
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
  const [loading, setLoading] = useState(true);
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
          id: r.id, title: r.title, targetPerson: r.target_person, dueDate: r.due_date,
          type: 'todo' as const, documentId: r.document_id, isCompleted: !!r.is_completed, description: r.description || '',
        })),
        ...pendingItemsRaw.map((r: any) => ({
          id: r.id, title: `[持ち物] ${r.name}`, targetPerson: r.target_person, dueDate: r.due_date,
          type: 'item' as const, documentId: r.document_id, isCompleted: !!r.is_completed, description: r.description || '',
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
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Image source={require('../../assets/icon.png')} style={styles.headerIcon} />
          <View>
            <Text style={styles.headerTitle}>ぷりかん！</Text>
            <Text style={styles.headerTagline}>プリント管理をかんたんに</Text>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>処理済み: {data.totalDocs}件</Text>
      </View>

      <TouchableOpacity
        style={styles.scanButton}
        onPress={() => router.push('/(tabs)/scan')}
        activeOpacity={0.8}
        accessibilityLabel="プリントをスキャン"
        accessibilityRole="button"
      >
        <Ionicons name="camera" size={24} color="#fff" />
        <Text style={styles.scanButtonText}>プリントをスキャン</Text>
      </TouchableOpacity>

      {/* Pending TODOs & Items */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="checkbox-outline" size={20} color={Colors.text} />
          <Text style={styles.sectionTitle}>未完了のTODO・持ち物</Text>
        </View>
        {data.pendingItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={40} color={Colors.border} />
            <Text style={styles.emptyTitle}>すべて完了!</Text>
            <Text style={styles.emptyText}>未完了のTODO・持ち物はありません</Text>
          </View>
        ) : (
          (() => {
            // 日付ごとにグループ化
            const groups = new Map<string, PendingItem[]>();
            data.pendingItems.forEach((item) => {
              const key = item.dueDate || '期限なし';
              if (!groups.has(key)) groups.set(key, []);
              groups.get(key)!.push(item);
            });
            return Array.from(groups.entries()).map(([date, items]) => (
              <View key={date}>
                <View style={styles.dateGroup}>
                  <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
                  <Text style={styles.dateGroupText}>
                    {date === '期限なし' ? '期限なし' : date}
                  </Text>
                </View>
                {items.map((item) => (
                  <TouchableOpacity
                    key={`${item.type}-${item.id}`}
                    style={[styles.card, item.type === 'item' ? styles.itemCard : styles.todoCard]}
                    onPress={() => router.push({ pathname: '/analysis-result', params: { docId: String(item.documentId) } })}
                    activeOpacity={0.6}
                    accessibilityLabel={`${item.title}の詳細を表示`}
                  >
                    <TouchableOpacity
                      onPress={async (e) => {
                        e.stopPropagation?.();
                        if (item.type === 'todo') await toggleTodoCompleted(item.id);
                        else await toggleItemCompleted(item.id);
                        loadData();
                      }}
                      hitSlop={8}
                    >
                      <Ionicons
                        name={item.type === 'item' ? 'bag-handle-outline' : 'square-outline'}
                        size={22}
                        color={item.type === 'item' ? Colors.success : Colors.warning}
                      />
                    </TouchableOpacity>
                    <View style={styles.cardContent}>
                      <Text style={styles.cardTitle}>{item.title}</Text>
                      <Text style={styles.cardMeta}>
                        {item.targetPerson}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={Colors.border} />
                  </TouchableOpacity>
                ))}
              </View>
            ));
          })()
        )}
      </View>

      {/* Upcoming Events */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="calendar-outline" size={20} color={Colors.text} />
          <Text style={styles.sectionTitle}>今後のイベント</Text>
        </View>
        {data.upcomingEvents.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={40} color={Colors.border} />
            <Text style={styles.emptyTitle}>予定なし</Text>
            <Text style={styles.emptyText}>今後のイベントはありません</Text>
          </View>
        ) : (
          data.upcomingEvents.map((event) => (
            <View key={event.id} style={[styles.card, styles.eventCard]}>
              <Ionicons name="calendar" size={18} color={Colors.primary} />
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
        <View style={styles.sectionHeader}>
          <Ionicons name="document-text-outline" size={20} color={Colors.text} />
          <Text style={styles.sectionTitle}>最近のプリント</Text>
        </View>
        {data.recentDocs.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="documents-outline" size={40} color={Colors.border} />
            <Text style={styles.emptyTitle}>プリントなし</Text>
            <Text style={styles.emptyText}>スキャンタブからプリントを取り込みましょう</Text>
          </View>
        ) : (
          data.recentDocs.map((doc) => (
            <TouchableOpacity
              key={doc.id}
              style={styles.card}
              onPress={() => router.push({ pathname: '/analysis-result', params: { docId: String(doc.id) } })}
              activeOpacity={0.6}
              accessibilityLabel={`${doc.title}の詳細を表示`}
            >
              <Ionicons
                name={doc.category === 'action_required' ? 'alert-circle' : 'information-circle'}
                size={20}
                color={doc.category === 'action_required' ? '#8B0000' : '#003366'}
              />
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
              <Ionicons name="chevron-forward" size={16} color={Colors.border} />
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: { padding: Spacing.lg, paddingTop: Spacing.xl, backgroundColor: Colors.primary },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  headerIcon: { width: 56, height: 56, borderRadius: 14, backgroundColor: '#fff' },
  headerTitle: { fontSize: FontSize.xxl, fontWeight: 'bold', color: '#fff' },
  headerTagline: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  headerSubtitle: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.7)', marginTop: Spacing.sm },
  scanButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.secondary, margin: Spacing.md, padding: Spacing.md,
    borderRadius: BorderRadius.md, gap: Spacing.sm,
    ...Shadows.md,
  },
  scanButtonText: { color: '#fff', fontSize: FontSize.lg, fontWeight: '600' },
  section: { paddingHorizontal: Spacing.md, marginTop: Spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.text },
  emptyState: {
    alignItems: 'center', paddingVertical: Spacing.xl,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    ...Shadows.sm,
  },
  emptyTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textSecondary, marginTop: Spacing.sm },
  emptyText: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: Spacing.xs },
  card: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md,
    marginBottom: Spacing.sm, borderLeftWidth: 4, borderLeftColor: Colors.border,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    ...Shadows.sm,
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
  dateGroup: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    marginTop: Spacing.sm, marginBottom: Spacing.xs, paddingLeft: Spacing.xs,
  },
  dateGroupText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
});
