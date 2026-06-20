import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, Shadows, BorderRadius } from '../../src/constants/theme';
import { getChildren, deleteChild } from '../../src/db/children';
import { getFacilities, deleteFacility } from '../../src/db/facilities';
import type { Child, Facility } from '../../src/types';

export default function ChildrenScreen() {
  const [children, setChildren] = useState<Child[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setChildren(await getChildren());
      setFacilities(await getFacilities());
    } catch { /* */ }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const confirmDeleteChild = (child: Child) => {
    Alert.alert('削除確認', `${child.name}を削除しますか？\nこの操作は取り消せません。`, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: async () => { await deleteChild(child.id); loadData(); } },
    ]);
  };

  const confirmDeleteFacility = (facility: Facility) => {
    Alert.alert('削除確認', `${facility.name}を削除しますか？\nこの操作は取り消せません。`, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: async () => { await deleteFacility(facility.id); loadData(); } },
    ]);
  };

  const facilityTypeLabel = (type: string) => {
    if (type === 'nursery') return '保育園';
    if (type === 'school') return '学校';
    return '習い事';
  };

  const facilityTypeIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    if (type === 'nursery') return 'happy-outline';
    if (type === 'school') return 'school-outline';
    return 'musical-notes-outline';
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      {/* Children Section */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="people-outline" size={22} color={Colors.text} />
          <Text style={styles.sectionTitle}>子供</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/child-form')}
          activeOpacity={0.7}
          accessibilityLabel="子供を追加"
          accessibilityRole="button"
        >
          <Ionicons name="add-circle" size={28} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {children.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="person-add-outline" size={40} color={Colors.border} />
          <Text style={styles.emptyTitle}>子供の情報を登録しましょう</Text>
          <Text style={styles.emptyHint}>AIがプリントから子供に関する情報を正確に抽出できるようになります</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push('/child-form')}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={16} color={Colors.primary} />
            <Text style={styles.emptyButtonText}>追加する</Text>
          </TouchableOpacity>
        </View>
      ) : (
        children.map((child) => {
          const facility = facilities.find(f => f.id === child.facilityId);
          return (
            <View key={child.id} style={styles.card}>
              <View style={styles.cardIconArea}>
                <View style={[styles.avatarCircle, { backgroundColor: child.gender === 'male' ? '#E3F2FD' : '#FCE4EC' }]}>
                  <Ionicons
                    name={child.gender === 'male' ? 'male' : 'female'}
                    size={20}
                    color={child.gender === 'male' ? '#1976D2' : '#C2185B'}
                  />
                </View>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardName}>{child.name}</Text>
                <Text style={styles.cardDetail}>
                  {child.gender === 'male' ? '男の子' : '女の子'} / {child.birthdate}
                </Text>
                {child.className ? <Text style={styles.cardDetail}>クラス: {child.className}</Text> : null}
                {facility ? <Text style={styles.cardDetail}>{facility.name}</Text> : null}
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  onPress={() => router.push({ pathname: '/child-form', params: { id: String(child.id) } })}
                  accessibilityLabel={`${child.name}を編集`}
                  hitSlop={8}
                >
                  <Ionicons name="create-outline" size={22} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => confirmDeleteChild(child)}
                  accessibilityLabel={`${child.name}を削除`}
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={22} color={Colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}

      {/* Facilities Section */}
      <View style={[styles.sectionHeader, { marginTop: Spacing.xl }]}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="business-outline" size={22} color={Colors.text} />
          <Text style={styles.sectionTitle}>施設</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/facility-form')}
          activeOpacity={0.7}
          accessibilityLabel="施設を追加"
          accessibilityRole="button"
        >
          <Ionicons name="add-circle" size={28} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {facilities.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="business-outline" size={40} color={Colors.border} />
          <Text style={styles.emptyTitle}>施設を登録しましょう</Text>
          <Text style={styles.emptyHint}>保育園や習い事教室の情報を登録すると、プリントの発行元を正確に判別できます</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push('/facility-form')}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={16} color={Colors.primary} />
            <Text style={styles.emptyButtonText}>追加する</Text>
          </TouchableOpacity>
        </View>
      ) : (
        facilities.map((facility) => (
          <View key={facility.id} style={styles.card}>
            <View style={styles.cardIconArea}>
              <View style={[styles.avatarCircle, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name={facilityTypeIcon(facility.type)} size={20} color={Colors.success} />
              </View>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardName}>{facility.name}</Text>
              <Text style={styles.cardDetail}>{facilityTypeLabel(facility.type)}</Text>
              {facility.address ? <Text style={styles.cardDetail}>{facility.address}</Text> : null}
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity
                onPress={() => router.push({ pathname: '/facility-form', params: { id: String(facility.id) } })}
                accessibilityLabel={`${facility.name}を編集`}
                hitSlop={8}
              >
                <Ionicons name="create-outline" size={22} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => confirmDeleteFacility(facility)}
                accessibilityLabel={`${facility.name}を削除`}
                hitSlop={8}
              >
                <Ionicons name="trash-outline" size={22} color={Colors.danger} />
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sectionTitle: { fontSize: FontSize.xl, fontWeight: 'bold', color: Colors.text },
  emptyCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.xl,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed',
  },
  emptyTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textSecondary, marginTop: Spacing.sm },
  emptyHint: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.xs, textAlign: 'center', lineHeight: 20 },
  emptyButton: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    marginTop: Spacing.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.primary,
  },
  emptyButtonText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },
  card: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md,
    marginBottom: Spacing.sm, flexDirection: 'row', alignItems: 'center',
    ...Shadows.sm,
  },
  cardIconArea: { marginRight: Spacing.sm },
  avatarCircle: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardName: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.text },
  cardDetail: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 1 },
  cardActions: { flexDirection: 'row', gap: Spacing.md },
});
