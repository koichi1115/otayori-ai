import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, FontSize } from '../src/constants/theme';
import { getChild, createChild, updateChild } from '../src/db/children';
import { getFacilities } from '../src/db/facilities';
import type { Facility } from '../src/types';

export default function ChildFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [birthdate, setBirthdate] = useState('');
  const [className, setClassName] = useState('');
  const [facilityId, setFacilityId] = useState<number | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);

  useEffect(() => {
    (async () => {
      setFacilities(await getFacilities());
      if (id) {
        const child = await getChild(Number(id));
        if (child) {
          setName(child.name);
          setGender(child.gender);
          setBirthdate(child.birthdate);
          setClassName(child.className);
          setFacilityId(child.facilityId);
        }
      }
    })();
  }, [id]);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('入力エラー', '名前を入力してください'); return; }
    if (!birthdate.trim()) { Alert.alert('入力エラー', '生年月日を入力してください'); return; }

    if (isEdit) {
      await updateChild(Number(id), { name, gender, birthdate, className, facilityId: facilityId ?? 0 });
    } else {
      await createChild({ name, gender, birthdate, className, facilityId: facilityId ?? 0 });
    }
    router.back();
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>名前 *</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="例: 太郎" />

      <Text style={styles.label}>性別</Text>
      <View style={styles.segmented}>
        <TouchableOpacity
          style={[styles.segment, gender === 'male' && styles.segmentActive]}
          onPress={() => setGender('male')}
        >
          <Text style={[styles.segmentText, gender === 'male' && styles.segmentTextActive]}>男の子</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, gender === 'female' && styles.segmentActive]}
          onPress={() => setGender('female')}
        >
          <Text style={[styles.segmentText, gender === 'female' && styles.segmentTextActive]}>女の子</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>生年月日 * (YYYY-MM-DD)</Text>
      <TextInput style={styles.input} value={birthdate} onChangeText={setBirthdate} placeholder="2020-04-01" keyboardType="numbers-and-punctuation" />

      <Text style={styles.label}>クラス名</Text>
      <TextInput style={styles.input} value={className} onChangeText={setClassName} placeholder="例: ぱんだ組" />

      <Text style={styles.label}>所属施設</Text>
      {facilities.length === 0 ? (
        <Text style={styles.hint}>先に施設を登録してください</Text>
      ) : (
        <View style={styles.facilityList}>
          {facilities.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[styles.facilityOption, facilityId === f.id && styles.facilityOptionActive]}
              onPress={() => setFacilityId(f.id)}
            >
              <Text style={[styles.facilityText, facilityId === f.id && styles.facilityTextActive]}>
                {f.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

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
  segmented: { flexDirection: 'row', gap: Spacing.xs },
  segment: {
    flex: 1, paddingVertical: Spacing.sm, borderRadius: 8, alignItems: 'center',
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  segmentActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  segmentText: { fontSize: FontSize.md, color: Colors.text },
  segmentTextActive: { color: '#fff', fontWeight: '600' },
  hint: { fontSize: FontSize.sm, color: Colors.textSecondary },
  facilityList: { gap: Spacing.xs },
  facilityOption: {
    padding: Spacing.sm, borderRadius: 8, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
  },
  facilityOptionActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  facilityText: { fontSize: FontSize.md, color: Colors.text },
  facilityTextActive: { color: Colors.primary, fontWeight: '600' },
  saveButton: {
    backgroundColor: Colors.primary, borderRadius: 10, padding: Spacing.md,
    alignItems: 'center', marginTop: Spacing.lg,
  },
  saveButtonText: { color: '#fff', fontSize: FontSize.lg, fontWeight: '600' },
});
