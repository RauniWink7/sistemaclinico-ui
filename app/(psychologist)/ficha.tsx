import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { showAlert } from "../../services/feedback";
import {
  deleteDocument,
  getAccessToken,
  getDocumentsByPatient,
  getPatientProfile,
  updatePatientProfile,
} from "../../services/api";

// ─── Theme ────────────────────────────────────────────────────────────────────
const GREEN = "#2e8b6e";
const GREEN_LIGHT = "#e8f7f1";
const BLUE_LIGHT = "#eaf1ff";
const BG = "#e8f1ec";
const WHITE = "#ffffff";
const BORDER = "#dfece5";
const MAX_WIDTH = 1120;

// A mesma URL base da api.ts
const API_BASE_URL = Platform.select({
  web: "http://127.0.0.1:8000/api",
  android: "http://10.0.2.2:8000/api",
  default: "http://127.0.0.1:8000/api",
}) as string;

// ─── Types ────────────────────────────────────────────────────────────────────
type FileType = "PDF" | "Imagem" | "Laudo" | "Receita" | "Outros";

interface PatientDocument {
  id: string;
  title: string;
  file_type: FileType;
  uploaded_at: string;
  size: string;
  download_url?: string;
  url?: string;
}

const FILE_TYPE_OPTIONS: FileType[] = [
  "PDF",
  "Imagem",
  "Laudo",
  "Receita",
  "Outros",
];

const FILE_CONFIG: Record<
  FileType,
  { icon: string; color: string; bg: string }
> = {
  PDF: { icon: "document-text-outline", color: "#e05c5c", bg: "#fdeaea" },
  Imagem: { icon: "image-outline", color: "#3a7bd5", bg: "#e8f0fc" },
  Laudo: { icon: "clipboard-outline", color: "#8b5cf6", bg: "#f0ebff" },
  Receita: { icon: "medkit-outline", color: "#e67e22", bg: "#fef3e8" },
  Outros: { icon: "folder-outline", color: "#7aab96", bg: "#e8f7f1" },
};

const fileTypeMap: Record<string, FileType> = {
  pdf: "PDF",
  image: "Imagem",
  other: "Outros",
  PDF: "PDF",
  Imagem: "Imagem",
  Outro: "Outros",
  imagem: "Imagem",
  laudo: "Laudo",
  Laudo: "Laudo",
  receita: "Receita",
  Receita: "Receita",
  outros: "Outros",
  Outros: "Outros",
};

