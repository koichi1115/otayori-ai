import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, Spacing, FontSize, Shadows, BorderRadius } from '../src/constants/theme';
import { getChild, createChild, updateChild } from '../src/db/children';
import { getFacilities } from '../src/db/facilities';
import type { Facility } from '../src/types';

export default function ChildFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [birthdate, setBirthdate] = useState('');
  const [birthdateDate, setBirthdateDate] = useState(new Date(2020, 3, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);
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
          if (child.birthdate) {
            const parts = child.birthdate.split('-');
            setBirthdateDate(new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
          }
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
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text style={styles.label}>名前 *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="例: 太郎"
          placeholderTextColor={Colors.textSecondary}
          accessibilityLabel="子供の名前"
        />

        <Text style={styles.label}>性別</Text>
        <View style={styles.segmented}>
          <TouchableOpacity
            style={[styles.segment, gender === 'male' && styles.segmentActiveMale]}
            onPress={() => setGender('male')}
            activeOpacity={0.7}
            accessibilityLabel="男の子"
            accessibilityRole="button"
          >
            <Ionicons name="male" size={16} color={gender === 'male' ? '#fff' : '#1976D2'} />
            <Text style={[styles.segmentText, gender === 'male' && styles.segmentTextActive]}>男の子</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segment, gender === 'female' && styles.segmentActiveFemale]}
            onPress={() => setGender('female')}
            activeOpacity={0.7}
            accessibilityLabel="女の子"
            accessibilityRole="button"
          >
            <Ionicons name="female" size={16} color={gender === 'female' ? '#fff' : '#C2185B'} />
            <Text style={[styles.segmentText, gender === 'female' && styles.segmentTextActive]}>女の子</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>生年月日 *</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.7}
          accessibilityLabel="生年月日を選択"
        >
          <Ionicons name="calendar-outline" size={18} color={Colors.textSecondary} />
          <Text style={[styles.dateButtonText, !birthdate && { color: Colors.textSecondary }]}>
            {birthdate || '生年月日を選択'}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={birthdateDate}
            mode="date"
            display="spinner"
            locale="ja"
            maximumDate={new Date()}
            minimumDate={new Date(2000, 0, 1)}
            onChange={(_, selectedDate) => {
              if (Platform.OS === 'android') setShowDatePicker(false);
              if (selectedDate) {
                setBirthdateDate(selectedDate);
                const y = selectedDate.getFullYear();
                const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
                const d = String(selectedDate.getDate()).padStart(2, '0');
                setBirthdate(`${y}-${m}-${d}`);
              }
            }}
          />
        )}
        {showDatePicker && Platform.OS === 'ios' && (
          <TouchableOpacity
            style={styles.dateConfirmButton}
            onPress={() => setShowDatePicker(false)}
            activeOpacity={0.7}
          >
            <Text style={styles.dateConfirmText}>決定</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.label}>クラス名</Text>
        <TextInput
          style={styles.input}
          value={className}
          onChangeText={setClassName}
          placeholder="例: ぱんだ組"
          placeholderTextColor={Colors.textSecondary}
          accessibilityLabel="クラス名"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>所属施設</Text>
        {facilities.length === 0 ? (
          <View style={styles.noFacility}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.textSecondary} />
            <Text style={styles.hint}>先に施設を登録してください</Text>
          </View>
        ) : (
          <View style={styles.facilityList}>
            {facilities.map((f) => (
              <TouchableOpacity
                key={f.id}
                style={[styles.facilityOption, facilityId === f.id && styles.facilityOptionActive]}
                onPress={() => setFacilityId(facilityId === f.id ? null : f.id)}
                activeOpacity={0.7}
                accessibilityLabel={`${f.name}を選択`}
                accessibilityRole="button"
              >
                <Ionicons
                  name={facilityId === f.id ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={facilityId === f.id ? Colors.primary : Colors.textSecondary}
                />
                <Text style={[styles.facilityText, facilityId === f.id && styles.facilityTextActive]}>
                  {f.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleSave}
        activeOpacity={0.7}
        accessibilityLabel={isEdit ? '子供の情報を更新' : '子供を追加'}
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
  segmented: { flexDirection: 'row', gap: Spacing.sm },
  segment: {
    flex: 1, flexDirection: 'row', paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm,
    alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  segmentActiveMale: { backgroundColor: '#1976D2', borderColor: '#1976D2' },
  segmentActiveFemale: { backgroundColor: '#C2185B', borderColor: '#C2185B' },
  segmentText: { fontSize: FontSize.md, color: Colors.text },
  segmentTextActive: { color: '#fff', fontWeight: '600' },
  noFacility: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.sm },
  hint: { fontSize: FontSize.sm, color: Colors.textSecondary },
  facilityList: { gap: Spacing.xs },
  facilityOption: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.sm, borderRadius: BorderRadius.sm, backgroundColor: Colors.background,
    borderWidth: 1, borderColor: Colors.border,
  },
  facilityOptionActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  facilityText: { fontSize: FontSize.md, color: Colors.text },
  facilityTextActive: { color: Colors.primary, fontWeight: '600' },
  saveButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary, borderRadius: BorderRadius.md, padding: Spacing.md,
    marginTop: Spacing.sm,
    ...Shadows.md,
  },
  saveButtonText: { color: '#fff', fontSize: FontSize.lg, fontWeight: '600' },
  dateButton: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, padding: Spacing.sm,
    backgroundColor: Colors.background,
  },
  dateButtonText: { fontSize: FontSize.md, color: Colors.text },
  dateConfirmButton: {
    alignSelf: 'flex-end', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    marginTop: Spacing.xs,
  },
  dateConfirmText: { fontSize: FontSize.md, color: Colors.primary, fontWeight: '600' },
});
