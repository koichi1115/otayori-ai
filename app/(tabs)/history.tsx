import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl, ActivityIndicator } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, Shadows, BorderRadius } from '../../src/constants/theme';
import { getDatabase } from '../../src/db/database';

interface DocRow {
  id: number;
  title: string;
  source: string;
  category: string;
  createdAt: string;
}

type FilterCategory = 'all' | 'action_required' | 'notice';

export default function HistoryScreen() {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<any>(
        'SELECT id, title, source, category, created_at FROM documents ORDER BY created_at DESC'
      );
      setDocs(rows.map((r: any) => ({
        id: r.id, title: r.title || '(無題)', source: r.source,
        category: r.category, createdAt: r.created_at,
      })));
    } catch { /* */ } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filteredDocs = docs.filter((doc) => {
    if (filterCategory !== 'all' && doc.category !== filterCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return doc.title.toLowerCase().includes(q) || doc.source.toLowerCase().includes(q);
    }
    return true;
  });

  const renderItem = ({ item }: { item: DocRow }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: '/analysis-result', params: { docId: String(item.id) } })}
      activeOpacity={0.6}
      accessibilityLabel={`${item.title}の詳細を表示`}
    >
      <View style={styles.cardLeft}>
        <Ionicons
          name={item.category === 'action_required' ? 'alert-circle' : 'information-circle'}
          size={24}
          color={item.category === 'action_required' ? '#C0392B' : Colors.primary}
        />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={[
            styles.badge,
            item.category === 'action_required' ? styles.badgeAction : styles.badgeNotice,
          ]}>
            {item.category === 'action_required' ? '要対応' : 'お知らせ'}
          </Text>
          <Text style={styles.date}>{item.createdAt?.split(' ')[0] || ''}</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.source}>{item.source}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.border} style={{ alignSelf: 'center' }} />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="タイトル・発行元で検索"
            placeholderTextColor={Colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
            accessibilityLabel="プリントを検索"
          />
        </View>
      </View>

      {/* Category Filter */}
      <View style={styles.filterRow}>
        {([
          { key: 'all', label: 'すべて', icon: 'list' as const },
          { key: 'action_required', label: '要対応', icon: 'alert-circle-outline' as const },
          { key: 'notice', label: 'お知らせ', icon: 'information-circle-outline' as const },
        ] as const).map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filterCategory === f.key && styles.filterChipActive]}
            onPress={() => setFilterCategory(f.key)}
            activeOpacity={0.7}
            accessibilityLabel={`${f.label}でフィルタ`}
            accessibilityRole="button"
          >
            <Ionicons
              name={f.icon}
              size={14}
              color={filterCategory === f.key ? '#fff' : Colors.text}
            />
            <Text style={[styles.filterText, filterCategory === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filteredDocs.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons
            name={docs.length === 0 ? 'documents-outline' : 'search-outline'}
            size={48}
            color={Colors.border}
          />
          <Text style={styles.emptyTitle}>
            {docs.length === 0 ? 'プリントがありません' : '該当するプリントがありません'}
          </Text>
          <Text style={styles.emptyText}>
            {docs.length === 0 ? 'スキャンタブからプリントを取り込みましょう' : '検索条件を変更してみてください'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredDocs}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: Spacing.md }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  searchContainer: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs,
    gap: Spacing.xs, borderWidth: 1, borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontSize: FontSize.md, paddingVertical: Spacing.xs, color: Colors.text },
  filterRow: {
    flexDirection: 'row', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: FontSize.sm, color: Colors.text },
  filterTextActive: { color: '#fff', fontWeight: '600' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.lg },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.textSecondary, marginTop: Spacing.md },
  emptyText: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.xs, textAlign: 'center' },
  card: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md,
    marginBottom: Spacing.sm, flexDirection: 'row', gap: Spacing.sm,
    ...Shadows.sm,
  },
  cardLeft: { justifyContent: 'center' },
  cardBody: { flex: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  badge: {
    fontSize: FontSize.xs, fontWeight: '600', paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4, overflow: 'hidden',
  },
  badgeAction: { backgroundColor: Colors.actionRequired, color: '#8B0000' },
  badgeNotice: { backgroundColor: Colors.notice, color: '#003366' },
  date: { fontSize: FontSize.xs, color: Colors.textSecondary },
  title: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  source: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
});
