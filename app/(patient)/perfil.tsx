import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import {
    getMe,
    getPatientProfile,
    updateMe,
    updatePatientProfile,
} from "../../services/api";
import { useSavedToast } from "../../components/saved-toast";

// Campos enviados no PATCH /api/auth/patients/{id}/profile/
// phone e full_name NÃO ficam aqui — pertencem ao User, salvos via updateMe
interface ProfilePayload {
  birth_date?: string;
  cpf?: string;
  medical_history?: string;
  anamnesis?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface EditableFields {
  name: string;
  phone: string;
  birthDate: string;
  cpf: string;
  medicalHistory: string;
  anamnesis: string;
  emergencyName: string;
  emergencyPhone: string;
}

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = ({ icon, title }: { icon: string; title: string }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionIconBox}>
      <Ionicons name={icon as any} size={15} color={GREEN} />
    </View>
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

// ─── Info Row (read-only) ─────────────────────────────────────────────────────
const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

// ─── Editable Row ─────────────────────────────────────────────────────────────
interface EditableRowProps {
  label: string;
  value: string;
  onChangeText: (val: string) => void;
  keyboardType?: "default" | "email-address" | "phone-pad" | "numeric";
  editable: boolean;
  readOnly?: boolean;
}

const EditableRow = ({
  label,
  value,
  onChangeText,
  keyboardType,
  editable,
  readOnly,
}: EditableRowProps) => (
  <View style={styles.editableRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    {editable && !readOnly ? (
      <TextInput
        style={styles.editInput}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? "default"}
        autoCapitalize="none"
        placeholderTextColor="#9bbfb0"
      />
    ) : (
      <Text style={[styles.infoValue, readOnly && styles.infoValueMuted]}>
        {value}
      </Text>
    )}
  </View>
);

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const { showToast, toast } = useSavedToast();
  const [fields, setFields] = useState<EditableFields>({
    name: "",
    phone: "",
    birthDate: "",
    cpf: "",
    medicalHistory: "",
    anamnesis: "",
    emergencyName: "",
    emergencyPhone: "",
  });
  const [original, setOriginal] = useState<EditableFields>({ ...fields });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  React.useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      const meResult = await getMe();
      if (!meResult.ok || !meResult.data?.id) {
        Alert.alert(
          "Erro",
          meResult.error || "Não foi possível carregar o perfil.",
        );
        setLoading(false);
        return;
      }

      const profileResult = await getPatientProfile(meResult.data.id);
      if (!profileResult.ok || !profileResult.data) {
        Alert.alert(
          "Erro",
          profileResult.error || "Não foi possível carregar o perfil.",
        );
        setLoading(false);
        return;
      }

