import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import ScreenShell from "../../../components/anamnesis/ScreenShell";
import { ThemeColors } from "../../../constants/theme-palettes";
import { useTheme } from "../../../contexts/ThemeContext";
import {
  createAnamnesisTemplate,
  duplicateAnamnesisTemplate,
  getAnamnesisTemplate,
  updateAnamnesisTemplate,
} from "../../../services/api";
import {
  addQuestion,
  buildTemplatePayload,
  changeQuestionType,
  DraftQuestion,
  DraftTemplate,
  emptyDraft,
  moveQuestion,
  QUESTION_TYPE_LABELS,
  QUESTION_TYPES,
  removeQuestion,
  TemplateErrors,
  toDraft,
  validateTemplate,
} from "../../../services/anamnesisTemplate";
import { showAlert } from "../../../services/feedback";

// `id` = "novo" cria um modelo; qualquer outro valor edita o modelo existente.
// O modelo padrão do sistema abre somente leitura (só dá para duplicar).

const onlyDigits = (text: string) => text.replace(/[^0-9]/g, "");
const toInt = (text: string) => (text === "" ? undefined : Number(text));

export default function AnamnesisTemplateEditorScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "novo";

  const [draft, setDraft] = useState<DraftTemplate>(emptyDraft);
  const [readOnly, setReadOnly] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<(TemplateErrors & { hasErrors: boolean }) | null>(null);

  useEffect(() => {
    if (isNew || !id) return;
    let active = true;
    (async () => {
      const result = await getAnamnesisTemplate(id);
      if (!active) return;
      if (result.ok && result.data) {
        setDraft(toDraft(result.data));
        // Padrão e arquivado não são editáveis aqui.
        setReadOnly(result.data.is_system_default || result.data.is_archived);
      } else {
        showAlert("Erro", result.error || "Não foi possível carregar o modelo.");
        router.back();
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id, isNew]);

  const patch = (changes: Partial<DraftTemplate>) => {
    setDraft((current) => ({ ...current, ...changes }));
    setErrors(null);
  };

  const patchQuestion = (key: string, changes: Partial<DraftQuestion>) =>
    patch({
      questions: draft.questions.map((q) => (q.key === key ? { ...q, ...changes } : q)),
    });

  const patchConfig = (question: DraftQuestion, changes: DraftQuestion["config"]) =>
    patchQuestion(question.key, { config: { ...question.config, ...changes } });

  const save = async () => {
    const result = validateTemplate(draft);
    setErrors(result);
    if (result.hasErrors) {
      showAlert("Atenção", "Corrija os campos destacados para salvar.");
      return;
    }
    setSaving(true);
    const payload = buildTemplatePayload(draft);
    const response = isNew
      ? await createAnamnesisTemplate(payload)
      : await updateAnamnesisTemplate(id as string, payload);
    setSaving(false);
    if (response.ok) {
      showAlert("Sucesso", "Modelo salvo.");
      router.back();
    } else {
      showAlert("Erro", response.error || "Não foi possível salvar o modelo.");
    }
  };

  const duplicate = async () => {
    setSaving(true);
    const response = await duplicateAnamnesisTemplate(id as string);
    setSaving(false);
    if (response.ok && response.data) {
      showAlert("Sucesso", "Modelo duplicado. Você pode editar a cópia.");
      router.replace({
        pathname: "/modelo-anamnese/[id]",
        params: { id: response.data.id },
      } as any);
    } else {
      showAlert("Erro", response.error || "Não foi possível duplicar o modelo.");
    }
  };

  const renderQuestion = (question: DraftQuestion, index: number) => {
    const error = errors?.byQuestion[question.key];
    const options = question.config.options ?? [];
    const setOptions = (next: string[]) => patchConfig(question, { options: next });

    return (
      <View key={question.key} style={[styles.card, !!error && styles.cardError]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Pergunta {index + 1}</Text>
          {!readOnly && (
            <View style={styles.tools}>
              <TouchableOpacity
                disabled={index === 0}
                onPress={() => patch({ questions: moveQuestion(draft.questions, index, -1) })}
                accessibilityLabel="Mover para cima"
                style={index === 0 && styles.toolOff}
              >
                <Ionicons name="arrow-up-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                disabled={index === draft.questions.length - 1}
                onPress={() => patch({ questions: moveQuestion(draft.questions, index, 1) })}
                accessibilityLabel="Mover para baixo"
                style={index === draft.questions.length - 1 && styles.toolOff}
              >
                <Ionicons name="arrow-down-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => patch({ questions: removeQuestion(draft.questions, index) })}
                accessibilityLabel="Remover pergunta"
              >
                <Ionicons name="trash-outline" size={20} color="#b66b37" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Text style={styles.label}>Tipo</Text>
        <View style={styles.chips}>
          {QUESTION_TYPES.map((type) => {
            const active = question.type === type;
            return (
              <TouchableOpacity
                key={type}
                disabled={readOnly}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() =>
                  patch({
                    questions: draft.questions.map((q) =>
                      q.key === question.key ? changeQuestionType(q, type) : q,
                    ),
                  })
                }
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {QUESTION_TYPE_LABELS[type]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Enunciado</Text>
        <TextInput
          style={styles.input}
          value={question.label}
          onChangeText={(label) => patchQuestion(question.key, { label })}
          editable={!readOnly}
          maxLength={300}
          placeholder="Ex.: Qual o motivo da busca por atendimento?"
          placeholderTextColor={colors.placeholder}
        />

        <Text style={styles.label}>Texto de ajuda (opcional)</Text>
        <TextInput
          style={styles.input}
          value={question.help_text ?? ""}
          onChangeText={(help_text) => patchQuestion(question.key, { help_text })}
          editable={!readOnly}
          maxLength={300}
          placeholderTextColor={colors.placeholder}
        />

        {(question.type === "single_choice" || question.type === "multiple_choice") && (
          <View>
            <Text style={styles.label}>Opções</Text>
            {options.map((option, optionIndex) => (
              <View key={optionIndex} style={styles.optionRow}>
                <TextInput
                  style={[styles.input, styles.optionInput]}
                  value={option}
                  onChangeText={(text) =>
                    setOptions(options.map((o, i) => (i === optionIndex ? text : o)))
                  }
                  editable={!readOnly}
                  placeholder={`Opção ${optionIndex + 1}`}
                  placeholderTextColor={colors.placeholder}
                />
                {!readOnly && options.length > 2 && (
                  <TouchableOpacity
                    onPress={() => setOptions(options.filter((_, i) => i !== optionIndex))}
                    accessibilityLabel="Remover opção"
                  >
                    <Ionicons name="close-circle-outline" size={22} color="#b66b37" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {!readOnly && (
              <TouchableOpacity onPress={() => setOptions([...options, ""])}>
                <Text style={styles.link}>+ Adicionar opção</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {question.type === "scale" && (
          <View>
            <View style={styles.optionRow}>
              <View style={styles.half}>
                <Text style={styles.label}>Mínimo</Text>
                <TextInput
                  style={styles.input}
                  value={question.config.min === undefined ? "" : String(question.config.min)}
                  onChangeText={(t) => patchConfig(question, { min: toInt(onlyDigits(t)) })}
                  editable={!readOnly}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.half}>
                <Text style={styles.label}>Máximo</Text>
                <TextInput
                  style={styles.input}
                  value={question.config.max === undefined ? "" : String(question.config.max)}
                  onChangeText={(t) => patchConfig(question, { max: toInt(onlyDigits(t)) })}
                  editable={!readOnly}
                  keyboardType="number-pad"
                />
              </View>
            </View>
            <View style={styles.optionRow}>
              <View style={styles.half}>
                <Text style={styles.label}>Rótulo do mínimo</Text>
                <TextInput
                  style={styles.input}
                  value={question.config.min_label ?? ""}
                  onChangeText={(min_label) => patchConfig(question, { min_label })}
                  editable={!readOnly}
                  placeholder="Ex.: Nada"
                  placeholderTextColor={colors.placeholder}
                />
              </View>
              <View style={styles.half}>
                <Text style={styles.label}>Rótulo do máximo</Text>
                <TextInput
                  style={styles.input}
                  value={question.config.max_label ?? ""}
                  onChangeText={(max_label) => patchConfig(question, { max_label })}
                  editable={!readOnly}
                  placeholder="Ex.: Muito"
                  placeholderTextColor={colors.placeholder}
                />
              </View>
            </View>
          </View>
        )}

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Resposta obrigatória</Text>
          <Switch
            value={question.required}
            onValueChange={(required) => patchQuestion(question.key, { required })}
            disabled={readOnly}
            trackColor={{ true: colors.primary }}
          />
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}
      </View>
    );
  };

  return (
    <ScreenShell title={isNew ? "Novo modelo" : readOnly ? "Modelo" : "Editar modelo"}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          {readOnly && (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>
                Este modelo é somente leitura. Duplique para editar uma cópia sua.
              </Text>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => void duplicate()}
                disabled={saving}
              >
                <Text style={styles.primaryBtnText}>Duplicar modelo</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.label}>Título</Text>
          <TextInput
            style={[styles.input, !!errors?.title && styles.inputError]}
            value={draft.title}
            onChangeText={(title) => patch({ title })}
            editable={!readOnly}
            maxLength={150}
            placeholder="Ex.: Anamnese infantil"
            placeholderTextColor={colors.placeholder}
          />
          {!!errors?.title && <Text style={styles.error}>{errors.title}</Text>}

          <Text style={styles.label}>Descrição (opcional)</Text>
          <TextInput
            style={[styles.input, styles.inputLong]}
            value={draft.description}
            onChangeText={(description) => patch({ description })}
            editable={!readOnly}
            multiline
            textAlignVertical="top"
            placeholderTextColor={colors.placeholder}
          />

          <Text style={styles.sectionTitle}>Perguntas</Text>
          {draft.questions.map(renderQuestion)}
          {!!errors?.questions && <Text style={styles.error}>{errors.questions}</Text>}

          {!readOnly && (
            <>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => patch({ questions: addQuestion(draft.questions) })}
              >
                <Ionicons name="add-outline" size={18} color={colors.primary} />
                <Text style={styles.secondaryBtnText}>Adicionar pergunta</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryBtn, saving && styles.toolOff]}
                onPress={() => void save()}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.primaryBtnText}>Salvar modelo</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </>
      )}
    </ScreenShell>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    center: { paddingVertical: 48, alignItems: "center" },
    label: { color: colors.textDark, fontSize: 13, fontWeight: "700", marginTop: 14, marginBottom: 6 },
    input: {
      minHeight: 48,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.white,
      paddingHorizontal: 14,
      paddingVertical: 8,
      fontSize: 15,
      color: colors.textDark,
    },
    inputLong: { minHeight: 90 },
    inputError: { borderColor: "#b66b37" },
    sectionTitle: { color: colors.textDark, fontSize: 18, fontWeight: "800", marginTop: 26 },
    card: {
      backgroundColor: colors.white,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginTop: 14,
    },
    cardError: { borderColor: "#b66b37" },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    cardTitle: { color: colors.primary, fontSize: 14, fontWeight: "800" },
    tools: { flexDirection: "row", gap: 16, alignItems: "center" },
    toolOff: { opacity: 0.4 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 7,
      backgroundColor: colors.white,
    },
    chipActive: { backgroundColor: colors.primaryTint, borderColor: colors.primary },
    chipText: { color: colors.textDark, fontSize: 13 },
    chipTextActive: { color: colors.primary, fontWeight: "700" },
    optionRow: { flexDirection: "row", gap: 10, alignItems: "center", marginTop: 8 },
    optionInput: { flex: 1 },
    half: { flex: 1 },
    link: { color: colors.primary, fontSize: 13, fontWeight: "700", marginTop: 10 },
    switchRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 16,
    },
    switchLabel: { color: colors.textDark, fontSize: 14, fontWeight: "600" },
    error: { color: "#b66b37", fontSize: 12, marginTop: 6 },
    notice: {
      backgroundColor: colors.primaryTint,
      borderRadius: 14,
      padding: 14,
      marginBottom: 6,
      gap: 10,
    },
    noticeText: { color: colors.textDark, fontSize: 14 },
    secondaryBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      marginTop: 16,
      paddingVertical: 13,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    secondaryBtnText: { color: colors.primary, fontSize: 15, fontWeight: "700" },
    primaryBtn: {
      marginTop: 16,
      paddingVertical: 15,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: "center",
    },
    primaryBtnText: { color: colors.white, fontSize: 15, fontWeight: "800" },
  });
