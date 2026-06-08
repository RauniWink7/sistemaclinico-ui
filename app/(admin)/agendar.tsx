import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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
  createAppointment,
  getClinicPatients,
  getMe,
  getProfessionalsByClinic,
} from "../../services/api";

const GREEN = "#2e8b6e";
const GREEN_DARK = "#1f684f";
const GREEN_LIGHT = "#e8f7f1";
const BG = "#f0faf5";
const WHITE = "#ffffff";

interface SimpleUser {
  id: string;
  label: string;
}

const DecorativeBackground = () => (
  <>
    <View style={styles.circle1} />
    <View style={styles.circle2} />
  </>
);

// ─── Seletor de lista ─────────────────────────────────────────────────────────
const Selector = ({
  label,
  items,
  selected,
  onSelect,
}: {
  label: string;
  items: SimpleUser[];
  selected: string | null;
  onSelect: (id: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const selectedLabel =
    items.find((i) => i.id === selected)?.label ?? "Selecione...";

  return (
    <View style={styles.selectorGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity
        style={styles.selectorBtn}
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.85}
      >
        <Text
          style={[styles.selectorBtnText, !selected && { color: "#94b3a6" }]}
        >
          {selectedLabel}
        </Text>
        <Ionicons
          name={open ? "chevron-up-outline" : "chevron-down-outline"}
          size={18}
          color="#6c8c80"
        />
      </TouchableOpacity>
      {open && (
        <View style={styles.dropdown}>
          {items.length === 0 ? (
            <Text style={styles.dropdownEmpty}>Nenhum item disponível</Text>
          ) : (
            items.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.dropdownItem,
                  selected === item.id && styles.dropdownItemActive,
                ]}
                onPress={() => {
                  onSelect(item.id);
                  setOpen(false);
                }}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    selected === item.id && styles.dropdownItemTextActive,
                  ]}
                >
                  {item.label}
                </Text>
                {selected === item.id && (
                  <Ionicons name="checkmark-outline" size={16} color={GREEN} />
                )}
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
    </View>
  );
};

// ─── Tela principal ───────────────────────────────────────────────────────────
export default function AdminAgendarScreen() {
  const params = useLocalSearchParams<{
    patientId?: string;
    professionalId?: string;
  }>();

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [patientUserId, setPatientUserId] = useState<string | null>(null);

  const [patients, setPatients] = useState<SimpleUser[]>([]);
  const [professionals, setProfessionals] = useState<SimpleUser[]>([]);

  const [selectedPatient, setSelectedPatient] = useState<string | null>(
    params.patientId ?? null,
  );
  const [selectedProfessional, setSelectedProfessional] = useState<
    string | null
  >(params.professionalId ?? null);

  // Data e hora como strings simples (ex: "2026-05-10", "14:30")
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("50");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

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

  useEffect(() => {
    const init = async () => {
      try {
        setLoadingInitial(true);

        const meResult = await getMe();
        if (!meResult.ok || !meResult.data?.clinic) {
          Alert.alert("Erro", "Não foi possível identificar a clínica.");
          return;
        }

        const cId = meResult.data.clinic;
        const uId = meResult.data.id;
        setClinicId(cId);
        setPatientUserId(uId);

        const [patientsRes, professionalsRes] = await Promise.all([
          getClinicPatients(cId),
          getProfessionalsByClinic(cId),
        ]);

        // LOG TEMPORÁRIO — remover depois
        console.log(
          "patients raw:",
          JSON.stringify(patientsRes.data?.slice(0, 2)),
        );
        if (patientsRes.ok) {
          setPatients(
            (patientsRes.data ?? []).map((p: any) => ({
              id: p.id,
              label: p.user?.full_name ?? p.user?.email ?? p.id, // PatientProfile: nome em p.user.full_name
            })),
          );
        }

        if (professionalsRes.ok) {
          setProfessionals(
            (professionalsRes.data ?? []).map((p: any) => ({
              id: p.id,
              label: p.user?.full_name ?? p.user?.email ?? p.id,
            })),
          );
        }
      } catch (err: any) {
        Alert.alert("Erro", err?.message ?? "Ocorreu um erro inesperado.");
      } finally {
        setLoadingInitial(false);
      }
    };

    void init();
  }, []);

  const handleSave = async () => {
    if (!selectedPatient) {
      Alert.alert("Campo obrigatório", "Selecione o paciente.");
      return;
    }
    if (!selectedProfessional) {
      Alert.alert("Campo obrigatório", "Selecione o psicólogo.");
      return;
    }
    if (!date || !time) {
      Alert.alert(
        "Campo obrigatório",
        "Informe a data e o horário da consulta.",
      );
      return;
    }
    if (!clinicId) {
      Alert.alert("Erro", "Clínica não identificada.");
      return;
    }

    // Valida formato de data e hora
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!dateRegex.test(date)) {
      Alert.alert(
        "Data inválida",
        "Use o formato AAAA-MM-DD (ex: 2026-05-10).",
      );
      return;
    }
    if (!timeRegex.test(time)) {
      Alert.alert("Hora inválida", "Use o formato HH:MM (ex: 14:30).");
      return;
    }

    const durationMin = parseInt(duration, 10);
    if (isNaN(durationMin) || durationMin < 10) {
      Alert.alert(
        "Duração inválida",
        "Informe uma duração de pelo menos 10 minutos.",
      );
      return;
    }

    setSaving(true);
    try {
      const scheduledAt = `${date}T${time}:00-03:00`;
      const result = await createAppointment(
        selectedProfessional,
        scheduledAt,
        durationMin,
        { patientId: selectedPatient, clinicId },
      );

      if (!result.ok) {
        Alert.alert(
          "Erro ao agendar",
          result.error ?? "Não foi possível criar a consulta.",
        );
        return;
      }

      Alert.alert("Consulta agendada", "A consulta foi criada com sucesso.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert("Erro", err?.message ?? "Ocorreu um erro inesperado.");
    } finally {
      setSaving(false);
    }
  };

  if (loadingInitial) {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle="light-content" backgroundColor={GREEN} />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back-outline" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTextBox}>
            <Text style={styles.headerEyebrow}>Area administrativa</Text>
            <Text style={styles.headerTitle}>Novo agendamento</Text>
          </View>
          <View style={{ width: 42 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GREEN} />
          <Text style={styles.loadingText}>Carregando dados...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN} />
      <DecorativeBackground />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back-outline" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTextBox}>
          <Text style={styles.headerEyebrow}>Area administrativa</Text>
          <Text style={styles.headerTitle}>Novo agendamento</Text>
        </View>
        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => router.replace("/(admin)")}
        >
          <Ionicons name="grid-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          <View style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>Agendamento</Text>
            <Text style={styles.heroTitle}>Nova consulta</Text>
            <Text style={styles.heroSubtitle}>
              Selecione o paciente, o psicólogo e defina a data e horário do
              atendimento.
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Participantes</Text>

            <Selector
              label="Paciente *"
              items={patients}
              selected={selectedPatient}
              onSelect={setSelectedPatient}
            />

            <Selector
              label="Psicólogo *"
              items={professionals}
              selected={selectedProfessional}
              onSelect={setSelectedProfessional}
            />
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Data e horario</Text>

            <Text style={styles.fieldLabel}>Data e Hora</Text>

            {/* Campos reais */}
            <View style={styles.rowFields}>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Data * (AAAA-MM-DD)</Text>
                <TextInput
                  style={styles.textRealInput}
                  value={date}
                  onChangeText={setDate}
                  placeholder="2026-05-10"
                  placeholderTextColor="#94b3a6"
                />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Hora * (HH:MM)</Text>
                <TextInput
                  style={styles.textRealInput}
                  value={time}
                  onChangeText={setTime}
                  placeholder="14:30"
                  placeholderTextColor="#94b3a6"
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Duração (minutos)</Text>
            <TextInput
              style={styles.textRealInput}
              value={duration}
              onChangeText={setDuration}
              placeholder="50"
              placeholderTextColor="#94b3a6"
              keyboardType="numeric"
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color="#fff"
                />
                <Text style={styles.saveButtonText}>Confirmar agendamento</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  circle1: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "#27795f",
    top: -110,
    right: -70,
    opacity: 0.45,
  },
  circle2: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: GREEN_DARK,
    top: -55,
    left: -70,
    opacity: 0.28,
  },
  header: {
    paddingTop: 56,
    paddingBottom: 24,
    paddingHorizontal: 24,
    backgroundColor: GREEN,
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
  headerEyebrow: { color: "#bce3d5", fontSize: 13, fontWeight: "600" },
  headerTitle: {
    color: WHITE,
    fontSize: 24,
    fontWeight: "800",
    marginTop: 2,
    letterSpacing: -0.4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  loadingText: { fontSize: 15, color: GREEN, fontWeight: "600" },
  scroll: { flex: 1 },
  scrollContent: { padding: 22, paddingBottom: 40 },
  heroCard: {
    backgroundColor: WHITE,
    borderRadius: 28,
    padding: 22,
    marginTop: -18,
    marginBottom: 20,
    shadowColor: "#174c3e",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: GREEN,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  heroTitle: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: "800",
    color: "#173d31",
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: "#5e7b70",
  },
  formCard: {
    backgroundColor: WHITE,
    borderRadius: 26,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#174c3e",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#173d31",
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#5f7d70",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  selectorGroup: { marginBottom: 16 },
  selectorBtn: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#d7ebe2",
    backgroundColor: "#fbfefd",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectorBtnText: {
    fontSize: 15,
    color: "#173d31",
    fontWeight: "500",
    flex: 1,
  },
  dropdown: {
    marginTop: 4,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#d7ebe2",
    backgroundColor: WHITE,
    overflow: "hidden",
  },
  dropdownEmpty: {
    padding: 16,
    fontSize: 14,
    color: "#94b3a6",
    textAlign: "center",
  },
  dropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownItemActive: { backgroundColor: GREEN_LIGHT },
  dropdownItemText: { fontSize: 15, color: "#173d31", fontWeight: "500" },
  dropdownItemTextActive: { color: GREEN, fontWeight: "700" },
  rowFields: { flexDirection: "row", gap: 12, marginBottom: 0 },
  halfField: { flex: 1 },
  inputBox: { display: "none" },
  inputTextWrapper: {},
  inputText: {},
  inputPlaceholder: {},
  inputIcon: {},
  textInputBox: { display: "none" },
  textInputLabel: {},
  textInputValue: {},
  saveButton: {
    height: 54,
    borderRadius: 16,
    backgroundColor: GREEN,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  saveButtonDisabled: { opacity: 0.75 },
  saveButtonText: { color: WHITE, fontSize: 16, fontWeight: "700" },
  textRealInput: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#d7ebe2",
    backgroundColor: "#fbfefd",
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#173d31",
    fontWeight: "500",
    marginBottom: 14,
  },
});