      const profile = profileResult.data;
      setFields({
        name: profile.user.full_name || profile.user.email || "",
        phone: profile.user.phone || "",
        birthDate: profile.birth_date || "",
        cpf: profile.cpf || "",
        medicalHistory: profile.medical_history || "",
        anamnesis: profile.anamnesis || "",
        emergencyName: profile.emergency_contact_name || "",
        emergencyPhone: profile.emergency_contact_phone || "",
      });
      setEmail(profile.user.email || "");
      setOriginal({
        name: profile.user.full_name || profile.user.email || "",
        phone: profile.user.phone || "",
        birthDate: profile.birth_date || "",
        cpf: profile.cpf || "",
        medicalHistory: profile.medical_history || "",
        anamnesis: profile.anamnesis || "",
        emergencyName: profile.emergency_contact_name || "",
        emergencyPhone: profile.emergency_contact_phone || "",
      });
      setLoading(false);
    };

    void loadProfile();
  }, []);

  React.useEffect(() => {
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

  const set = (field: keyof EditableFields) => (val: string) => {
    setFields((prev) => ({ ...prev, [field]: val }));
  };

  const handleEdit = () => {
    setOriginal({ ...fields });
    setEditing(true);
  };

  const handleCancel = () => {
    setFields({ ...original });
    setEditing(false);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const meResult = await getMe();
      if (!meResult.ok || !meResult.data?.id) {
        Alert.alert("Erro", "Não foi possível identificar o paciente.");
        setLoading(false);
        return;
      }

      const userId = meResult.data.id;

      // ── Passo 1: salvar full_name e phone no User via PATCH /api/auth/me/
      // phone pertence ao model User — updatePatientProfile não consegue salvá-lo
      const meUpdateResult = await updateMe({
        full_name: fields.name,
        phone: fields.phone,
      });
      if (!meUpdateResult.ok) {
        console.error(
          "Erro ao salvar dados do usuário:",
          meUpdateResult.error,
          meUpdateResult.data,
        );
        Alert.alert(
          "Erro",
          meUpdateResult.error || "Não foi possível salvar nome/telefone.",
        );
        return;
      }

      // ── Passo 2: salvar campos do PatientProfile
      const profilePayload: ProfilePayload = {
        birth_date: fields.birthDate || undefined,
        cpf: fields.cpf || undefined,
        medical_history: fields.medicalHistory || undefined,
        anamnesis: fields.anamnesis || undefined,
        emergency_contact_name: fields.emergencyName || undefined,
        emergency_contact_phone: fields.emergencyPhone || undefined,
      };

      const profileResult = await updatePatientProfile(userId, profilePayload);
      if (!profileResult.ok) {
        console.error(
          "Erro ao salvar perfil:",
          profileResult.error,
          profileResult.data,
        );
        Alert.alert(
          "Erro",
          profileResult.error || "Não foi possível salvar as alterações.",
        );
        return;
      }

      setOriginal({ ...fields });
      setEditing(false);
      showToast("Perfil atualizado com sucesso!");
    } catch {
      Alert.alert("Erro", "Não foi possível salvar as alterações.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back-outline" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meu Perfil</Text>
        {!editing ? (
          <TouchableOpacity style={styles.editBtn} onPress={handleEdit}>
            <Ionicons name="pencil-outline" size={18} color="#fff" />
            <Text style={styles.editBtnText}>Editar</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Avatar ── */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {fields.name
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
          </Text>
        </View>
        <Text style={styles.avatarName}>{fields.name || "Paciente"}</Text>
        <Text style={styles.avatarEmail}>{email || "carregando..."}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          {/* ── Dados Pessoais ── */}
          <View style={styles.card}>
            <SectionHeader icon="person-outline" title="Dados Pessoais" />

            <EditableRow
              label="Nome completo"
              value={fields.name}
              onChangeText={set("name")}
              editable={editing}
            />
            <View style={styles.rowDivider} />

            <InfoRow label="E-mail" value={email || "---"} />
            <View style={styles.rowDivider} />

            <EditableRow
              label="Telefone"
              value={fields.phone}
              onChangeText={set("phone")}
              keyboardType="phone-pad"
              editable={editing}
            />
            <View style={styles.rowDivider} />

            <EditableRow
              label="Data de nascimento"
              value={fields.birthDate}
              onChangeText={set("birthDate")}
              editable={editing}
            />
            <View style={styles.rowDivider} />

            <EditableRow
              label="CPF"
              value={fields.cpf}
              onChangeText={set("cpf")}
              keyboardType="numeric"
              editable={editing}
            />
          </View>

          {/* ── Histórico Médico ── */}
          <View style={styles.card}>
            <SectionHeader
              icon="document-text-outline"
              title="Histórico Médico"
            />

            <EditableRow
              label="Histórico Médico"
              value={fields.medicalHistory}
              onChangeText={set("medicalHistory")}
              editable={editing}
            />
            <View style={styles.rowDivider} />

            <EditableRow
              label="Anamnese"
              value={fields.anamnesis}
              onChangeText={set("anamnesis")}
              editable={editing}
            />
          </View>

          {/* ── Contato de Emergência ── */}
          <View style={styles.card}>
            <SectionHeader icon="call-outline" title="Contato de Emergência" />

            <EditableRow
              label="Nome"
              value={fields.emergencyName}
              onChangeText={set("emergencyName")}
              editable={editing}
            />
            <View style={styles.rowDivider} />

            <EditableRow
              label="Telefone"
              value={fields.emergencyPhone}
              onChangeText={set("emergencyPhone")}
              keyboardType="phone-pad"
              editable={editing}
            />
          </View>

          {/* ── Botão Salvar ── */}
          {editing && (
            <TouchableOpacity
              style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-outline" size={18} color="#fff" />
                  <Text style={styles.saveBtnText}>Salvar alterações</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </Animated.View>
      </ScrollView>
      {toast}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const GREEN = "#2e8b6e";
const WHITE = "#ffffff";
const BG = "#f0faf5";

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
  },

  // Header
  header: {
    backgroundColor: GREEN,
    paddingTop: 52,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: WHITE,
    letterSpacing: 0.2,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  editBtnText: {
    color: WHITE,
    fontSize: 13,
    fontWeight: "700",
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  cancelBtnText: {
    color: WHITE,
    fontSize: 13,
    fontWeight: "600",
  },

  // Avatar section
  avatarSection: {
    backgroundColor: GREEN,
    alignItems: "center",
    paddingBottom: 28,
    paddingTop: 4,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
  },
  avatarText: {
    fontSize: 26,
    fontWeight: "800",
    color: WHITE,
  },
  avatarName: {
    fontSize: 18,
    fontWeight: "800",
    color: WHITE,
    letterSpacing: -0.3,
  },
  avatarEmail: {
    fontSize: 13,
    color: "#b2dfcf",
    marginTop: 3,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    padding: 20,
    paddingBottom: 48,
    maxWidth: 960,
    alignSelf: 'center' as const,
    width: '100%' as const,
  },

  // Card
  card: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },

  // Section header
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  sectionIconBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "#e8f7f1",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a3d31",
    letterSpacing: 0.1,
  },

  // Info row
  infoRow: {
    paddingVertical: 10,
  },
  infoLabel: {
    fontSize: 11,
    color: "#7aab96",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 15,
    color: "#1a3d31",
    fontWeight: "500",
  },
  infoValueMuted: {
    color: "#4a7a66",
  },

  // Editable row
  editableRow: {
    paddingVertical: 10,
  },
  editInput: {
    fontSize: 15,
    color: "#1a3d31",
    fontWeight: "500",
    borderBottomWidth: 1.5,
    borderBottomColor: GREEN,
    paddingBottom: 4,
    paddingTop: 2,
  },

  // Divider
  rowDivider: {
    height: 1,
    backgroundColor: "#f0f8f4",
  },

  // Read-only badge
  readOnlyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f0faf5",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 12,
  },
  readOnlyText: {
    fontSize: 11,
    color: "#7aab96",
    fontWeight: "600",
  },

  // Long text
  longText: {
    fontSize: 14,
    color: "#3a6054",
    lineHeight: 22,
  },

  // Save button
  saveBtn: {
    backgroundColor: GREEN,
    borderRadius: 16,
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
