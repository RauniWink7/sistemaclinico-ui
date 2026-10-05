import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { DateField, TimeField } from "../../../components/DateTimeField";
import ScreenShell from "../../../components/anamnesis/ScreenShell";
import TimelineCard from "../../../components/anamnesis/TimelineCard";
import { ThemeColors } from "../../../constants/theme-palettes";
import { useTheme } from "../../../contexts/ThemeContext";
import {
  createAnamnesisAddendum,
  createRecordAddendum,
  createRecordEntry,
  deleteRecordEntry,
  DocumentApi,
  exportMedicalRecordPdf,
  finalizeRecordEntry,
  getDocumentsByPatient,
  getMedicalRecordByPatient,
  MedicalRecordApiItem,
  RecordEntryApiItem,
  RecordEntryKind,
  updateRecordEntry,
} from "../../../services/api";
import {
  buildOccurredAt,
  buildRecordPdfFilename,
  buildTimeline,
  CREATABLE_ENTRY_KINDS,
  ENTRY_KIND_LABELS,
  findEvolutionForAppointment,
  formatDate,
  formatDateTime,
  getCurrentDemand,
  TimelineItem,
} from "../../../services/anamnesis";
import { showAlert, showConfirm } from "../../../services/feedback";

// `patientId` = id do PatientProfile (não o id do usuário). O prontuário é
// criado pelo backend no primeiro acesso do psicólogo responsável.

interface Composer {
  editingId: string | null;
  appointment: string | null; // consulta a que a evolução se refere

  kind: Exclude<RecordEntryKind, "addendum">;
  content: string;
  referralTo: string;
  date: string;
  time: string;
}

const emptyComposer = (): Composer => ({
  editingId: null,
  appointment: null,
  kind: "evolution",
  content: "",
  referralTo: "",
  date: "",
  time: "",
});

