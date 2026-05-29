import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
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
import { getClinicData, getMe, updateClinic } from "../../services/api";
import { useSavedToast } from "../../components/saved-toast";

const GREEN = "#2e8b6e";
const GREEN_DARK = "#1f684f";
const GREEN_LIGHT = "#e8f7f1";
const BG = "#f0faf5";
const WHITE = "#ffffff";

// Todos os horários do dia em intervalos de 30 minutos (00:00 → 23:30)
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const min = i % 2 === 0 ? "00" : "30";
  return `${String(hour).padStart(2, "0")}:${min}`;
});

interface ClinicForm {
  name: string;
  address: string;
  phone: string;
  email: string;
  openingTime: string;
  closingTime: string;
}

const TimeSelect = ({
  label,
  value,
  open,
  onToggle,
  onSelect,
}: {
  label: string;
  value: string;
  open: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
}) => (
  <View style={styles.timeCard}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TouchableOpacity
      style={styles.timeSelectBtn}
      onPress={onToggle}
      activeOpacity={0.85}
    >
      <Ionicons name="time-outline" size={16} color={GREEN} />
      <Text style={[styles.timeSelectText, !value && { color: "#94b3a6" }]}>
        {value || "Selecione"}
      </Text>
      <Ionicons
        name={open ? "chevron-up-outline" : "chevron-down-outline"}
        size={16}
        color={GREEN}
      />
    </TouchableOpacity>
    {open && (
      <ScrollView
        style={styles.timeDropdown}
        nestedScrollEnabled
        showsVerticalScrollIndicator
      >
        {TIME_OPTIONS.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.timeOption, value === t && styles.timeOptionActive]}
            onPress={() => onSelect(t)}
          >
            <Text
              style={[
                styles.timeOptionText,
                value === t && styles.timeOptionTextActive,
              ]}
            >
              {t}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    )}
  </View>
);

const DecorativeBackground = () => (
  <>
    <View style={styles.circle1} />
    <View style={styles.circle2} />
  </>
);

const InputField = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "email-address" | "phone-pad";
}) => (
  <View style={styles.inputGroup}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#94b3a6"
      keyboardType={keyboardType ?? "default"}
    />
  </View>
);

