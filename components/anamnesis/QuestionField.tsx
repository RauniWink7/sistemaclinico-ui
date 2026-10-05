import React, { useMemo } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { ThemeColors } from "../../constants/theme-palettes";
import { useTheme } from "../../contexts/ThemeContext";
import type {
  AnamnesisAnswerValue,
  AnamnesisQuestionApiItem,
} from "../../services/api";
import { getScaleValues, toggleOption } from "../../services/anamnesis";
import { DateField } from "../DateTimeField";

// ─── Campo de UMA pergunta da anamnese ───────────────────────────────────────
//
// Renderiza a entrada certa para cada tipo de pergunta e devolve o valor no
// formato que `validateAnswer` (services/anamnesis.ts) espera:
//   texto → string · escolha única → string · múltipla → string[]
//   sim/não → boolean · data → "AAAA-MM-DD" · escala → number
// Com `disabled` vira somente leitura (anamnese finalizada).

interface QuestionFieldProps {
  question: AnamnesisQuestionApiItem;
  value: AnamnesisAnswerValue | undefined;
  onChange: (value: AnamnesisAnswerValue) => void;
  error?: string | null;
  disabled?: boolean;
}

export default function QuestionField({
  question,
  value,
  onChange,
  error = null,
  disabled = false,
}: QuestionFieldProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const options = question.config.options ?? [];

  const choice = (label: string, active: boolean, onPress: () => void) => (
    <TouchableOpacity
      key={label}
      style={[styles.chip, active && styles.chipActive, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  const renderInput = () => {
    switch (question.type) {
      case "short_text":
      case "long_text": {
        const long = question.type === "long_text";
        return (
          <TextInput
            style={[styles.input, long && styles.inputLong, disabled && styles.disabled]}
            value={typeof value === "string" ? value : ""}
            onChangeText={onChange}
            editable={!disabled}
            multiline={long}
            textAlignVertical={long ? "top" : "center"}
            placeholder={disabled ? "" : "Digite a resposta"}
            placeholderTextColor={colors.placeholder}
          />
        );
      }

      case "single_choice":
        return (
          <View style={styles.row}>
            {options.map((option) =>
              choice(option, value === option, () => onChange(option)),
            )}
          </View>
        );

      case "multiple_choice":
        return (
          <View style={styles.row}>
            {options.map((option) =>
              choice(
                option,
                Array.isArray(value) && value.includes(option),
                () => onChange(toggleOption(value, option, options)),
              ),
            )}
          </View>
        );

      case "yes_no":
        return (
          <View style={styles.row}>
            {choice("Sim", value === true, () => onChange(true))}
            {choice("Não", value === false, () => onChange(false))}
          </View>
        );

      case "date":
        return (
          <DateField
            value={typeof value === "string" ? value : ""}
            onChange={onChange}
            disabled={disabled}
          />
        );

      case "scale": {
        const { min_label, max_label } = question.config;
        return (
          <View>
            <View style={styles.row}>
              {getScaleValues(question.config).map((n) =>
                choice(String(n), value === n, () => onChange(n)),
              )}
            </View>
            {(!!min_label || !!max_label) && (
              <View style={styles.scaleLabels}>
                <Text style={styles.hint}>{min_label}</Text>
                <Text style={styles.hint}>{max_label}</Text>
              </View>
            )}
          </View>
        );
      }

      default:
        return <Text style={styles.error}>Tipo de pergunta não suportado.</Text>;
    }
  };

  return (
    <View style={styles.group}>
      <Text style={styles.label}>
        {question.label}
        {question.required && <Text style={styles.required}> *</Text>}
      </Text>
      {!!question.help_text && <Text style={styles.hint}>{question.help_text}</Text>}
      <View style={styles.inputWrap}>{renderInput()}</View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    group: { marginTop: 18 },
    label: { color: colors.textDark, fontSize: 14, fontWeight: "700" },
    required: { color: "#b66b37" },
    hint: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
    inputWrap: { marginTop: 8 },
    input: {
      minHeight: 52,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.white,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.textDark,
    },
    inputLong: { minHeight: 110 },
    row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
      minWidth: 44,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 9,
      backgroundColor: colors.white,
    },
    chipActive: { backgroundColor: colors.primaryTint, borderColor: colors.primary },
    chipText: { color: colors.textDark, fontSize: 14 },
    chipTextActive: { color: colors.primary, fontWeight: "700" },
    disabled: { opacity: 0.7 },
    scaleLabels: { flexDirection: "row", justifyContent: "space-between" },
    error: { color: "#b66b37", fontSize: 12, marginTop: 6 },
  });
