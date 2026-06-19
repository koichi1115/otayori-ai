import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize } from '../../src/constants/theme';
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

  useFocusEffect(useCallback(() => {
    (async () => {
      try {
        const db = await getDatabase();
        const rows = await db.getAllAsync<any>(
          'SELECT id, title, source, category, created_at FROM documents ORDER BY created_at DESC'
        );
        setDocs(rows.map((r: any) => ({
          id: r.id, title: r.title || '(無題)', source: r.source,
          category: r.category, createdAt: r.created_at,
        })));
      } catch { /* */ }
    })();
  }, []));

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
    >
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
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="タイトル・発行元で検索"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* Category Filter */}
      <View style={styles.filterRow}>
        {([
          { key: 'all', label: 'すべて' },
          { key: 'action_required', label: '要対応' },
          { key: 'notice', label: 'お知らせ' },
        ] as const).map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filterCategory === f.key && styles.filterChipActive]}
            onPress={() => setFilterCategory(f.key)}
          >
            <Text style={[styles.filterText, filterCategory === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filteredDocs.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            {docs.length === 0 ? 'まだ処理済みプリントがありません' : '条件に一致するプリントがありません'}
          </Text>
          {docs.length === 0 && <Text style={styles.emptyHint}>スキャンタブからプリントを取り込みましょう</Text>}
        </View>
      ) : (
        <FlatList
          data={filteredDocs}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: Spacing.md }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchContainer: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: 10, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs,
    gap: Spacing.xs, borderWidth: 1, borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontSize: FontSize.md, paddingVertical: Spacing.xs },
  filterRow: {
    flexDirection: 'row', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: FontSize.sm, color: Colors.text },
  filterTextActive: { color: '#fff', fontWeight: '600' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: FontSize.lg, color: Colors.textSecondary },
  emptyHint: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.xs },
  card: {
    backgroundColor: Colors.surface, borderRadius: 10, padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
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
