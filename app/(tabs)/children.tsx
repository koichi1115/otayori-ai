import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize } from '../../src/constants/theme';
import { getChildren, deleteChild } from '../../src/db/children';
import { getFacilities, deleteFacility } from '../../src/db/facilities';
import type { Child, Facility } from '../../src/types';

export default function ChildrenScreen() {
  const [children, setChildren] = useState<Child[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);

  const loadData = useCallback(async () => {
    try {
      setChildren(await getChildren());
      setFacilities(await getFacilities());
    } catch { /* */ }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const confirmDeleteChild = (child: Child) => {
    Alert.alert('削除確認', `${child.name}を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: async () => { await deleteChild(child.id); loadData(); } },
    ]);
  };

  const confirmDeleteFacility = (facility: Facility) => {
    Alert.alert('削除確認', `${facility.name}を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: async () => { await deleteFacility(facility.id); loadData(); } },
    ]);
  };

  const facilityTypeLabel = (type: string) => {
    if (type === 'nursery') return '保育園';
    if (type === 'school') return '学校';
    return '習い事';
  };

  return (
    <ScrollView style={styles.container}>
      {/* Children Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>子供</Text>
        <TouchableOpacity onPress={() => router.push('/child-form')}>
          <Ionicons name="add-circle" size={28} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {children.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>子供の情報を登録しましょう</Text>
          <Text style={styles.emptyHint}>AIがプリントから子供に関する情報を正確に抽出できるようになります</Text>
        </View>
      ) : (
        children.map((child) => {
          const facility = facilities.find(f => f.id === child.facilityId);
          return (
            <View key={child.id} style={styles.card}>
              <View style={styles.cardBody}>
                <Text style={styles.cardName}>{child.name}</Text>
                <Text style={styles.cardDetail}>
                  {child.gender === 'male' ? '男の子' : '女の子'} / {child.birthdate}
                </Text>
                {child.className ? <Text style={styles.cardDetail}>クラス: {child.className}</Text> : null}
                {facility ? <Text style={styles.cardDetail}>{facility.name}</Text> : null}
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => router.push({ pathname: '/child-form', params: { id: String(child.id) } })}>
                  <Ionicons name="create-outline" size={22} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => confirmDeleteChild(child)}>
                  <Ionicons name="trash-outline" size={22} color={Colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}

      {/* Facilities Section */}
      <View style={[styles.sectionHeader, { marginTop: Spacing.lg }]}>
        <Text style={styles.sectionTitle}>施設</Text>
        <TouchableOpacity onPress={() => router.push('/facility-form')}>
          <Ionicons name="add-circle" size={28} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {facilities.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>施設を登録しましょう</Text>
          <Text style={styles.emptyHint}>保育園や習い事教室の情報を登録すると、プリントの発行元を正確に判別できます</Text>
        </View>
      ) : (
        facilities.map((facility) => (
          <View key={facility.id} style={styles.card}>
            <View style={styles.cardBody}>
              <Text style={styles.cardName}>{facility.name}</Text>
              <Text style={styles.cardDetail}>{facilityTypeLabel(facility.type)}</Text>
              {facility.address ? <Text style={styles.cardDetail}>{facility.address}</Text> : null}
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity onPress={() => router.push({ pathname: '/facility-form', params: { id: String(facility.id) } })}>
                <Ionicons name="create-outline" size={22} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => confirmDeleteFacility(facility)}>
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
  sectionTitle: { fontSize: FontSize.xl, fontWeight: 'bold', color: Colors.text },
  emptyCard: {
    backgroundColor: Colors.surface, borderRadius: 10, padding: Spacing.lg,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed',
  },
  emptyText: { fontSize: FontSize.md, color: Colors.textSecondary },
  emptyHint: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.xs, textAlign: 'center' },
  card: {
    backgroundColor: Colors.surface, borderRadius: 10, padding: Spacing.md,
    marginBottom: Spacing.sm, flexDirection: 'row', alignItems: 'center',
  },
  cardBody: { flex: 1 },
  cardName: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.text },
  cardDetail: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 1 },
  cardActions: { flexDirection: 'row', gap: Spacing.md },
});
