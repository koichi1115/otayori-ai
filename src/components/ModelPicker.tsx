import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Type, BorderRadius, BorderWidth, TouchTarget } from '../constants/theme';
import { buildModelOptions, retirementWarning } from '../services/llm-model';

interface Props {
  /** 設定 DB に保存されている claudeModel（未設定なら null） */
  value: string | null | undefined;
  onChange: (modelId: string) => void;
}

/** AI解析に使う Claude モデルの選択（最小 UI）。選択肢は src/constants/llm.ts のカタログ。 */
export function ModelPicker({ value, onChange }: Props) {
  const options = buildModelOptions(value);
  const selected = options.find((o) => o.selected);
  const warning = selected ? retirementWarning(selected.id) : null;

  return (
    <View>
      {options.map((o) => (
        <TouchableOpacity
          key={o.id}
          style={[styles.row, o.selected && styles.rowSelected]}
          onPress={() => onChange(o.id)}
          activeOpacity={0.7}
          accessibilityRole="radio"
          accessibilityState={{ selected: o.selected }}
          accessibilityLabel={o.label}
        >
          <Ionicons
            name={o.selected ? 'radio-button-on-outline' : 'radio-button-off-outline'}
            size={22}
            color={o.selected ? Colors.primary : Colors.textSecondary}
          />
          <View style={styles.body}>
            <Text style={styles.label}>{o.label}</Text>
            <Text style={styles.description}>{o.description}</Text>
          </View>
        </TouchableOpacity>
      ))}
      {warning && <Text style={styles.warning}>{warning}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: TouchTarget.min,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: BorderWidth.thin,
    borderColor: Colors.border,
    marginTop: Spacing.sm,
  },
  rowSelected: { borderColor: Colors.primary },
  body: { flex: 1 },
  label: { ...Type.bodyStrong, color: Colors.text },
  description: { ...Type.caption, color: Colors.textSecondary, marginTop: Spacing.xs },
  warning: { ...Type.caption, color: Colors.danger, marginTop: Spacing.sm },
});
