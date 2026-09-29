import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';
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
          <Text style={styles.label}>{o.label}</Text>
          <Text style={styles.description}>{o.description}</Text>
        </TouchableOpacity>
      ))}
      {warning && <Text style={styles.warning}>{warning}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.sm,
  },
  rowSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  label: { fontSize: FontSize.md, color: Colors.text, fontWeight: '600' },
  description: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.xs },
  warning: { fontSize: FontSize.sm, color: Colors.danger, marginTop: Spacing.sm },
});