export default function AdminClinicManagementScreen() {
  const emptyForm: ClinicForm = {
    name: "",
    address: "",
    phone: "",
    email: "",
    openingTime: "",
    closingTime: "",
  };

  const { showToast, toast } = useSavedToast();
  const [form, setForm] = useState<ClinicForm>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [openPicker, setOpenPicker] = useState<null | "open" | "close">(null);

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

  // Carregamento de dados da clínica ao montar a tela
  useEffect(() => {
    const loadClinicData = async () => {
      try {
        setLoadingInitial(true);

        // 1. Busca usuário logado para obter clinic_id
        const meResult = await getMe();
        if (!meResult.ok || !meResult.data) {
          Alert.alert(
            "Erro",
            meResult.error ?? "Não foi possível carregar o perfil.",
          );
          return;
        }

        const cId = meResult.data.clinic;
        if (!cId) {
          Alert.alert("Erro", "Nenhuma clínica associada ao usuário.");
          return;
        }

        setClinicId(cId);

        // 2. Busca dados da clínica
        const clinicResult = await getClinicData(cId);
        if (!clinicResult.ok || !clinicResult.data) {
          Alert.alert(
            "Erro",
            clinicResult.error ??
              "Não foi possível carregar os dados da clínica.",
          );
          return;
        }

        const clinicData = clinicResult.data;
        setForm({
          name: clinicData.name || "",
          address: clinicData.address || "",
          phone: clinicData.phone || "",
          email: clinicData.email || "",
          openingTime: (clinicData.open_from || "").slice(0, 5),
          closingTime: (clinicData.open_until || "").slice(0, 5),
        });
      } catch (err: any) {
        Alert.alert(
          "Erro",
          err?.message ?? "Ocorreu um erro inesperado ao carregar dados.",
        );
      } finally {
        setLoadingInitial(false);
      }
    };

    void loadClinicData();
  }, []);

  const setField = (field: keyof ClinicForm) => (value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    if (!clinicId) {
      Alert.alert("Erro", "Clínica não identificada.");
      return;
    }

    // Validação simples
    if (!form.openingTime || !form.closingTime) {
      Alert.alert(
        "Erro",
        "Selecione os horários de abertura e fechamento.",
      );
      return;
    }

    if (form.openingTime >= form.closingTime) {
      Alert.alert(
        "Erro",
        "O horário de abertura deve ser antes do fechamento.",
      );
      return;
    }

    setLoading(true);

    try {
      const result = await updateClinic(clinicId, {
        name: form.name,
        address: form.address,
        phone: form.phone,
        email: form.email,
        open_from: form.openingTime,
        open_until: form.closingTime,
      });

      if (!result.ok) {
        Alert.alert(
          "Erro",
          result.error ?? "Não foi possível salvar os dados.",
        );
        return;
      }

      showToast("Informações da clínica salvas");
    } catch (err: any) {
      Alert.alert("Erro", err?.message ?? "Ocorreu um erro inesperado.");
    } finally {
      setLoading(false);
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
            <Text style={styles.headerTitle}>Gerenciamento da clinica</Text>
          </View>
          <TouchableOpacity
            style={styles.homeBtn}
            onPress={() => router.replace("/(admin)")}
          >
            <Ionicons name="grid-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
          }}
        >
          <ActivityIndicator size="large" color={GREEN} />
          <Text style={{ fontSize: 15, color: GREEN, fontWeight: "600" }}>
            Carregando dados...
          </Text>
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
          <Text style={styles.headerTitle}>Gerenciamento da clinica</Text>
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
            <Text style={styles.heroEyebrow}>Edicao</Text>
            <Text style={styles.heroTitle}>Dados institucionais</Text>
            <Text style={styles.heroSubtitle}>
              Atualize as informacoes principais da clinica e o horario de
              funcionamento do painel.
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Informacoes da clinica</Text>

            <InputField
              label="Nome da clinica"
              value={form.name}
              onChangeText={setField("name")}
              placeholder="Digite o nome da clinica"
            />

            <InputField
              label="Endereco"
              value={form.address}
              onChangeText={setField("address")}
              placeholder="Digite o endereco"
            />

            <InputField
              label="Telefone"
              value={form.phone}
              onChangeText={setField("phone")}
              placeholder="Digite o telefone"
              keyboardType="phone-pad"
            />

            <InputField
              label="E-mail"
              value={form.email}
              onChangeText={setField("email")}
              placeholder="Digite o e-mail"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Horario de funcionamento</Text>
            <Text style={styles.sectionSubtitle}>
              Defina os horarios padrao de abertura e fechamento da clinica.
            </Text>

            <View style={styles.timeRow}>
              <TimeSelect
                label="Abertura"
                value={form.openingTime}
                open={openPicker === "open"}
                onToggle={() =>
                  setOpenPicker((prev) => (prev === "open" ? null : "open"))
                }
                onSelect={(t) => {
                  setField("openingTime")(t);
                  setOpenPicker(null);
                }}
              />

              <TimeSelect
                label="Fechamento"
                value={form.closingTime}
                open={openPicker === "close"}
                onToggle={() =>
                  setOpenPicker((prev) => (prev === "close" ? null : "close"))
                }
                onSelect={(t) => {
                  setField("closingTime")(t);
                  setOpenPicker(null);
                }}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            activeOpacity={0.85}
            disabled={loading}
          >
            <Ionicons name="save-outline" size={18} color="#fff" />
            <Text style={styles.saveButtonText}>
              {loading ? "Salvando..." : "Salvar alteracoes"}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
      {toast}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
  },
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
  headerTextBox: {
    flex: 1,
    marginHorizontal: 14,
  },
  headerEyebrow: {
    color: "#bce3d5",
    fontSize: 13,
    fontWeight: "600",
  },
  headerTitle: {
    color: WHITE,
    fontSize: 24,
    fontWeight: "800",
    marginTop: 2,
    letterSpacing: -0.4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 22,
    paddingBottom: 40,
    maxWidth: 960,
    alignSelf: 'center' as const,
    width: '100%' as const,
  },
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
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: "#6c877c",
    marginBottom: 14,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#5f7d70",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#d7ebe2",
    backgroundColor: "#fbfefd",
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#173d31",
    fontWeight: "500",
  },
  timeRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  timeCard: {
    flex: 1,
  },
  timeSelectBtn: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#d7ebe2",
    backgroundColor: GREEN_LIGHT,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timeSelectText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#173d31",
  },
  timeDropdown: {
    maxHeight: 200,
    marginTop: 6,
    borderWidth: 1.5,
    borderColor: "#d7ebe2",
    borderRadius: 16,
    backgroundColor: WHITE,
  },
  timeOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  timeOptionActive: {
    backgroundColor: GREEN_LIGHT,
  },
  timeOptionText: {
    fontSize: 14,
    color: "#3a6054",
    fontWeight: "500",
  },
  timeOptionTextActive: {
    color: GREEN,
    fontWeight: "700",
  },
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
  saveButtonDisabled: {
    opacity: 0.75,
  },
  saveButtonText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "700",
  },
});
