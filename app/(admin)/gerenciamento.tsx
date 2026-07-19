import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
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
import { TimeField } from "../../components/DateTimeField";
import { getClinicData, getMe, updateClinic } from "../../services/api";

// ─── Tema (mesmo do profissional) ─────────────────────────────────────────────
const GREEN = "#2e8b6e";
const PAGE_BG = "#e8f1ec";
const WHITE = "#ffffff";
const BORDER = "#dfece5";
const TEXT_DARK = "#17352b";
const TEXT_MUTED = "#5f7a6f";
const MAX_WIDTH = 1120;

const CARD_SHADOW = {
  shadowColor: "#1f5442",
  shadowOpacity: 0.05,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
} as const;

interface ClinicForm {
  name: string;
  address: string;
  phone: string;
  email: string;
  openingTime: string;
  closingTime: string;
}

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

  const [form, setForm] = useState<ClinicForm>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [clinicId, setClinicId] = useState<string | null>(null);

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
          showAlert(
            "Erro",
            meResult.error ?? "Não foi possível carregar o perfil.",
          );
          return;
        }

        const cId = meResult.data.clinic;
        if (!cId) {
          showAlert("Erro", "Nenhuma clínica associada ao usuário.");
          return;
        }

        setClinicId(cId);

        // 2. Busca dados da clínica
        const clinicResult = await getClinicData(cId);
        if (!clinicResult.ok || !clinicResult.data) {
          showAlert(
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
          openingTime: clinicData.open_from || "",
          closingTime: clinicData.open_until || "",
        });
      } catch (err: any) {
        showAlert(
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
      showAlert("Erro", "Clínica não identificada.");
      return;
    }

    // Validação simples
    if (form.openingTime >= form.closingTime) {
      showAlert(
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
        showAlert(
          "Erro",
          result.error ?? "Não foi possível salvar os dados.",
        );
        return;
      }

      showAlert(
        "Sucesso",
        "As informações da clínica foram salvas com sucesso.",
      );
    } catch (err: any) {
      showAlert("Erro", err?.message ?? "Ocorreu um erro inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const Header = () => (
    <View style={styles.header}>
      <View style={styles.headerInner}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back-outline" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTextBox}>
          <Text style={styles.headerTitle}>Gerenciamento</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.replace("/(admin)")}>
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
          style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Informações da clínica</Text>

            <InputField
              label="Nome da clínica"
              value={form.name}
              onChangeText={setField("name")}
              placeholder="Digite o nome da clínica"
            />

            <InputField
              label="Endereço"
              value={form.address}
              onChangeText={setField("address")}
              placeholder="Digite o endereço"
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
            <Text style={styles.sectionTitle}>Horário de funcionamento</Text>
            <Text style={styles.sectionSubtitle}>
              Defina os horários padrão de abertura e fechamento da clínica.
            </Text>

            <View style={styles.timeRow}>
              <View style={styles.timeCard}>
                <Text style={styles.inputLabel}>Abertura</Text>
                <TimeField
                  value={form.openingTime}
                  onChange={setField("openingTime")}
                />
              </View>

              <View style={styles.timeCard}>
                <Text style={styles.inputLabel}>Fechamento</Text>
                <TimeField
                  value={form.closingTime}
                  onChange={setField("closingTime")}
                />
              </View>
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
              {loading ? "Salvando..." : "Salvar alterações"}
            </Text>
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
    width: "100%", maxWidth: MAX_WIDTH, alignSelf: "center", paddingHorizontal: 20,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12,
  },
  iconBtn: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center", justifyContent: "center",
  },
  headerTextBox: { flex: 1 },
  headerTitle: { color: WHITE, fontSize: 21, fontWeight: "800", letterSpacing: -0.3 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
  loadingText: { fontSize: 15, color: GREEN, fontWeight: "600" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 44 },
  container: { width: "100%", maxWidth: MAX_WIDTH, alignSelf: "center" },
  formCard: {
    backgroundColor: WHITE, borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    padding: 18, marginBottom: 16, ...CARD_SHADOW,
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: TEXT_DARK, marginBottom: 12, letterSpacing: -0.2 },
  sectionSubtitle: { fontSize: 13, lineHeight: 19, color: TEXT_MUTED, marginBottom: 14 },
  inputGroup: { marginBottom: 14 },
  inputLabel: {
    fontSize: 12, fontWeight: "700", color: "#5f7d70", marginBottom: 8,
    textTransform: "uppercase", letterSpacing: 0.5,
  },
  input: {
    minHeight: 50, borderRadius: 12, borderWidth: 1, borderColor: "#d7ebe2",
    backgroundColor: "#f6faf8", paddingHorizontal: 16, fontSize: 15, color: TEXT_DARK, fontWeight: "500",
    // @ts-ignore — remove o contorno azul no web
    outlineStyle: "none",
  },
  timeRow: { flexDirection: "row", gap: 12 },
  timeCard: { flex: 1 },
  saveButton: {
    height: 54, borderRadius: 14, backgroundColor: GREEN,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  saveButtonDisabled: { opacity: 0.75 },
  saveButtonText: { color: WHITE, fontSize: 16, fontWeight: "800" },
});
