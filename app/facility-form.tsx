import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, FontSize } from '../src/constants/theme';
import { getFacility, createFacility, updateFacility } from '../src/db/facilities';

const FACILITY_TYPES = [
  { label: '保育園', value: 'nursery' as const },
  { label: '学校', value: 'school' as const },
  { label: '習い事', value: 'lesson' as const },
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
    <ScrollView style={styles.container}>
      <Text style={styles.label}>施設名 *</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="例: ○○保育園" />

      <Text style={styles.label}>種別</Text>
      <View style={styles.segmented}>
        {FACILITY_TYPES.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.segment, type === opt.value && styles.segmentActive]}
            onPress={() => setType(opt.value)}
          >
            <Text style={[styles.segmentText, type === opt.value && styles.segmentTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>住所</Text>
      <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="例: 東京都○○区..." />

      <Text style={styles.label}>備考</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={notes}
        onChangeText={setNotes}
        placeholder="例: レッスン日時 毎週土曜 16:30〜17:00"
        multiline
        numberOfLines={4}
      />

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>{isEdit ? '更新' : '追加'}</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.lg },
  label: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.md, marginBottom: Spacing.xs },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: Spacing.sm,
    fontSize: FontSize.md, backgroundColor: Colors.surface,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  segmented: { flexDirection: 'row', gap: Spacing.xs },
  segment: {
    flex: 1, paddingVertical: Spacing.sm, borderRadius: 8, alignItems: 'center',
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  segmentActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  segmentText: { fontSize: FontSize.md, color: Colors.text },
  segmentTextActive: { color: '#fff', fontWeight: '600' },
  saveButton: {
    backgroundColor: Colors.primary, borderRadius: 10, padding: Spacing.md,
    alignItems: 'center', marginTop: Spacing.lg,
  },
  saveButtonText: { color: '#fff', fontSize: FontSize.lg, fontWeight: '600' },
});