export default function MedicalRecordScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  // `appointmentId`: vindo de "concluir consulta" na agenda/calendário —
  // abre o rascunho de evolução daquela consulta.
  const { patientId, appointmentId } = useLocalSearchParams<{
    patientId: string;
    appointmentId?: string;
  }>();
  // Cada consulta abre o editor uma única vez, para recargas não reabrirem.
  const handledAppointment = useRef<string | null>(null);

  const [record, setRecord] = useState<MedicalRecordApiItem | null>(null);
  const [documents, setDocuments] = useState<DocumentApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [composer, setComposer] = useState<Composer | null>(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    const result = await getMedicalRecordByPatient(patientId);
    if (!result.ok || !result.data) {
      setLoadError(result.error || "Não foi possível abrir o prontuário.");
      setLoading(false);
      return;
    }
    setLoadError(null);
    setRecord(result.data);

    if (
      appointmentId &&
      handledAppointment.current !== appointmentId &&
      result.data.can_write &&
      !result.data.metadata_only
    ) {
      handledAppointment.current = appointmentId;
      const existing = findEvolutionForAppointment(result.data.entries, appointmentId);
      if (!existing) {
        setComposer({ ...emptyComposer(), appointment: appointmentId });
      } else if (existing.status === "draft") {
        setComposer({
          ...emptyComposer(),
          editingId: existing.id,
          appointment: appointmentId,
          content: existing.content,
        });
      }
      // Evolução já finalizada: nada a abrir, ela aparece na linha do tempo.
    }

    // Documentos usam o id do usuário do paciente. Só carrega quando o
    // conteúdo clínico é visível para quem abriu o prontuário.
    const userId = result.data.patient_detail?.user?.id;
    if (userId && !result.data.metadata_only) {
      const docs = await getDocumentsByPatient(userId);
      if (docs.ok) {
        setDocuments(
          (docs.data as DocumentApi[]).filter(
            (doc) => doc.medical_record === result.data!.id,
          ),
        );
      }
    }
    setLoading(false);
  }, [patientId, appointmentId]);

  // Recarrega ao voltar da tela de anamnese, que muda a linha do tempo.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const timeline = useMemo(
    () => (record ? buildTimeline(record.entries, record.anamneses) : []),
    [record],
  );
  const demand = useMemo(() => (record ? getCurrentDemand(record.entries) : null), [record]);
  const canWrite = !!record?.can_write;
  const patient = record?.patient_detail;

  const submitComposer = async () => {
    if (!composer || !record) return;
    const content = composer.content.trim();
    if (!content) {
      showAlert("Atenção", "Escreva o conteúdo do registro.");
      return;
    }
    if (composer.kind === "referral" && !composer.referralTo.trim()) {
      showAlert("Atenção", "Informe o destino do encaminhamento.");
      return;
    }

    const occurred_at = buildOccurredAt(composer.date, composer.time);
    const referral_to =
      composer.kind === "referral" ? composer.referralTo.trim() : undefined;

    setSaving(true);
    const result = composer.editingId
      ? await updateRecordEntry(composer.editingId, { content, occurred_at, referral_to })
      : await createRecordEntry(record.id, {
          kind: composer.kind,
          content,
          occurred_at,
          referral_to,
          // Só evolução se liga à consulta (regra do backend).
          appointment: composer.kind === "evolution" ? composer.appointment : null,
        });
    setSaving(false);

    if (result.ok) {
      setComposer(null);
      showAlert("Sucesso", "Rascunho salvo. Finalize para registrar no prontuário.");
      await load();
    } else {
      showAlert("Erro", result.error || "Não foi possível salvar o registro.");
    }
  };

  const editEntry = (entry: RecordEntryApiItem) =>
    setComposer({
      editingId: entry.id,
      appointment: entry.appointment ?? null,
      kind: entry.kind as Composer["kind"],
      content: entry.content,
      referralTo: entry.referral_to ?? "",
      date: "",
      time: "",
    });

  const finalizeEntry = (entry: RecordEntryApiItem) =>
    showConfirm({
      title: "Finalizar registro",
      message:
        "Depois de finalizado, o registro não pode ser editado nem apagado — só receber adendos.",
      confirmText: "Finalizar",
      onConfirm: async () => {
        const result = await finalizeRecordEntry(entry.id);
        if (result.ok) await load();
        else showAlert("Erro", result.error || "Não foi possível finalizar.");
      },
    });

  const discardEntry = (entry: RecordEntryApiItem) =>
    showConfirm({
      title: "Descartar rascunho",
      message: "O rascunho será apagado. Essa ação não pode ser desfeita.",
      confirmText: "Descartar",
      destructive: true,
      onConfirm: async () => {
        const result = await deleteRecordEntry(entry.id);
        if (result.ok) await load();
        else showAlert("Erro", result.error || "Não foi possível descartar.");
      },
    });

  const addAddendum = async (item: TimelineItem, content: string) => {
    const result =
      item.type === "anamnesis"
        ? await createAnamnesisAddendum(item.anamnesis.id, { content })
        : await createRecordAddendum(item.entry.id, { content });
    if (result.ok) {
      showAlert("Sucesso", "Adendo registrado.");
      await load();
      return true;
    }
    showAlert("Erro", result.error || "Não foi possível registrar o adendo.");
    return false;
  };

  const exportPdf = () => {
    if (!record) return;
    showConfirm({
      title: "Exportar prontuário em PDF",
      message:
        "O PDF inclui os registros finalizados e seus adendos. Rascunhos e instrumentos de avaliação ficam de fora. A exportação é registrada no log de acesso.",
      confirmText: "Exportar",
      onConfirm: async () => {
        setExporting(true);
        const result = await exportMedicalRecordPdf(
          record.id,
          buildRecordPdfFilename(patient?.user?.full_name),
        );
        setExporting(false);
        if (!result.ok) showAlert("Exportação", result.error || "Falha ao exportar.");
      },
    });
  };

  const newAnamnesis = () =>
    router.push({
      pathname: "/anamnese/[id]",
      params: { id: "novo", patientId },
    } as any);

  return (
    <ScreenShell title="Prontuário" subtitle={patient?.user?.full_name}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : loadError || !record ? (
        <Text style={styles.empty}>{loadError ?? "Prontuário indisponível."}</Text>
      ) : record.metadata_only ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Conteúdo reservado</Text>
          <Text style={styles.meta}>
            O conteúdo clínico é restrito ao psicólogo responsável e a quem ele autorizar.
          </Text>
          <Text style={styles.meta}>Aberto em {formatDate(record.opened_at)}</Text>
          <Text style={styles.meta}>Registros: {record.entries_count ?? 0}</Text>
        </View>
      ) : (
        <>
          {/* Identificação (Res. CFP 001/2009, art. 2º I) e demanda vigente (II) */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{patient?.user?.full_name}</Text>
            {!!patient?.birth_date && (
              <Text style={styles.meta}>Nascimento: {formatDate(patient.birth_date)}</Text>
            )}
            {!!patient?.cpf && <Text style={styles.meta}>CPF: {patient.cpf}</Text>}
            {!!patient?.emergency_contact_name && (
              <Text style={styles.meta}>
                Contato de emergência: {patient.emergency_contact_name}
                {patient.emergency_contact_phone
                  ? ` · ${patient.emergency_contact_phone}`
                  : ""}
              </Text>
            )}
            {!!record.closed_at && (
              <Text style={styles.meta}>Encerrado em {formatDate(record.closed_at)}</Text>
            )}
            {!!record.retention_until && (
              <Text style={styles.meta}>Guarda até {formatDate(record.retention_until)}</Text>
            )}

            <Text style={styles.subTitle}>Demanda vigente</Text>
            <Text style={styles.content}>
              {demand ? demand.content : "Nenhuma demanda finalizada ainda."}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.secondaryBtn, styles.exportBtn, exporting && styles.off]}
            onPress={exportPdf}
            disabled={exporting}
            accessibilityLabel="Exportar prontuário em PDF"
          >
            {exporting ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.secondaryBtnText}>Exportar PDF</Text>
            )}
          </TouchableOpacity>

          {/* Só o responsável autoriza e vê o log de acesso */}
          {record.can_authorize && (
            <TouchableOpacity
              style={[styles.secondaryBtn, styles.exportBtn]}
              onPress={() =>
                router.push({
                  pathname: "/prontuario-acesso/[recordId]",
                  params: { recordId: record.id, responsibleId: record.responsible },
                } as any)
              }
            >
              <Text style={styles.secondaryBtnText}>Acessos e autorizações</Text>
            </TouchableOpacity>
          )}

          {canWrite && (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => setComposer(composer ? null : emptyComposer())}
              >
                <Text style={styles.primaryBtnText}>
                  {composer ? "Fechar editor" : "Novo registro"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={newAnamnesis}>
                <Text style={styles.secondaryBtnText}>Nova anamnese</Text>
              </TouchableOpacity>
            </View>
          )}

          {composer && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {composer.editingId ? "Editar rascunho" : "Novo registro"}
              </Text>

              {!composer.editingId && (
                <View style={styles.chips}>
                  {CREATABLE_ENTRY_KINDS.map((kind) => {
                    const active = composer.kind === kind;
                    return (
                      <TouchableOpacity
                        key={kind}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => setComposer({ ...composer, kind })}
                        accessibilityState={{ selected: active }}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {ENTRY_KIND_LABELS[kind]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {composer.kind === "referral" && (
                <>
                  <Text style={styles.label}>Destino do encaminhamento</Text>
                  <TextInput
                    style={styles.input}
                    value={composer.referralTo}
                    onChangeText={(referralTo) => setComposer({ ...composer, referralTo })}
                    maxLength={200}
                    placeholderTextColor={colors.placeholder}
                  />
                </>
              )}

              <Text style={styles.label}>Conteúdo</Text>
              <TextInput
                style={[styles.input, styles.inputLong]}
                value={composer.content}
                onChangeText={(content) => setComposer({ ...composer, content })}
                multiline
                textAlignVertical="top"
                placeholder="Registre o atendimento"
                placeholderTextColor={colors.placeholder}
              />

              <Text style={styles.label}>Data e hora do atendimento (vazio = agora)</Text>
              <View style={styles.dateRow}>
                <View style={styles.dateCol}>
                  <DateField
                    value={composer.date}
                    onChange={(date) => setComposer({ ...composer, date })}
                  />
                </View>
                <View style={styles.dateCol}>
                  <TimeField
                    value={composer.time}
                    onChange={(time) => setComposer({ ...composer, time })}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, styles.fullBtn, saving && styles.off]}
                onPress={() => void submitComposer()}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.primaryBtnText}>Salvar rascunho</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.sectionTitle}>Linha do tempo</Text>
          {timeline.length === 0 ? (
            <Text style={styles.empty}>Nenhum registro ainda.</Text>
          ) : (
            timeline.map((item) => (
              <TimelineCard
                key={`${item.type}-${item.id}`}
                item={item}
                canWrite={canWrite}
                onEdit={editEntry}
                onFinalize={finalizeEntry}
                onDiscard={discardEntry}
                onOpenAnamnesis={(id) =>
                  router.push({ pathname: "/anamnese/[id]", params: { id } } as any)
                }
                onAddendum={addAddendum}
              />
            ))
          )}

          <Text style={styles.sectionTitle}>Documentos</Text>
          {documents.length === 0 ? (
            <Text style={styles.empty}>Nenhum documento anexado ao prontuário.</Text>
          ) : (
            documents.map((doc) => (
              <View key={doc.id} style={styles.card}>
                <Text style={styles.cardTitle}>{doc.title}</Text>
                <Text style={styles.meta}>{formatDateTime(doc.uploaded_at)}</Text>
                {!!doc.purpose && <Text style={styles.meta}>Finalidade: {doc.purpose}</Text>}
                {!!doc.recipient && (
                  <Text style={styles.meta}>Destinatário: {doc.recipient}</Text>
                )}
              </View>
            ))
          )}
        </>
      )}
    </ScreenShell>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    center: { paddingVertical: 48, alignItems: "center" },
    empty: { color: colors.textMuted, fontSize: 14, textAlign: "center", paddingVertical: 24 },
    card: {
      backgroundColor: colors.white,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 12,
    },
    cardTitle: { color: colors.textDark, fontSize: 16, fontWeight: "800" },
    subTitle: { color: colors.primary, fontSize: 13, fontWeight: "800", marginTop: 16 },
    sectionTitle: { color: colors.textDark, fontSize: 18, fontWeight: "800", marginTop: 22, marginBottom: 12 },
    meta: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
    content: { color: colors.textDark, fontSize: 14, marginTop: 6, lineHeight: 20 },
    buttonRow: { flexDirection: "row", gap: 10, flexWrap: "wrap", marginBottom: 12 },
    primaryBtn: {
      flex: 1,
      minWidth: 140,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: "center",
    },
    fullBtn: { flex: 0, alignSelf: "stretch", marginTop: 16 },
    primaryBtnText: { color: colors.white, fontSize: 15, fontWeight: "800" },
    secondaryBtn: {
      flex: 1,
      minWidth: 140,
      paddingVertical: 13,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.primary,
      alignItems: "center",
    },
    secondaryBtnText: { color: colors.primary, fontSize: 15, fontWeight: "700" },
    off: { opacity: 0.5 },
    exportBtn: { flex: 0, alignSelf: "stretch", marginBottom: 12 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
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
    inputLong: { minHeight: 120 },
    dateRow: { flexDirection: "row", gap: 10 },
    dateCol: { flex: 1 },
  });
