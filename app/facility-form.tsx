import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, Shadows, BorderRadius } from '../src/constants/theme';
import { getFacility, createFacility, updateFacility } from '../src/db/facilities';

const FACILITY_TYPES: { label: string; value: 'nursery' | 'school' | 'lesson'; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: '保育園', value: 'nursery', icon: 'happy-outline' },
  { label: '学校', value: 'school', icon: 'school-outline' },
  { label: '習い事', value: 'lesson', icon: 'musical-notes-outline' },
];

export default function FacilityFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const [name, setName] = useState('');
  const [type, setType] = useState<'nursery' | 'school' | 'lesson'>('nursery');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (id) {
      (async () => {
        const facility = await getFacility(Number(id));
        if (facility) {
          setName(facility.name);
          setType(facility.type);
          setAddress(facility.address);
          setNotes(facility.notes);
        }
      })();
    }
  }, [id]);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('入力エラー', '施設名を入力してください'); return; }

    if (isEdit) {
      await updateFacility(Number(id), { name, type, address, notes });
    } else {
      await createFacility({ name, type, address, notes });
    }
    router.back();
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text style={styles.label}>施設名 *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="例: ○○保育園"
          placeholderTextColor={Colors.textSecondary}
          accessibilityLabel="施設名"
        />

        <Text style={styles.label}>種別</Text>
        <View style={styles.segmented}>
          {FACILITY_TYPES.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.segment, type === opt.value && styles.segmentActive]}
              onPress={() => setType(opt.value)}
              activeOpacity={0.7}
              accessibilityLabel={`${opt.label}を選択`}
              accessibilityRole="button"
            >
              <Ionicons
                name={opt.icon}
                size={18}
                color={type === opt.value ? '#fff' : Colors.text}
              />
              <Text style={[styles.segmentText, type === opt.value && styles.segmentTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>住所</Text>
        <TextInput
          style={styles.input}
          value={address}
          onChangeText={setAddress}
          placeholder="例: 東京都○○区..."
          placeholderTextColor={Colors.textSecondary}
          accessibilityLabel="施設の住所"
        />

        <Text style={styles.label}>備考</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="例: レッスン日時 毎週土曜 16:30~17:00"
          placeholderTextColor={Colors.textSecondary}
          multiline
          numberOfLines={4}
          accessibilityLabel="備考"
        />
      </View>

      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleSave}
        activeOpacity={0.7}
        accessibilityLabel={isEdit ? '施設情報を更新' : '施設を追加'}
        accessibilityRole="button"
      >
        <Ionicons name={isEdit ? 'checkmark' : 'add'} size={20} color="#fff" />
        <Text style={styles.saveButtonText}>{isEdit ? '更新' : '追加'}</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.md },
  card: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  label: { fontSize: FontSize.sm, fontWeight: '500', color: Colors.textSecondary, marginTop: Spacing.md, marginBottom: Spacing.xs },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, padding: Spacing.sm,
    fontSize: FontSize.md, backgroundColor: Colors.background, color: Colors.text,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  segmented: { flexDirection: 'row', gap: Spacing.xs },
  segment: {
    flex: 1, flexDirection: 'row', paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm,
    alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  segmentActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  segmentText: { fontSize: FontSize.md, color: Colors.text },
  segmentTextActive: { color: '#fff', fontWeight: '600' },
  saveButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary, borderRadius: BorderRadius.md, padding: Spacing.md,
    marginTop: Spacing.sm,
    ...Shadows.md,
  },
  saveButtonText: { color: '#fff', fontSize: FontSize.lg, fontWeight: '600' },
});
