import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import QuestionField from "../../../components/anamnesis/QuestionField";
import ScreenShell from "../../../components/anamnesis/ScreenShell";
import { ThemeColors } from "../../../constants/theme-palettes";
import { useTheme } from "../../../contexts/ThemeContext";
import {
  AnamnesisAnswerValue,
  AnamnesisAnswers,
  AnamnesisApiItem,
  AnamnesisTemplateApiItem,
  createAnamnesisAddendum,
  discardAnamnesisDraft,
  finalizeAnamnesis,
  getAnamnesis,
  getAnamnesisTemplates,
  getMedicalRecordByPatient,
  saveAnamnesisDraft,
  startAnamnesis,
} from "../../../services/api";
import {
  pruneAnswers,
  sortQuestions,
  validateAnswers,
} from "../../../services/anamnesis";
import { showAlert, showConfirm } from "../../../services/feedback";

// `id` = "novo" (com `patientId` = id do PatientProfile): o psicólogo escolhe o
// modelo e o sistema cria o rascunho. Com um id real: preenche o rascunho
// (salvar / finalizar / descartar) ou, se já finalizada, mostra as respostas
// somente leitura e permite registrar adendos.

export default function AnamnesisScreen() {
  const { id, patientId } = useLocalSearchParams<{ id: string; patientId?: string }>();
  return id === "novo" ? (
    <TemplatePicker patientId={patientId} />
  ) : (
    <AnamnesisForm id={id as string} />
  );
}

// ─── Passo 1: escolher o modelo ──────────────────────────────────────────────

function TemplatePicker({ patientId }: { patientId?: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [templates, setTemplates] = useState<AnamnesisTemplateApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const result = await getAnamnesisTemplates();
      if (result.ok) setTemplates(result.data ?? []);
      else showAlert("Erro", result.error || "Não foi possível carregar os modelos.");
      setLoading(false);
    })();
  }, []);

  const start = async (template: AnamnesisTemplateApiItem) => {
    if (!patientId) {
      showAlert("Erro", "Paciente não informado.");
      return;
    }
    setStartingId(template.id);
    const record = await getMedicalRecordByPatient(patientId);
    if (!record.ok || !record.data) {
      setStartingId(null);
      showAlert("Erro", record.error || "Não foi possível abrir o prontuário.");
      return;
    }
    const created = await startAnamnesis(record.data.id, template.id);
    setStartingId(null);
    if (created.ok && created.data) {
      router.replace({
        pathname: "/anamnese/[id]",
        params: { id: created.data.id },
      } as any);
    } else {
      showAlert("Erro", created.error || "Não foi possível iniciar a anamnese.");
    }
  };

  return (
    <ScreenShell title="Nova anamnese" subtitle="Escolha o modelo">
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : templates.length === 0 ? (
        <Text style={styles.empty}>Nenhum modelo disponível.</Text>
      ) : (
        templates.map((template) => (
          <TouchableOpacity
            key={template.id}
            style={styles.pickCard}
            onPress={() => void start(template)}
            disabled={startingId !== null}
            activeOpacity={0.85}
          >
            <View style={styles.pickBody}>
              <Text style={styles.pickTitle}>{template.title}</Text>
              {!!template.description && (
                <Text style={styles.hint} numberOfLines={2}>
                  {template.description}
                </Text>
              )}
              <Text style={styles.hint}>
                {template.questions.length}{" "}
                {template.questions.length === 1 ? "pergunta" : "perguntas"}
              </Text>
            </View>
            {startingId === template.id && (
              <ActivityIndicator size="small" color={colors.primary} />
            )}
          </TouchableOpacity>
        ))
      )}
    </ScreenShell>
  );
}

// ─── Passo 2: preencher / consultar ──────────────────────────────────────────