const fileTypeApiMap: Record<FileType, string> = {
  PDF: "pdf",
  Imagem: "image",
  Laudo: "other",
  Receita: "other",
  Outros: "other",
};

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()} ${hh}:${mi}`;
};

// ─── ReadOnly Row ─────────────────────────────────────────────────────────────
const ReadOnlyRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

// ─── Doc Card ─────────────────────────────────────────────────────────────────
interface DocCardProps {
  item: PatientDocument;
  onDownload: (item: PatientDocument) => void;
  onDelete: (id: string) => void;
}

const DocCard = ({ item, onDownload, onDelete }: DocCardProps) => {
  const cfg = FILE_CONFIG[item.file_type] ?? FILE_CONFIG["Outros"];
  return (
    <View style={styles.docCard}>
      <View style={[styles.fileIconBox, { backgroundColor: cfg.bg }]}>
        <Ionicons name={cfg.icon as any} size={26} color={cfg.color} />
      </View>
      <View style={styles.docCardInfo}>
        <Text style={styles.docCardTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.docCardMeta}>
          <View style={[styles.typeBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.typeText, { color: cfg.color }]}>
              {item.file_type}
            </Text>
          </View>
          <Text style={styles.docCardDate}>{formatDate(item.uploaded_at)}</Text>
          {item.size && item.size !== "—" && (
            <Text style={styles.docCardSize}>{item.size}</Text>
          )}
        </View>
        <View style={styles.docCardActions}>
          <TouchableOpacity
            style={styles.downloadBtn}
            onPress={() => onDownload(item)}
            activeOpacity={0.8}
          >
            <Ionicons name="download-outline" size={13} color={GREEN} />
            <Text style={styles.downloadBtnText}>Download</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => onDelete(item.id)}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={13} color="#e05c5c" />
            <Text style={styles.deleteBtnText}>Excluir</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// ─── Upload Modal ─────────────────────────────────────────────────────────────
interface UploadModalProps {
  visible: boolean;
  onClose: () => void;
  onUpload: (
    title: string,
    fileType: FileType,
    fileUri: string,
    fileName: string,
    mimeType?: string,
  ) => Promise<void>;
}

const UploadModal = ({ visible, onClose, onUpload }: UploadModalProps) => {
  const [title, setTitle] = useState("");
  const [fileType, setFileType] = useState<FileType>("PDF");
  const [loading, setLoading] = useState(false);
  const [titleError, setTitleError] = useState("");
  const [selectedFile, setSelectedFile] = useState<{
    uri: string;
    name: string;
    mimeType?: string;
  } | null>(null);

  const handleSelectFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*" });
      if (!result.canceled && result.assets?.length > 0) {
        const file = result.assets[0];
        setSelectedFile({
          uri: file.uri,
          name: file.name || "documento",
          mimeType: file.mimeType,
        });
      }
    } catch {
      showAlert("Erro", "Não foi possível selecionar o arquivo.");
    }
  };

  const handleUpload = async () => {
    if (!title.trim()) {
      setTitleError("O título é obrigatório.");
      return;
    }
    if (!selectedFile) {
      showAlert("Erro", "Selecione um arquivo.");
      return;
    }
    setTitleError("");
    setLoading(true);
    await onUpload(
      title.trim(),
      fileType,
      selectedFile.uri,
      selectedFile.name,
      selectedFile.mimeType,
    );
    setLoading(false);
    setTitle("");
    setFileType("PDF");
    setSelectedFile(null);
  };

  const handleClose = () => {
    setTitle("");
    setFileType("PDF");
    setTitleError("");
    setSelectedFile(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Enviar documento</Text>
          <Text style={styles.modalSubtitle}>
            Preencha os dados e selecione o arquivo
          </Text>

          <Text style={styles.modalLabel}>Título do documento</Text>
          <View
            style={[
              styles.modalInput,
              titleError ? styles.modalInputError : null,
            ]}
          >
            <Ionicons name="document-outline" size={16} color="#7aab96" />
            <TextInput
              style={styles.modalInputText}
              value={title}
              onChangeText={(v) => {
                setTitle(v);
                setTitleError("");
              }}
              placeholder="Ex: Laudo Psicológico 2026"
              placeholderTextColor="#9bbfb0"
            />
          </View>
          {titleError ? (
            <Text style={styles.modalInputErrorText}>{titleError}</Text>
          ) : null}

          <Text style={[styles.modalLabel, { marginTop: 16 }]}>
            Tipo de arquivo
          </Text>
          <View style={styles.typeGrid}>
            {FILE_TYPE_OPTIONS.map((t) => {
              const cfg = FILE_CONFIG[t];
              const active = fileType === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typeOption,
                    active && {
                      backgroundColor: cfg.bg,
                      borderColor: cfg.color,
                    },
                  ]}
                  onPress={() => setFileType(t)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={cfg.icon as any}
                    size={18}
                    color={active ? cfg.color : "#9bbfb0"}
                  />
                  <Text
                    style={[
                      styles.typeOptionText,
                      active && { color: cfg.color },
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.filePicker}
            activeOpacity={0.8}
            onPress={handleSelectFile}
          >
            <Ionicons name="cloud-upload-outline" size={28} color="#9bbfb0" />
            <Text style={styles.filePickerText}>
              {selectedFile
                ? selectedFile.name
                : "Toque para selecionar o arquivo"}
            </Text>
            <Text style={styles.filePickerSub}>
              {selectedFile
                ? `Tipo: ${selectedFile.mimeType || "Desconhecido"}`
                : "PDF, imagem ou documento"}
            </Text>
          </TouchableOpacity>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.cancelModalBtn}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelModalBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.uploadConfirmBtn, loading && { opacity: 0.7 }]}
              onPress={handleUpload}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons
                    name="cloud-upload-outline"
                    size={16}
                    color="#fff"
                  />
                  <Text style={styles.uploadConfirmBtnText}>Enviar</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PsychologistPatientRecordScreen() {
  const params = useLocalSearchParams<{
    patientId?: string; // user.id do paciente
    patientProfileId?: string; // profile.id — exigido pelo backend no upload
    patientName?: string;
    patientPhone?: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [patientUserId, setPatientUserId] = useState("");
  const [patient, setPatient] = useState<any>(null);
  const [medicalHistory, setMedicalHistory] = useState("");
  const [anamnesis, setAnamnesis] = useState("");

  // Documentos
  const [documentos, setDocumentos] = useState<PatientDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [docSearch, setDocSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FileType | "Todos">("Todos");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  // ── Toast de salvamento ───────────────────────────────────────────────────
  const [saved, setSaved] = useState(false);
  const saveAnim = useRef(new Animated.Value(0)).current;

  const showSavedToast = () => {
    setSaved(true);
    Animated.sequence([
      Animated.timing(saveAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(saveAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setSaved(false));
  };

  // ── Carrega documentos ────────────────────────────────────────────────────
  useEffect(() => {
    async function carregarDocumentos() {
      if (!params.patientId) return;
      try {
        setLoadingDocs(true);
        const response = await getDocumentsByPatient(params.patientId);
        if (response.ok) {
          const rawList: any[] = Array.isArray(response.data)
            ? response.data
            : [];
          setDocumentos(
            rawList.map((item: any) => ({
              id: item.id,
              title: item.title,
              file_type:
                fileTypeMap[item.file_type_display || item.file_type || ""] ??
                "Outros",
              uploaded_at: item.uploaded_at,
              size: item.size || "—",
              download_url: item.file_url || item.download_url,
              url: item.file_url || item.url,
            })),
          );
        } else {
          setDocumentos([]);
        }
      } catch {
        setDocumentos([]);
      } finally {
        setLoadingDocs(false);
      }
    }
    carregarDocumentos();
  }, [params.patientId]);

  // ── Carrega perfil do paciente ────────────────────────────────────────────
  useEffect(() => {
    const loadPatientData = async () => {
      if (!params.patientId) {
        showAlert("Erro", "ID do paciente não fornecido.");
        router.back();
        return;
      }
      setLoading(true);
      try {
        const profileResult = await getPatientProfile(params.patientId);
        if (profileResult.ok && profileResult.data) {
          setPatient(profileResult.data);
          setPatientUserId(profileResult.data.user.id);
          setMedicalHistory(profileResult.data.medical_history || "");
          setAnamnesis(profileResult.data.anamnesis || "");
        } else {
          showAlert(
            "Erro",
            profileResult.error || "Erro ao carregar perfil do paciente.",
          );
          router.back();
        }
      } catch {
        showAlert("Erro", "Erro inesperado ao carregar dados.");
      } finally {
        setLoading(false);
      }
    };
    loadPatientData();
  }, [params.patientId]);

  // ── Animação ──────────────────────────────────────────────────────────────
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // ── Filtros ───────────────────────────────────────────────────────────────
  const filteredDocs = documentos.filter((d) => {
    const matchSearch = d.title.toLowerCase().includes(docSearch.toLowerCase());
    const matchFilter =
      activeFilter === "Todos" || d.file_type === activeFilter;
    return matchSearch && matchFilter;
  });

  const docFilters: (FileType | "Todos")[] = ["Todos", ...FILE_TYPE_OPTIONS];

  // ── Download ──────────────────────────────────────────────────────────────
  const handleDownload = async (item: PatientDocument) => {
    const url = item.download_url || item.url;
    if (url) {
      await Linking.openURL(url);
      return;
    }
    showAlert(
      "Download",
      `Não foi possível localizar o link do documento "${item.title}".`,
    );
  };

  // ── Excluir ───────────────────────────────────────────────────────────────
  const handleDeletePress = (id: string) => {
    const doc = documentos.find((d) => d.id === id);
    if (!id || !doc) return;
    setDeleteConfirm({ id, title: doc.title });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    const result = await deleteDocument(deleteConfirm.id);
    setDeleting(false);
    setDeleteConfirm(null);
    if (!result.ok) {
      showAlert(
        "Erro",
        result.error || "Não foi possível excluir o documento.",
      );
      return;
    }
    setDocumentos((prev) => prev.filter((d) => d.id !== deleteConfirm.id));
  };

  // ── Upload — mesmo padrão do documento.tsx + campo "patient" para o psicólogo
  const handleUpload = async (
    title: string,
    fileType: FileType,
    fileUri: string,
    fileName: string,
    mimeType?: string,
  ): Promise<void> => {
    const apiFileType = fileTypeApiMap[fileType] ?? "other";
    // Use patient.id (PatientProfile.id carregado da API) como prioridade,
    // fallback para params.patientProfileId e params.patientId
    const patientProfileId =
      patient?.id || params.patientProfileId || params.patientId;
    const token = await getAccessToken();

    const formData = new FormData();
    formData.append("title", title);
    formData.append("file_type", apiFileType);

    // Informa ao backend qual paciente é o dono do documento
    if (patientProfileId) {
      formData.append("patient", patientProfileId);
    }

    // Mesmo tratamento do documento.tsx: Web precisa de Blob real
    if (Platform.OS === "web") {
      const blobRes = await fetch(fileUri);
      const blob = await blobRes.blob();
      const fileObj = new File([blob], fileName, {
        type: blob.type || mimeType || "application/octet-stream",
      });
      formData.append("file", fileObj);
    } else {
      formData.append("file", {
        uri: fileUri,
        name: fileName,
        type: mimeType || "application/octet-stream",
      } as any);
    }

    try {
      const res = await fetch(`${API_BASE_URL}/records/documents/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg =
          data?.detail ||
          data?.patient?.[0] ||
          data?.non_field_errors?.[0] ||
          "Não foi possível enviar o documento.";
        showAlert("Erro", errorMsg);
        return;
      }

      setDocumentos((prev) => [
        {
          id: data.id,
          title: data.title,
          file_type:
            fileTypeMap[data.file_type_display || data.file_type] ?? "Outros",
          uploaded_at: data.uploaded_at,
          size: data.size || "—",
          download_url: data.file_url || data.download_url,
          url: data.file_url || data.url,
        },
        ...prev,
      ]);
      setModalVisible(false);
      showAlert("Sucesso", "Documento enviado com sucesso.");
    } catch {
      showAlert("Erro", "Erro inesperado ao enviar o documento.");
    }
  };

  // ── Salvar ficha clínica ──────────────────────────────────────────────────
  const handleSave = async () => {
    const userId = patientUserId || params.patientId;
    if (!userId) {
      showAlert(
        "Erro",
        "ID do paciente não encontrado. Tente fechar e abrir a ficha novamente.",
      );
      return;
    }
    setSaving(true);
    try {
      const result = await updatePatientProfile(userId, {
        medical_history: medicalHistory,
        anamnesis,
      });
      if (result.ok) {
        showSavedToast();
      } else {
        showAlert("Erro", result.error ?? "Não foi possível salvar.");
      }
    } catch {
      showAlert("Erro", "Erro inesperado ao salvar a ficha.");
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerInner}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back-outline" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTextBox}>
            <Text style={styles.headerTitle}>Ficha do paciente</Text>
          </View>
          <TouchableOpacity
            style={styles.homeBtn}
            onPress={() => router.replace("/(psychologist)/dashboardP")}
          >
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
            <Text style={styles.loadingText}>Carregando ficha...</Text>
          </View>
        ) : patient ? (
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            {/* Hero */}
            <View style={styles.heroCard}>
              <View style={styles.heroTopRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(patient.user?.full_name ?? "")
                      .split(" ")
                      .slice(0, 2)
                      .map((p: string) => p[0])
                      .join("")}
                  </Text>
                </View>
                <View style={styles.heroTextBox}>
                  <Text style={styles.heroTitle}>
                    {patient.user?.full_name ??
                      params.patientName ??
                      "Paciente"}
                  </Text>
                  <Text style={styles.heroSubtitle}>
                    Paciente em acompanhamento
                  </Text>
                </View>
              </View>
              <View style={styles.heroBadge}>
                <Ionicons name="calendar-outline" size={14} color={GREEN} />
                <Text style={styles.heroBadgeText}>
                  Membro desde:{" "}
                  {patient.user?.created_at
                    ? new Date(patient.user.created_at).toLocaleDateString(
                        "pt-BR",
                      )
                    : "Data não informada"}
                </Text>
              </View>
            </View>

            {/* Dados pessoais */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Dados pessoais</Text>
              <ReadOnlyRow
                label="Nome"
                value={
                  patient.user?.full_name ??
                  params.patientName ??
                  "Não informado"
                }
              />
              <ReadOnlyRow
                label="E-mail"
                value={patient.user?.email ?? "Não informado"}
              />
              <ReadOnlyRow
                label="Telefone"
                value={
                  patient.user?.phone ?? params.patientPhone ?? "Não informado"
                }
              />
              <ReadOnlyRow label="CPF" value={patient.cpf || "Não informado"} />
              <ReadOnlyRow
                label="Data de nascimento"
                value={
                  patient.birth_date
                    ? new Date(patient.birth_date).toLocaleDateString("pt-BR")
                    : "Não informado"
                }
              />
            </View>

            {/* Histórico médico */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Historico medico</Text>
              <Text style={styles.sectionHint}>
                Campo editavel pelo psicologo.
              </Text>
              <TextInput
                style={styles.textArea}
                value={medicalHistory}
                onChangeText={setMedicalHistory}
                multiline
                placeholder="Descreva o historico medico"
                placeholderTextColor="#8ba99d"
                textAlignVertical="top"
              />
            </View>

            {/* Anamnese */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Anamnese</Text>
              <Text style={styles.sectionHint}>
                Campo editavel pelo psicologo.
              </Text>
              <TextInput
                style={styles.textArea}
                value={anamnesis}
                onChangeText={setAnamnesis}
                multiline
                placeholder="Registre a anamnese do paciente"
                placeholderTextColor="#8ba99d"
                textAlignVertical="top"
              />
            </View>

            {/* Documentos */}
            <View style={styles.card}>
              <View style={styles.docSectionHeader}>
                <Text style={styles.sectionTitle}>Documentos do paciente</Text>
                <TouchableOpacity
                  style={styles.addDocBtn}
                  onPress={() => setModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={styles.addDocBtnText}>Adicionar</Text>
                </TouchableOpacity>
              </View>

              {/* Busca */}
              <View style={styles.docSearchBox}>
                <Ionicons name="search-outline" size={15} color="#7aab96" />
                <TextInput
                  style={styles.docSearchInput}
                  placeholder="Buscar documento..."
                  placeholderTextColor="#9bbfb0"
                  value={docSearch}
                  onChangeText={setDocSearch}
                />
                {docSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setDocSearch("")}>
                    <Ionicons name="close-circle" size={15} color="#9bbfb0" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Filtros */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.docFiltersRow}
                keyboardShouldPersistTaps="handled"
              >
                {docFilters.map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[
                      styles.filterChip,
                      activeFilter === f && styles.filterChipActive,
                    ]}
                    onPress={() => setActiveFilter(f)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        activeFilter === f && styles.filterChipTextActive,
                      ]}
                    >
                      {f}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Lista */}
              {loadingDocs ? (
                <ActivityIndicator
                  size="small"
                  color={GREEN}
                  style={{ marginVertical: 20 }}
                />
              ) : filteredDocs.length > 0 ? (
                filteredDocs.map((doc) => (
                  <DocCard
                    key={doc.id}
                    item={doc}
                    onDownload={handleDownload}
                    onDelete={handleDeletePress}
                  />
                ))
              ) : (
                <View style={styles.emptyDocBox}>
                  <Ionicons
                    name="folder-open-outline"
                    size={40}
                    color="#b2dfcf"
                  />
                  <Text style={styles.emptyDocTitle}>
                    Nenhum documento encontrado
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyDocBtn}
                    onPress={() => setModalVisible(true)}
                  >
                    <Ionicons
                      name="cloud-upload-outline"
                      size={14}
                      color="#fff"
                    />
                    <Text style={styles.emptyDocBtnText}>Enviar documento</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Salvar ficha */}
            <TouchableOpacity
              style={[styles.saveButton, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="save-outline" size={18} color="#fff" />
              )}
              <Text style={styles.saveButtonText}>
                {saving ? "Salvando..." : "Salvar ficha clinica"}
              </Text>
            </TouchableOpacity>

            {/* Toast de sucesso */}
            {saved && (
              <Animated.View style={[styles.toastBox, { opacity: saveAnim }]}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#2e8b6e" />
                <Text style={styles.toastText}>Anotações salvas com sucesso</Text>
              </Animated.View>
            )}
          </Animated.View>
        ) : null}
      </ScrollView>

      {/* Upload Modal */}
      <UploadModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onUpload={handleUpload}
      />

      {/* Modal confirmação exclusão */}
      <Modal
        visible={!!deleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteConfirm(null)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmSheet}>
            <View style={styles.confirmIconBox}>
              <Ionicons name="trash-outline" size={28} color="#e05c5c" />
            </View>
            <Text style={styles.confirmTitle}>Excluir documento</Text>
            <Text style={styles.confirmMsg}>
              Tem certeza que deseja excluir{"\n"}
              <Text style={styles.confirmDocName}>{deleteConfirm?.title}</Text>?
              {"\n"}Esta ação não pode ser desfeita.
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setDeleteConfirm(null)}
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

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  header: {
    backgroundColor: GREEN,
    paddingTop: 52,
    paddingBottom: 20,
  },
  headerInner: {
    width: "100%",
    maxWidth: MAX_WIDTH,
    alignSelf: "center",
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  homeBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextBox: { flex: 1, marginHorizontal: 14 },
  headerTitle: {
    color: WHITE,
    fontSize: 21,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 40,
    width: "100%",
    maxWidth: MAX_WIDTH,
    alignSelf: "center",
  },
  heroCard: {
    backgroundColor: WHITE,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 20,
    marginBottom: 22,
    shadowColor: "#1f5442",
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  heroTopRow: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: BLUE_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  avatarText: { fontSize: 18, fontWeight: "800", color: "#2d6cdf" },
  heroTextBox: { flex: 1 },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#163c31",
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: "#5d7c71",
    lineHeight: 20,
  },
  heroBadge: {
    alignSelf: "flex-start",
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GREEN_LIGHT,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  heroBadgeText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "700",
    color: GREEN,
  },
  card: {
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#1f5442",
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#163c31",
    marginBottom: 14,
  },
  sectionHint: {
    marginTop: -6,
    marginBottom: 12,
    fontSize: 13,
    color: "#6a887d",
  },
  infoRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#edf4f0",
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#789286",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  infoValue: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 21,
    color: "#1f4036",
    fontWeight: "600",
  },
  textArea: {
    minHeight: 140,
    borderRadius: 18,
    backgroundColor: "#f4faf7",
    borderWidth: 1,
    borderColor: "#e3efe8",
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: "#1f4036",
  },
  saveButton: {
    height: 54,
    borderRadius: 18,
    backgroundColor: GREEN,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  saveButtonText: { color: WHITE, fontSize: 15, fontWeight: "700" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  loadingText: { marginTop: 16, fontSize: 16, color: GREEN, fontWeight: "600" },
  docSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  addDocBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: GREEN,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addDocBtnText: { color: WHITE, fontSize: 12, fontWeight: "700" },
  docSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f0faf5",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#d4ede3",
    marginBottom: 10,
  },
  docSearchInput: {
    flex: 1,
    fontSize: 13,
    color: "#1a3d31",
    fontWeight: "500",
  },
  docFiltersRow: { gap: 8, paddingBottom: 12 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "#f0faf5",
    borderWidth: 1,
    borderColor: "#d4ede3",
  },
  filterChipActive: { backgroundColor: GREEN, borderColor: GREEN },
  filterChipText: { fontSize: 11, color: "#4a7a66", fontWeight: "600" },
  filterChipTextActive: { color: WHITE },
  docCard: {
    backgroundColor: "#fafffe",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: "#edf4f0",
  },
  fileIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  docCardInfo: { flex: 1 },
  docCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1a3d31",
    marginBottom: 4,
  },
  docCardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  typeText: { fontSize: 10, fontWeight: "700" },
  docCardDate: { fontSize: 11, color: "#7aab96", fontWeight: "500" },
  docCardSize: { fontSize: 11, color: "#b2dfcf", fontWeight: "500" },
  docCardActions: { flexDirection: "row", gap: 8 },
  downloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#e8f7f1",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  downloadBtnText: { fontSize: 11, fontWeight: "700", color: GREEN },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fdeaea",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deleteBtnText: { fontSize: 11, fontWeight: "700", color: "#e05c5c" },
  emptyDocBox: { alignItems: "center", paddingVertical: 28, gap: 8 },
  emptyDocTitle: { fontSize: 14, fontWeight: "700", color: "#1a3d31" },
  emptyDocBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: GREEN,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 4,
  },
  emptyDocBtnText: { color: WHITE, fontSize: 13, fontWeight: "700" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#d4ede3",
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1a3d31",
    marginBottom: 4,
  },
  modalSubtitle: { fontSize: 13, color: "#7aab96", marginBottom: 20 },
  modalLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1a3d31",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modalInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderColor: "#d4ede3",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fafffe",
  },
  modalInputError: { borderColor: "#e05c5c" },
  modalInputText: {
    flex: 1,
    fontSize: 14,
    color: "#1a3d31",
    fontWeight: "500",
  },
  modalInputErrorText: { fontSize: 12, color: "#e05c5c", marginTop: 4 },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  typeOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#d4ede3",
    backgroundColor: "#fafffe",
  },
  typeOptionText: { fontSize: 12, fontWeight: "700", color: "#9bbfb0" },
  filePicker: {
    borderWidth: 1.5,
    borderColor: "#d4ede3",
    borderStyle: "dashed",
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fafffe",
    marginBottom: 24,
  },
  filePickerText: { fontSize: 14, fontWeight: "600", color: "#7aab96" },
  filePickerSub: { fontSize: 11, color: "#b2dfcf" },
  modalButtons: { flexDirection: "row", gap: 12 },
  cancelModalBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#d4ede3",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelModalBtnText: { fontSize: 15, fontWeight: "700", color: "#7aab96" },
  uploadConfirmBtn: {
    flex: 2,
    height: 50,
    borderRadius: 14,
    backgroundColor: GREEN,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  uploadConfirmBtnText: { fontSize: 15, fontWeight: "700", color: WHITE },
  confirmOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  confirmSheet: {
    backgroundColor: WHITE,
    borderRadius: 24,
    padding: 28,
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  confirmIconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#fdeaea",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1a3d31",
    marginBottom: 10,
    textAlign: "center",
  },
  confirmMsg: {
    fontSize: 14,
    color: "#4a7a66",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  confirmDocName: { fontWeight: "700", color: "#1a3d31" },
  confirmButtons: { flexDirection: "row", gap: 12, width: "100%" },
  confirmCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#d4ede3",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmCancelText: { fontSize: 15, fontWeight: "700", color: "#7aab96" },
  confirmDeleteBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#e05c5c",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmDeleteText: { fontSize: 15, fontWeight: "700", color: WHITE },
  toastBox: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8f7f1",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: "#b2dfcf",
  },
  toastText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2e8b6e",
  },
});