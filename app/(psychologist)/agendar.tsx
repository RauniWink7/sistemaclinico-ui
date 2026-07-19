import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { showAlert } from "../../services/feedback";
import { DateField, TimeField } from "../../components/DateTimeField";
import { todayISODate } from "../../services/dateInput";
import {
  createAppointment,
  getClinicPatients,
  getMe,
  getPsychologists,
} from "../../services/api";

// ─── Tema (mesmo do profissional) ─────────────────────────────────────────────
const GREEN = "#2e8b6e";
const GREEN_LIGHT = "#e8f7f1";
const PAGE_BG = "#e8f1ec";
const WHITE = "#ffffff";
const BORDER = "#dfece5";
const TEXT_DARK = "#17352b";
const MAX_WIDTH = 1120;

const CARD_SHADOW = {
  shadowColor: "#1f5442",
  shadowOpacity: 0.05,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
} as const;

interface SimpleUser {
  id: string;
  label: string;
}

// ─── Seletor de lista (igual ao do admin) ─────────────────────────────────────
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
export default function PsychologistAgendarScreen() {
  const params = useLocalSearchParams<{
    // PatientProfile.id do paciente (pré-selecionado quando vem da ficha)
    patientId?: string;
  }>();

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clinicId, setClinicId] = useState<string | null>(null);
  // ProfessionalProfile.id do próprio psicólogo logado
  const [professionalId, setProfessionalId] = useState<string | null>(null);

  const [patients, setPatients] = useState<SimpleUser[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(
    params.patientId ?? null,
  );

  // Data "AAAA-MM-DD" e hora "HH:MM" (formato dos pickers)
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("50");
  const [ignoreAvailability, setIgnoreAvailability] = useState(false);

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
        if (!meResult.ok || !meResult.data?.clinic || !meResult.data?.id) {
          showAlert("Erro", "Não foi possível identificar o seu perfil.");
          return;
        }

        const cId = meResult.data.clinic;
        setClinicId(cId);

        // Resolve o ProfessionalProfile.id do psicólogo logado, igual à
        // tela de disponibilidade (getMe → getPsychologists → p.user.id).
        const [patientsRes, profsRes] = await Promise.all([
          getClinicPatients(cId),
          getPsychologists(),
        ]);

        const myProfile = profsRes.data?.find(
          (p: any) => p.user?.id === meResult.data.id,
        );
        if (!myProfile) {
          showAlert(
            "Erro",
            "Não foi possível localizar o seu perfil profissional.",
          );
          return;
        }
        setProfessionalId(myProfile.id);

        if (patientsRes.ok) {
          setPatients(
            (patientsRes.data ?? []).map((p: any) => ({
              id: p.id, // PatientProfile.id
              label: p.user?.full_name ?? p.user?.email ?? p.id,
            })),
          );
        }
      } catch (err: any) {
        showAlert("Erro", err?.message ?? "Ocorreu um erro inesperado.");
      } finally {
        setLoadingInitial(false);
      }
    };

    void init();
  }, []);

  const handleSave = async () => {
    if (!selectedPatient) {
      showAlert("Campo obrigatório", "Selecione o paciente.");
      return;
    }
    if (!date || !time) {
      showAlert("Campo obrigatório", "Informe a data e o horário da consulta.");
      return;
    }
    if (!clinicId || !professionalId) {
      showAlert("Erro", "Perfil não identificado. Tente novamente.");
      return;
    }

    const durationMin = parseInt(duration, 10);
    if (isNaN(durationMin) || durationMin < 10) {
      showAlert(
        "Duração inválida",
        "Informe uma duração de pelo menos 10 minutos.",
      );
      return;
    }

    setSaving(true);
    try {
      // Mesmo formato usado no agendamento do admin.
      const scheduledAt = `${date}T${time}:00-03:00`;
      const result = await createAppointment(professionalId, scheduledAt, durationMin, {
        patientId: selectedPatient,
        clinicId,
        ignoreAvailability,
      });

      if (!result.ok) {
        showAlert(
          "Erro ao agendar",
          result.error ?? "Não foi possível criar a consulta.",
        );
        return;
      }

      showAlert("Consulta agendada", "A consulta foi criada com sucesso.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      showAlert("Erro", err?.message ?? "Ocorreu um erro inesperado.");
    } finally {
      setSaving(false);
    }
  };

  const Header = () => (
    <View style={styles.header}>
      <View style={styles.headerInner}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back-outline" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTextBox}>
          <Text style={styles.headerTitle}>Agendar consulta</Text>
        </View>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.replace("/(psychologist)/dashboardP")}
        >
          <Ionicons name="home-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loadingInitial) {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle="light-content" backgroundColor={GREEN} />
        <Header />
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
      <Header />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.container,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Paciente</Text>
            <Selector
              label="Paciente *"
              items={patients}
              selected={selectedPatient}
              onSelect={setSelectedPatient}
            />
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Data e horário</Text>

            <View style={styles.rowFields}>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Data *</Text>
                <DateField value={date} onChange={setDate} min={todayISODate()} />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Hora *</Text>
                <TimeField value={time} onChange={setTime} />
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

            <TouchableOpacity
              style={styles.checkRow}
              onPress={() => setIgnoreAvailability((v) => !v)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={ignoreAvailability ? "checkbox" : "square-outline"}
                size={22}
                color={GREEN}
              />
              <View style={styles.checkTextBox}>
                <Text style={styles.checkLabel}>Ignorar disponibilidade</Text>
                <Text style={styles.checkHint}>
                  Agenda mesmo fora dos horários cadastrados, só para esta consulta.
                </Text>
              </View>
            </TouchableOpacity>
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
  screen: { flex: 1, backgroundColor: PAGE_BG },
  header: { backgroundColor: GREEN, paddingTop: 52, paddingBottom: 20 },
  headerInner: {
    width: "100%",
    maxWidth: MAX_WIDTH,
    alignSelf: "center",
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextBox: { flex: 1 },
  headerTitle: { color: WHITE, fontSize: 21, fontWeight: "800", letterSpacing: -0.3 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
  loadingText: { fontSize: 15, color: GREEN, fontWeight: "600" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 44 },
  container: { width: "100%", maxWidth: MAX_WIDTH, alignSelf: "center" },
  formCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 18,
    marginBottom: 16,
    ...CARD_SHADOW,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: TEXT_DARK,
    marginBottom: 16,
    letterSpacing: -0.2,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#5f7d70",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  selectorGroup: { marginBottom: 4 },
  selectorBtn: {
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d7ebe2",
    backgroundColor: "#f6faf8",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectorBtnText: { fontSize: 15, color: TEXT_DARK, fontWeight: "500", flex: 1 },
  dropdown: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d7ebe2",
    backgroundColor: WHITE,
    overflow: "hidden",
  },
  dropdownEmpty: { padding: 16, fontSize: 14, color: "#94b3a6", textAlign: "center" },
  dropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownItemActive: { backgroundColor: GREEN_LIGHT },
  dropdownItemText: { fontSize: 15, color: TEXT_DARK, fontWeight: "500" },
  dropdownItemTextActive: { color: GREEN, fontWeight: "700" },
  rowFields: { flexDirection: "row", gap: 12 },
  halfField: { flex: 1, minWidth: 0 },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#eef5f1",
  },
  checkTextBox: { flex: 1 },
  checkLabel: { fontSize: 14, fontWeight: "700", color: TEXT_DARK },
  checkHint: { fontSize: 12, color: "#6a887d", marginTop: 2, lineHeight: 16 },
  saveButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: GREEN,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveButtonDisabled: { opacity: 0.75 },
  saveButtonText: { color: WHITE, fontSize: 16, fontWeight: "800" },
  textRealInput: {
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d7ebe2",
    backgroundColor: "#f6faf8",
    paddingHorizontal: 16,
    fontSize: 15,
    color: TEXT_DARK,
    fontWeight: "500",
    marginBottom: 4,
    // @ts-ignore — remove o contorno azul no web
    outlineStyle: "none",
  },
});
