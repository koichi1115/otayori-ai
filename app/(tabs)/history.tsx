import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Colors, Spacing, FontSize } from '../../src/constants/theme';
import { getDatabase } from '../../src/db/database';

interface DocRow {
  id: number;
  title: string;
  source: string;
  category: string;
  createdAt: string;
}

export default function HistoryScreen() {
  const [docs, setDocs] = useState<DocRow[]>([]);

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
        <Text style={styles.date}>{item.createdAt?.split('T')[0] || ''}</Text>
      </View>
      <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.source}>{item.source}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {docs.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>まだ処理済みプリントがありません</Text>
          <Text style={styles.emptyHint}>スキャンタブからプリントを取り込みましょう</Text>
        </View>
      ) : (
        <FlatList
          data={docs}
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
