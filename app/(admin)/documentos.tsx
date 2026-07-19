import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Linking,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { showAlert } from "../../services/feedback";
import {
  deleteDocument,
  getClinicPatients,
  getDocuments,
  getMe,
  uploadDocument,
} from "../../services/api";

// ─── Tema ──────────────────────────────────────────────────────────────────────
const GREEN = "#2e8b6e";
const GREEN_LIGHT = "#e8f7f1";
const BLUE = "#2d6cdf";
const RED = "#d95c5c";
const PAGE_BG = "#e8f1ec";
const WHITE = "#ffffff";
const BORDER = "#dfece5";
const TEXT_DARK = "#17352b";
const TEXT_MUTED = "#5f7a6f";
const MAX_WIDTH = 1120;
const DESKTOP_BREAKPOINT = 900;

const CARD_SHADOW = {
  shadowColor: "#1f5442",
  shadowOpacity: 0.05,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
} as const;

// ─── Tipos ─────────────────────────────────────────────────────────────────────
interface DocItem {
  id: string;
  title: string;
  file_type: string;
  file_type_display?: string;
  file_url?: string;
  uploaded_at: string;
  patient?: string | null;
  patient_name?: string | null;
  patient_archived?: boolean;
  is_avulso?: boolean;
}

interface SimplePatient {
  id: string; // PatientProfile.id
  label: string;
}

type Filter = "todos" | "com_paciente" | "avulsos" | "arquivados";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "com_paciente", label: "Com paciente" },
  { key: "avulsos", label: "Avulsos" },
  { key: "arquivados", label: "Pacientes removidos" },
];

const UPLOAD_TYPES: { label: string; value: string }[] = [
  { label: "PDF", value: "pdf" },
  { label: "Imagem", value: "image" },
  { label: "Outro", value: "other" },
];

const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  pdf: { icon: "document-text-outline", color: "#e05c5c", bg: "#fdeaea" },
  image: { icon: "image-outline", color: BLUE, bg: "#e8f0fc" },
  other: { icon: "folder-outline", color: GREEN, bg: GREEN_LIGHT },
};

const typeCfg = (t: string) => TYPE_CONFIG[t] ?? TYPE_CONFIG.other;

const formatDate = (iso: string): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Rótulo do vínculo do documento.
const patientLabel = (doc: DocItem): { text: string; color: string; bg: string } => {
  if (doc.is_avulso || !doc.patient) {
    return { text: "Avulso", color: "#8a55d9", bg: "#f3ecff" };
  }
  if (doc.patient_archived) {
    return {
      text: `${doc.patient_name || "Paciente"} (removido)`,
      color: "#c46a1a",
      bg: "#fef3e8",
    };
  }
  return { text: doc.patient_name || "Paciente", color: GREEN, bg: GREEN_LIGHT };
};