function AnamnesisForm({ id }: { id: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [anamnesis, setAnamnesis] = useState<AnamnesisApiItem | null>(null);
  const [answers, setAnswers] = useState<AnamnesisAnswers>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [addendum, setAddendum] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const result = await getAnamnesis(id);
      if (!active) return;
      if (result.ok && result.data) {
        setAnamnesis(result.data);
        setAnswers(result.data.answers ?? {});
      } else {
        showAlert("Erro", result.error || "Não foi possível carregar a anamnese.");
        router.back();
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const questions = useMemo(
    () =>
      anamnesis
        ? sortQuestions(anamnesis.template_snapshot.questions)
        : [],
    [anamnesis],
  );
  const finalized = anamnesis?.status === "finalized";

  const setAnswer = (questionId: string, value: AnamnesisAnswerValue) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
    setErrors((current) => {
      if (!(questionId in current)) return current;
      const { [questionId]: _removed, ...rest } = current;
      return rest;
    });
  };

  const saveDraft = async (silent = false) => {
    const result = await saveAnamnesisDraft(id, pruneAnswers(questions, answers));
    if (result.ok) {
      if (!silent) showAlert("Sucesso", "Rascunho salvo.");
    } else {
      showAlert("Erro", result.error || "Não foi possível salvar o rascunho.");
    }
    return result.ok;
  };

  const onSaveDraft = async () => {
    setBusy(true);
    await saveDraft();
    setBusy(false);
  };

  const onFinalize = () => {
    const found = validateAnswers(
      questions as (typeof questions[number] & { id: string })[],
      answers,
    );
    setErrors(found);
    if (Object.keys(found).length > 0) {
      showAlert("Atenção", "Corrija as respostas destacadas para finalizar.");
      return;
    }
    showConfirm({
      title: "Finalizar anamnese",
      message:
        "Depois de finalizada, a anamnese não pode ser editada nem apagada — só receber adendos.",
      confirmText: "Finalizar",
      onConfirm: async () => {
        setBusy(true);
        if (await saveDraft(true)) {
          const result = await finalizeAnamnesis(id);
          if (result.ok && result.data) {
            setAnamnesis(result.data);
            setAnswers(result.data.answers ?? answers);
            showAlert("Sucesso", "Anamnese finalizada.");
          } else {
            showAlert("Erro", result.error || "Não foi possível finalizar.");
          }
        }
        setBusy(false);
      },
    });
  };

  const onDiscard = () =>
    showConfirm({
      title: "Descartar rascunho",
      message: "O rascunho será apagado. Essa ação não pode ser desfeita.",
      confirmText: "Descartar",
      destructive: true,
      onConfirm: async () => {
        setBusy(true);
        const result = await discardAnamnesisDraft(id);
        setBusy(false);
        if (result.ok) router.back();
        else showAlert("Erro", result.error || "Não foi possível descartar.");
      },
    });

  const onAddendum = async () => {
    const content = addendum.trim();
    if (!content) {
      showAlert("Atenção", "Escreva o adendo antes de registrar.");
      return;
    }
    setBusy(true);
    const result = await createAnamnesisAddendum(id, { content });
    setBusy(false);
    if (result.ok) {
      setAddendum("");
      showAlert("Sucesso", "Adendo registrado. Ele aparece na linha do tempo do prontuário.");
    } else {
      showAlert("Erro", result.error || "Não foi possível registrar o adendo.");
    }
  };

  return (
    <ScreenShell
      title={anamnesis?.template_snapshot.title ?? "Anamnese"}
      subtitle={finalized ? "Finalizada" : "Rascunho"}
    >
      {loading || !anamnesis ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          {!!anamnesis.template_snapshot.description && (
            <Text style={styles.hint}>{anamnesis.template_snapshot.description}</Text>
          )}

          {questions.map((question) => (
            <QuestionField
              key={question.id}
              question={question}
              value={answers[question.id]}
              onChange={(value) => setAnswer(question.id, value)}
              error={errors[question.id]}
              disabled={finalized || busy}
            />
          ))}

          {!finalized && (
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.secondaryBtn, busy && styles.off]}
                onPress={() => void onSaveDraft()}
                disabled={busy}
              >
                <Text style={styles.secondaryBtnText}>Salvar rascunho</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, busy && styles.off]}
                onPress={onFinalize}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.primaryBtnText}>Finalizar anamnese</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={onDiscard} disabled={busy}>
                <Text style={styles.danger}>Descartar rascunho</Text>
              </TouchableOpacity>
            </View>
          )}

          {finalized && (
            <View style={styles.addendumBox}>
              <Text style={styles.sectionTitle}>Adendo</Text>
              <Text style={styles.hint}>
                A anamnese finalizada não pode ser alterada. Para corrigir ou complementar,
                registre um adendo — ele guarda data, hora e autor.
              </Text>
              <TextInput
                style={styles.addendumInput}
                value={addendum}
                onChangeText={setAddendum}
                editable={!busy}
                multiline
                textAlignVertical="top"
                placeholder="Escreva o adendo"
                placeholderTextColor={colors.placeholder}
              />
              <TouchableOpacity
                style={[styles.primaryBtn, busy && styles.off]}
                onPress={() => void onAddendum()}
                disabled={busy}
              >
                <Text style={styles.primaryBtnText}>Registrar adendo</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </ScreenShell>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    center: { paddingVertical: 48, alignItems: "center" },
    empty: { color: colors.textMuted, fontSize: 14, textAlign: "center", paddingVertical: 32 },
    hint: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
    pickCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.white,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 12,
    },
    pickBody: { flex: 1 },
    pickTitle: { color: colors.textDark, fontSize: 16, fontWeight: "800" },
    footer: { marginTop: 28, gap: 12, alignItems: "stretch" },
    primaryBtn: {
      paddingVertical: 15,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: "center",
    },
    primaryBtnText: { color: colors.white, fontSize: 15, fontWeight: "800" },
    secondaryBtn: {
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.primary,
      alignItems: "center",
    },
    secondaryBtnText: { color: colors.primary, fontSize: 15, fontWeight: "700" },
    danger: { color: "#b66b37", fontSize: 14, fontWeight: "700", textAlign: "center", paddingVertical: 6 },
    off: { opacity: 0.5 },
    addendumBox: {
      marginTop: 32,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 12,
    },
    sectionTitle: { color: colors.textDark, fontSize: 18, fontWeight: "800" },
    addendumInput: {
      minHeight: 100,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.white,
      padding: 14,
      fontSize: 15,
      color: colors.textDark,
    },
  });
