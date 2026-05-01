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
import { getMe, getPsychologists, updateMe, updateProfessionalProfile } from "../../services/api";

// ─── Types ────────────────────────────────────────────────────────────────────
interface EditableFields {
  name: string;
  phone: string;
  crp: string;
  specialty: string;
  bio: string;
}

// ─── Colors ───────────────────────────────────────────────────────────────────
const GREEN = "#2e8b6e";
const GREEN_LIGHT = "#e8f7f1";
const BG = "#f0faf5";
const WHITE = "#ffffff";

// ─── Sub-components ───────────────────────────────────────────────────────────
const SectionHeader = ({ icon, title }: { icon: string; title: string }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionIconBox}>
      <Ionicons name={icon as any} size={15} color={GREEN} />
    </View>
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

interface EditableRowProps {
  label: string;
  value: string;
  onChangeText: (val: string) => void;
  keyboardType?: "default" | "phone-pad" | "numeric";
  editable: boolean;
  multiline?: boolean;
  readOnly?: boolean;
}

const EditableRow = ({
  label,
  value,
  onChangeText,
  keyboardType,
  editable,
  multiline,
  readOnly,
}: EditableRowProps) => (
  <View style={styles.editableRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    {editable && !readOnly ? (
      <TextInput
        style={[styles.editInput, multiline && styles.editInputMultiline]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? "default"}
        autoCapitalize="none"
        placeholderTextColor="#9bbfb0"
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
    ) : (
      <Text style={[styles.infoValue, readOnly && styles.infoValueMuted]}>
        {value || "—"}
      </Text>
    )}
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PsychologistProfileScreen() {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [fields, setFields] = useState<EditableFields>({
    name: "",
    phone: "",
    crp: "",
    specialty: "",
    bio: "",
  });
  const [original, setOriginal] = useState<EditableFields>({ ...fields });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  React.useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      const meResult = await getMe();
      if (!meResult.ok || !meResult.data?.id) {
        Alert.alert("Erro", meResult.error || "Não foi possível carregar o perfil.");
        setLoading(false);
        return;
      }

      const profsResult = await getPsychologists();
      const myProfile = profsResult.data?.find(
        (p: any) => p.user.id === meResult.data.id,
      );

      if (myProfile) {
        setProfessionalId(myProfile.id);
        const loaded: EditableFields = {
          name: meResult.data.full_name || meResult.data.name || "",
          phone: meResult.data.phone || "",
          crp: myProfile.crp || "",
          specialty: myProfile.specialty || "",
          bio: myProfile.bio || "",
        };
        setFields(loaded);
        setOriginal(loaded);
        setEmail(meResult.data.email || "");
      }

      setLoading(false);
    };

    void loadProfile();
  }, []);

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const set = (field: keyof EditableFields) => (val: string) =>
    setFields((prev) => ({ ...prev, [field]: val }));

  const handleEdit = () => {
    setOriginal({ ...fields });
    setEditing(true);
  };

  const handleCancel = () => {
    setFields({ ...original });
    setEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const meUpdate = await updateMe({ full_name: fields.name, phone: fields.phone });
      if (!meUpdate.ok) {
        Alert.alert("Erro", meUpdate.error || "Não foi possível salvar nome/telefone.");
        return;
      }

      if (professionalId) {
        const profUpdate = await updateProfessionalProfile(professionalId, {
          crp: fields.crp || undefined,
          specialty: fields.specialty || undefined,
          bio: fields.bio || undefined,
        });
        if (!profUpdate.ok) {
          Alert.alert("Erro", profUpdate.error || "Não foi possível salvar perfil profissional.");
          return;
        }
      }

      setOriginal({ ...fields });
      setEditing(false);
      Alert.alert("Sucesso", "Perfil atualizado com sucesso!");
    } catch {
      Alert.alert("Erro", "Não foi possível salvar as alterações.");
    } finally {
      setSaving(false);
    }
  };

  const initials = fields.name
    .split(" ")
    .filter((n) => n.length > 1)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

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
          {loading ? (
            <ActivityIndicator color={WHITE} />
          ) : (
            <Text style={styles.avatarText}>{initials || "P"}</Text>
          )}
        </View>
        <Text style={styles.avatarName}>{fields.name || "Profissional"}</Text>
        <Text style={styles.avatarEmail}>{email || "carregando..."}</Text>
        {fields.crp ? (
          <View style={styles.crpBadge}>
            <Ionicons name="ribbon-outline" size={12} color={GREEN} />
            <Text style={styles.crpBadgeText}>CRP {fields.crp}</Text>
          </View>
        ) : null}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* ── Dados Pessoais ── */}
          <View style={styles.card}>
            <SectionHeader icon="person-outline" title="Dados Pessoais" />
            <EditableRow label="Nome completo" value={fields.name} onChangeText={set("name")} editable={editing} />
            <View style={styles.rowDivider} />
            <EditableRow label="E-mail" value={email} onChangeText={() => {}} editable={editing} readOnly />
            <View style={styles.rowDivider} />
            <EditableRow label="Telefone" value={fields.phone} onChangeText={set("phone")} keyboardType="phone-pad" editable={editing} />
          </View>

          {/* ── Dados Profissionais ── */}
          <View style={styles.card}>
            <SectionHeader icon="briefcase-outline" title="Dados Profissionais" />
            <EditableRow label="CRP" value={fields.crp} onChangeText={set("crp")} editable={editing} />
            <View style={styles.rowDivider} />
            <EditableRow label="Especialidade" value={fields.specialty} onChangeText={set("specialty")} editable={editing} />
            <View style={styles.rowDivider} />
            <EditableRow label="Bio / Apresentação" value={fields.bio} onChangeText={set("bio")} editable={editing} multiline />
          </View>


          {/* ── Botão Salvar ── */}
          {editing && (
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
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
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

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
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: WHITE, letterSpacing: 0.2 },
  editBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
  },
  editBtnText: { color: WHITE, fontSize: 13, fontWeight: "700" },
  cancelBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  cancelBtnText: { color: WHITE, fontSize: 13, fontWeight: "600" },

  avatarSection: {
    backgroundColor: GREEN, alignItems: "center", paddingBottom: 28, paddingTop: 4,
  },
  avatar: {
    width: 76, height: 76, borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 10, borderWidth: 2, borderColor: "rgba(255,255,255,0.35)",
  },
  avatarText: { fontSize: 26, fontWeight: "800", color: WHITE },
  avatarName: { fontSize: 18, fontWeight: "800", color: WHITE, letterSpacing: -0.3 },
  avatarEmail: { fontSize: 13, color: "#b2dfcf", marginTop: 3 },
  crpBadge: {
    marginTop: 8, flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
  },
  crpBadgeText: { fontSize: 12, fontWeight: "700", color: WHITE },

  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 48 },

  card: {
    backgroundColor: WHITE, borderRadius: 20, padding: 18, marginBottom: 16,
    shadowColor: GREEN, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
  },

  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  sectionIconBox: {
    width: 26, height: 26, borderRadius: 8, backgroundColor: GREEN_LIGHT,
    alignItems: "center", justifyContent: "center",
  },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#1a3d31", letterSpacing: 0.1 },

  infoLabel: {
    fontSize: 11, color: "#7aab96", fontWeight: "600",
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3,
  },
  infoValue: { fontSize: 15, color: "#1a3d31", fontWeight: "500" },
  infoValueMuted: { color: "#4a7a66" },

  editableRow: { paddingVertical: 10 },
  editInput: {
    fontSize: 15, color: "#1a3d31", fontWeight: "500",
    borderBottomWidth: 1.5, borderBottomColor: GREEN,
    paddingBottom: 4, paddingTop: 2,
  },
  editInputMultiline: {
    minHeight: 60, borderWidth: 1.5, borderColor: GREEN,
    borderRadius: 8, padding: 8, borderBottomWidth: 1.5,
  },

  rowDivider: { height: 1, backgroundColor: "#f0f8f4" },

  availabilityLink: {
    backgroundColor: WHITE, borderRadius: 20, padding: 18, marginBottom: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    shadowColor: GREEN, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
  },
  availabilityLinkLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  availabilityLinkIcon: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: GREEN_LIGHT,
    alignItems: "center", justifyContent: "center",
  },
  availabilityLinkTitle: { fontSize: 15, fontWeight: "700", color: "#1a3d31" },
  availabilityLinkSub: { fontSize: 12, color: "#7aab96", marginTop: 2 },

  saveBtn: {
    backgroundColor: GREEN, borderRadius: 16, height: 54,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    marginTop: 4, marginBottom: 16,
    shadowColor: GREEN, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: WHITE, fontSize: 16, fontWeight: "700", letterSpacing: 0.2 },
});