// ─── Tela ──────────────────────────────────────────────────────────────────────
export default function AdminDocumentsScreen() {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [patients, setPatients] = useState<SimplePatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");

  const [modalVisible, setModalVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DocItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  const loadDocs = async () => {
    const result = await getDocuments();
    if (result.ok && Array.isArray(result.data)) {
      setDocs(result.data as DocItem[]);
    } else {
      showAlert("Erro", (result as any).error || "Erro ao carregar documentos.");
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const meResult = await getMe();
        const clinicId = meResult.ok ? meResult.data?.clinic : null;
        const [, patientsRes] = await Promise.all([
          loadDocs(),
          clinicId ? getClinicPatients(clinicId) : Promise.resolve({ ok: false } as any),
        ]);
        if (patientsRes?.ok && Array.isArray(patientsRes.data)) {
          setPatients(
            patientsRes.data.map((p: any) => ({
              id: p.id,
              label: p.user?.full_name ?? p.user?.email ?? p.id,
            })),
          );
        }
      } catch {
        showAlert("Erro", "Erro inesperado ao carregar documentos.");
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return docs.filter((d) => {
      // filtro por vínculo
      if (filter === "avulsos" && !(d.is_avulso || !d.patient)) return false;
      if (filter === "com_paciente" && (d.is_avulso || !d.patient)) return false;
      if (filter === "arquivados" && !d.patient_archived) return false;
      // busca por título ou nome do paciente
      if (!q) return true;
      return (
        d.title.toLowerCase().includes(q) ||
        (d.patient_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [docs, filter, search]);

  const counts = useMemo(
    () => ({
      todos: docs.length,
      com_paciente: docs.filter((d) => !(d.is_avulso || !d.patient)).length,
      avulsos: docs.filter((d) => d.is_avulso || !d.patient).length,
      arquivados: docs.filter((d) => d.patient_archived).length,
    }),
    [docs],
  );

  const handleDownload = async (doc: DocItem) => {
    if (doc.file_url) {
      await Linking.openURL(doc.file_url);
      return;
    }
    showAlert("Download", `Não foi possível localizar o arquivo "${doc.title}".`);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteDocument(deleteTarget.id);
    setDeleting(false);
    if (!result.ok) {
      showAlert("Erro", (result as any).error || "Não foi possível excluir.");
      return;
    }
    setDocs((prev) => prev.filter((d) => d.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN} />

      <View style={styles.header}>
        <View style={styles.headerInner}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back-outline" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTextBox}>
            <Text style={styles.headerTitle}>Documentos</Text>
          </View>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.replace("/(admin)")}>
            <Ionicons name="home-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={GREEN} />
            <Text style={styles.loadingText}>Carregando documentos...</Text>
          </View>
        ) : (
          <Animated.View
            style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          >
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setModalVisible(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
              <Text style={styles.addBtnText}>Adicionar documento</Text>
            </TouchableOpacity>

            {/* Busca */}
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={16} color="#94b3a6" />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por título ou paciente..."
                placeholderTextColor="#94b3a6"
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <Ionicons name="close-circle" size={16} color="#94b3a6" />
                </TouchableOpacity>
              )}
            </View>

            {/* Filtros */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersRow}
            >
              {FILTERS.map((f) => (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
                  onPress={() => setFilter(f.key)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}
                  >
                    {f.label}
                  </Text>
                  <View style={[styles.filterCount, filter === f.key && styles.filterCountActive]}>
                    <Text
                      style={[
                        styles.filterCountText,
                        filter === f.key && styles.filterCountTextActive,
                      ]}
                    >
                      {counts[f.key]}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Lista */}
            {filtered.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="folder-open-outline" size={40} color="#b2dfcf" />
                <Text style={styles.emptyTitle}>Nenhum documento encontrado</Text>
              </View>
            ) : (
              <View style={styles.cardsWrap}>
                {filtered.map((doc) => {
                  const cfg = typeCfg(doc.file_type);
                  const pl = patientLabel(doc);
                  return (
                    <View
                      key={doc.id}
                      style={[styles.docCard, { flexBasis: isDesktop ? 420 : "100%" }]}
                    >
                      <View style={[styles.fileIconBox, { backgroundColor: cfg.bg }]}>
                        <Ionicons name={cfg.icon as any} size={24} color={cfg.color} />
                      </View>
                      <View style={styles.docInfo}>
                        <Text style={styles.docTitle} numberOfLines={1}>
                          {doc.title}
                        </Text>
                        <View style={styles.docMeta}>
                          <View style={[styles.linkBadge, { backgroundColor: pl.bg }]}>
                            <Text style={[styles.linkBadgeText, { color: pl.color }]}>
                              {pl.text}
                            </Text>
                          </View>
                          <Text style={styles.docDate}>{formatDate(doc.uploaded_at)}</Text>
                        </View>
                        <View style={styles.docActions}>
                          <TouchableOpacity
                            style={styles.downloadBtn}
                            onPress={() => handleDownload(doc)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="download-outline" size={13} color={GREEN} />
                            <Text style={styles.downloadBtnText}>Baixar</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.deleteBtn}
                            onPress={() => setDeleteTarget(doc)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="trash-outline" size={13} color={RED} />
                            <Text style={styles.deleteBtnText}>Excluir</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </Animated.View>
        )}
      </ScrollView>

      <UploadModal
        visible={modalVisible}
        patients={patients}
        onClose={() => setModalVisible(false)}
        onUploaded={() => {
          setModalVisible(false);
          void loadDocs();
        }}
      />

      {/* Confirmação de exclusão */}
      <Modal
        visible={!!deleteTarget}
        transparent
        animationType="fade"
        onRequestClose={() => !deleting && setDeleteTarget(null)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmSheet}>
            <View style={styles.confirmIconBox}>
              <Ionicons name="trash-outline" size={26} color={RED} />
            </View>
            <Text style={styles.confirmTitle}>Excluir documento</Text>
            <Text style={styles.confirmMsg}>
              Excluir {"\n"}
              <Text style={{ fontWeight: "700", color: TEXT_DARK }}>{deleteTarget?.title}</Text>?
              {"\n"}Esta ação não pode ser desfeita.
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                <Text style={styles.confirmCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmDeleteBtn, deleting && { opacity: 0.7 }]}
                onPress={confirmDelete}
                disabled={deleting}
                activeOpacity={0.85}
              >
                {deleting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.confirmDeleteText}>Excluir</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Modal de upload ────────────────────────────────────────────────────────────
function UploadModal({
  visible,
  patients,
  onClose,
  onUploaded,
}: {
  visible: boolean;
  patients: SimplePatient[];
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [avulso, setAvulso] = useState(true);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientOpen, setPatientOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [fileType, setFileType] = useState("pdf");
  const [file, setFile] = useState<{ uri: string; name: string; mimeType?: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  const reset = () => {
    setAvulso(true);
    setPatientId(null);
    setPatientOpen(false);
    setTitle("");
    setFileType("pdf");
    setFile(null);
  };

  const handlePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*" });
      if (!result.canceled && result.assets?.length > 0) {
        const f = result.assets[0];
        setFile({ uri: f.uri, name: f.name || "documento", mimeType: f.mimeType });
      }
    } catch {
      showAlert("Erro", "Não foi possível selecionar o arquivo.");
    }
  };

  const handleUpload = async () => {
    if (!title.trim()) {
      showAlert("Campo obrigatório", "Informe o título do documento.");
      return;
    }
    if (!avulso && !patientId) {
      showAlert("Campo obrigatório", "Selecione o paciente ou marque como avulso.");
      return;
    }
    if (!file) {
      showAlert("Campo obrigatório", "Selecione um arquivo.");
      return;
    }
    setUploading(true);
    const result = await uploadDocument(
      title.trim(),
      fileType,
      {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || "application/octet-stream",
      },
      avulso ? undefined : patientId ?? undefined,
    );
    setUploading(false);
    if (!result.ok) {
      showAlert("Erro", (result as any).error || "Não foi possível enviar o documento.");
      return;
    }
    reset();
    onUploaded();
  };

  const selectedPatientLabel =
    patients.find((p) => p.id === patientId)?.label ?? "Selecione o paciente...";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => !uploading && onClose()}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.modalTitle}>Adicionar documento</Text>

            {/* Vínculo */}
            <Text style={styles.modalLabel}>Vínculo</Text>
            <View style={styles.segment}>
              <TouchableOpacity
                style={[styles.segmentBtn, avulso && styles.segmentBtnActive]}
                onPress={() => setAvulso(true)}
                activeOpacity={0.8}
              >
                <Text style={[styles.segmentText, avulso && styles.segmentTextActive]}>
                  Avulso
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentBtn, !avulso && styles.segmentBtnActive]}
                onPress={() => setAvulso(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.segmentText, !avulso && styles.segmentTextActive]}>
                  Vincular a paciente
                </Text>
              </TouchableOpacity>
            </View>

            {!avulso && (
              <>
                <Text style={styles.modalLabel}>Paciente</Text>
                <TouchableOpacity
                  style={styles.selectorBtn}
                  onPress={() => setPatientOpen((v) => !v)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[styles.selectorBtnText, !patientId && { color: "#94b3a6" }]}
                    numberOfLines={1}
                  >
                    {selectedPatientLabel}
                  </Text>
                  <Ionicons
                    name={patientOpen ? "chevron-up-outline" : "chevron-down-outline"}
                    size={18}
                    color="#6c8c80"
                  />
                </TouchableOpacity>
                {patientOpen && (
                  <View style={styles.dropdown}>
                    {patients.length === 0 ? (
                      <Text style={styles.dropdownEmpty}>Nenhum paciente disponível</Text>
                    ) : (
                      patients.map((p) => (
                        <TouchableOpacity
                          key={p.id}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setPatientId(p.id);
                            setPatientOpen(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{p.label}</Text>
                          {patientId === p.id && (
                            <Ionicons name="checkmark-outline" size={16} color={GREEN} />
                          )}
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                )}
              </>
            )}

            {/* Título */}
            <Text style={styles.modalLabel}>Título</Text>
            <TextInput
              style={styles.modalInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Ex: Termo de consentimento"
              placeholderTextColor="#94b3a6"
            />

            {/* Tipo */}
            <Text style={styles.modalLabel}>Tipo</Text>
            <View style={styles.typeRow}>
              {UPLOAD_TYPES.map((t) => {
                const active = fileType === t.value;
                const cfg = typeCfg(t.value);
                return (
                  <TouchableOpacity
                    key={t.value}
                    style={[
                      styles.typeOption,
                      active && { backgroundColor: cfg.bg, borderColor: cfg.color },
                    ]}
                    onPress={() => setFileType(t.value)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={cfg.icon as any}
                      size={16}
                      color={active ? cfg.color : "#94b3a6"}
                    />
                    <Text style={[styles.typeOptionText, active && { color: cfg.color }]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Arquivo */}
            <TouchableOpacity style={styles.filePicker} onPress={handlePick} activeOpacity={0.8}>
              <Ionicons name="cloud-upload-outline" size={26} color="#94b3a6" />
              <Text style={styles.filePickerText}>
                {file ? file.name : "Toque para selecionar o arquivo"}
              </Text>
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  reset();
                  onClose();
                }}
                disabled={uploading}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, uploading && { opacity: 0.7 }]}
                onPress={handleUpload}
                disabled={uploading}
                activeOpacity={0.85}
              >
                {uploading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
                    <Text style={styles.confirmBtnText}>Enviar</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PAGE_BG },
  header: { backgroundColor: GREEN, paddingTop: 52, paddingBottom: 20 },
  headerInner: {
    width: "100%", maxWidth: MAX_WIDTH, alignSelf: "center", paddingHorizontal: 20,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12,
  },
  iconBtn: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center", justifyContent: "center",
  },
  headerTextBox: { flex: 1 },
  headerTitle: { color: WHITE, fontSize: 21, fontWeight: "800", letterSpacing: -0.3 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 44 },
  container: { width: "100%", maxWidth: MAX_WIDTH, alignSelf: "center" },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 14 },
  loadingText: { fontSize: 15, color: GREEN, fontWeight: "600" },
  addBtn: {
    height: 50, borderRadius: 14, backgroundColor: GREEN, flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16,
  },
  addBtnText: { color: WHITE, fontSize: 15, fontWeight: "800" },
  searchBox: {
    flexDirection: "row", alignItems: "center", backgroundColor: WHITE, borderRadius: 12,
    borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14, height: 50, marginBottom: 14, gap: 8,
    ...CARD_SHADOW,
  },
  searchInput: {
    flex: 1, fontSize: 14, color: TEXT_DARK, fontWeight: "500",
    // @ts-ignore — remove o contorno azul no web
    outlineStyle: "none",
  },
  filtersRow: { gap: 8, paddingBottom: 16 },
  filterChip: {
    flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 999, backgroundColor: WHITE, borderWidth: 1, borderColor: BORDER,
  },
  filterChipActive: { backgroundColor: GREEN, borderColor: GREEN },
  filterChipText: { fontSize: 13, fontWeight: "700", color: "#5e7b70" },
  filterChipTextActive: { color: WHITE },
  filterCount: {
    minWidth: 20, height: 20, borderRadius: 10, backgroundColor: "#edf4f0",
    alignItems: "center", justifyContent: "center", paddingHorizontal: 4,
  },
  filterCountActive: { backgroundColor: "rgba(255,255,255,0.25)" },
  filterCountText: { fontSize: 11, fontWeight: "700", color: "#5e7b70" },
  filterCountTextActive: { color: WHITE },
  emptyState: { alignItems: "center", paddingVertical: 48, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: TEXT_DARK },
  cardsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  docCard: {
    flexGrow: 1, backgroundColor: WHITE, borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    padding: 14, flexDirection: "row", gap: 12, ...CARD_SHADOW,
  },
  fileIconBox: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  docInfo: { flex: 1 },
  docTitle: { fontSize: 14, fontWeight: "800", color: TEXT_DARK, marginBottom: 6 },
  docMeta: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 },
  linkBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  linkBadgeText: { fontSize: 11, fontWeight: "700" },
  docDate: { fontSize: 11.5, color: TEXT_MUTED, fontWeight: "500" },
  docActions: { flexDirection: "row", gap: 8 },
  downloadBtn: {
    flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: GREEN_LIGHT,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  downloadBtnText: { fontSize: 11.5, fontWeight: "700", color: GREEN },
  deleteBtn: {
    flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#fdeaea",
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  deleteBtnText: { fontSize: 11.5, fontWeight: "700", color: RED },
  // Modal upload
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: WHITE, borderTopLeftRadius: 26, borderTopRightRadius: 26,
    padding: 24, paddingBottom: 34, maxHeight: "90%",
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: "#d4ede3",
    alignSelf: "center", marginBottom: 18,
  },
  modalTitle: { fontSize: 19, fontWeight: "800", color: TEXT_DARK, marginBottom: 16 },
  modalLabel: {
    fontSize: 12, fontWeight: "700", color: "#5f7d70", marginBottom: 8, marginTop: 6,
    textTransform: "uppercase", letterSpacing: 0.5,
  },
  segment: {
    flexDirection: "row", backgroundColor: "#f0faf5", borderRadius: 12, padding: 4, gap: 4,
    borderWidth: 1, borderColor: "#d4ede3",
  },
  segmentBtn: { flex: 1, height: 40, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  segmentBtnActive: { backgroundColor: GREEN },
  segmentText: { fontSize: 13.5, fontWeight: "700", color: "#5e7b70" },
  segmentTextActive: { color: WHITE },
  selectorBtn: {
    minHeight: 50, borderRadius: 12, borderWidth: 1, borderColor: "#d7ebe2",
    backgroundColor: "#f6faf8", paddingHorizontal: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  selectorBtnText: { fontSize: 15, color: TEXT_DARK, fontWeight: "500", flex: 1 },
  dropdown: {
    marginTop: 6, borderRadius: 12, borderWidth: 1, borderColor: "#d7ebe2",
    backgroundColor: WHITE, overflow: "hidden", maxHeight: 220,
  },
  dropdownEmpty: { padding: 16, fontSize: 14, color: "#94b3a6", textAlign: "center" },
  dropdownItem: {
    paddingVertical: 13, paddingHorizontal: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  dropdownItemText: { fontSize: 15, color: TEXT_DARK, fontWeight: "500", flex: 1 },
  modalInput: {
    minHeight: 50, borderRadius: 12, borderWidth: 1, borderColor: "#d7ebe2",
    backgroundColor: "#f6faf8", paddingHorizontal: 14, fontSize: 15, color: TEXT_DARK,
    // @ts-ignore — remove o contorno azul no web
    outlineStyle: "none",
  },
  typeRow: { flexDirection: "row", gap: 8 },
  typeOption: {
    flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1.5, borderColor: "#d4ede3", backgroundColor: "#fafffe",
  },
  typeOptionText: { fontSize: 13, fontWeight: "700", color: "#94b3a6" },
  filePicker: {
    marginTop: 16, borderWidth: 1.5, borderColor: "#d4ede3", borderStyle: "dashed",
    borderRadius: 14, padding: 22, alignItems: "center", gap: 6, backgroundColor: "#fafffe",
  },
  filePickerText: { fontSize: 14, fontWeight: "600", color: "#7aab96", textAlign: "center" },
  modalButtons: { flexDirection: "row", gap: 12, marginTop: 22 },
  cancelBtn: {
    flex: 1, height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: "#d4ede3",
    alignItems: "center", justifyContent: "center",
  },
  cancelBtnText: { fontSize: 15, fontWeight: "700", color: "#7aab96" },
  confirmBtn: {
    flex: 2, height: 50, borderRadius: 14, backgroundColor: GREEN, flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 8,
  },
  confirmBtnText: { fontSize: 15, fontWeight: "700", color: WHITE },
  // Confirmação exclusão
  confirmOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", padding: 30,
  },
  confirmSheet: {
    backgroundColor: WHITE, borderRadius: 22, padding: 26, width: "100%", maxWidth: 360, alignItems: "center",
  },
  confirmIconBox: {
    width: 54, height: 54, borderRadius: 17, backgroundColor: "#fdeaea",
    alignItems: "center", justifyContent: "center", marginBottom: 14,
  },
  confirmTitle: { fontSize: 18, fontWeight: "800", color: TEXT_DARK, marginBottom: 8 },
  confirmMsg: { fontSize: 14, color: "#4a7a66", textAlign: "center", lineHeight: 21, marginBottom: 22 },
  confirmButtons: { flexDirection: "row", gap: 12, width: "100%" },
  confirmCancelBtn: {
    flex: 1, height: 46, borderRadius: 12, borderWidth: 1.5, borderColor: "#d4ede3",
    alignItems: "center", justifyContent: "center",
  },
  confirmCancelText: { fontSize: 14, fontWeight: "700", color: "#7aab96" },
  confirmDeleteBtn: {
    flex: 1, height: 46, borderRadius: 12, backgroundColor: RED, alignItems: "center", justifyContent: "center",
  },
  confirmDeleteText: { fontSize: 14, fontWeight: "700", color: WHITE },
});
