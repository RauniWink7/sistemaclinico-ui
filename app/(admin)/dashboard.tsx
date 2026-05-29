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
  TouchableOpacity,
  View,
} from "react-native";
import { getClinicData, getClinicStats, getMe } from "../../services/api";

// ─── Tipagens ────────────────────────────────────────────────────────────────

interface ClinicData {
  id: number;
  name: string;
  cnpj?: string;
  phone: string;
  email: string;
  address?: string;
  city?: string;
  state?: string;
  open_from?: string;
  open_until?: string;
}

interface ClinicStats {
  total_appointments: number;
  completed_appointments: number;
  cancelled_appointments: number;
  total_patients: number;
  total_professionals: number;
}

// ─── Constantes de tema ───────────────────────────────────────────────────────

const GREEN = "#2e8b6e";
const GREEN_DARK = "#1f684f";
const GREEN_LIGHT = "#e8f7f1";
const BLUE_LIGHT = "#eaf1ff";
const RED_LIGHT = "#fdeeee";
const BG = "#f0faf5";
const WHITE = "#ffffff";

// ─── Subcomponentes ───────────────────────────────────────────────────────────

const DecorativeBackground = () => (
  <>
    <View style={styles.circle1} />
    <View style={styles.circle2} />
  </>
);

const InfoRow = ({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIcon}>
      <Ionicons name={icon as any} size={16} color={GREEN} />
    </View>
    <View style={styles.infoTextBox}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

// ─── Tela principal ───────────────────────────────────────────────────────────

export default function AdminDashboardScreen() {
  const [adminName, setAdminName] = useState("Administrador");
  const [clinicData, setClinicData] = useState<ClinicData | null>(null);
  const [stats, setStats] = useState<ClinicStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  // ── Animação de entrada ──────────────────────────────────────────────────
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

  // ── Carregamento de dados reais ──────────────────────────────────────────
  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);

        // 1. Busca usuário logado
        const meResult = await getMe();
        if (!meResult.ok || !meResult.data) {
          Alert.alert(
            "Erro",
            meResult.error ?? "Não foi possível carregar o perfil.",
          );
          return;
        }

        const me = meResult.data;
        setAdminName(me.full_name || me.name || "Administrador");

        const clinicId = me.clinic;
        if (!clinicId) {
          Alert.alert("Erro", "Nenhuma clínica associada ao usuário.");
          return;
        }

        // 2. Busca estatísticas e dados da clínica em paralelo
        const [statsResult, clinicResult] = await Promise.all([
          getClinicStats(clinicId),
          getClinicData(clinicId),
        ]);

        if (!statsResult.ok) {
          Alert.alert(
            "Erro",
            statsResult.error ??
              "Não foi possível carregar os indicadores da clínica.",
          );
          return;
        }
        if (!clinicResult.ok) {
          Alert.alert(
            "Erro",
            clinicResult.error ??
              "Não foi possível carregar os dados da clínica.",
          );
          return;
        }

        setStats(statsResult.data as ClinicStats);
        setClinicData(clinicResult.data as ClinicData);
      } catch (err: any) {
        Alert.alert("Erro", err?.message ?? "Ocorreu um erro inesperado.");
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, []);

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle="light-content" backgroundColor={GREEN} />
        <DecorativeBackground />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back-outline" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTextBox}>
            <Text style={styles.headerEyebrow}>Area administrativa</Text>
            <Text style={styles.headerTitle}>Dashboard da clinica</Text>
          </View>
          <TouchableOpacity
            style={styles.homeBtn}
            onPress={() => router.replace("/(admin)")}
          >
            <Ionicons name="grid-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GREEN} />
          <Text style={styles.loadingText}>Carregando dados...</Text>
        </View>
      </View>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────
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
          <Text style={styles.headerTitle}>Dashboard da clinica</Text>
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
          {/* ── Hero card ── */}
          <View style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>Visao geral</Text>
            <Text style={styles.heroTitle}>{adminName}</Text>
            <Text style={styles.heroSubtitle}>
              Acompanhe rapidamente os principais numeros operacionais da
              clínica.
            </Text>

            <View style={styles.badgesRow}>
              <View style={styles.heroBadge}>
                <Ionicons name="people-outline" size={14} color={GREEN} />
                <Text style={styles.heroBadgeText}>
                  {stats?.total_patients ?? 0} pacientes ativos
                </Text>
              </View>
              <View style={styles.heroBadge}>
                <Ionicons name="medkit-outline" size={14} color={GREEN} />
                <Text style={styles.heroBadgeText}>
                  {stats?.total_professionals ?? 0} psicologos ativos
                </Text>
              </View>
            </View>
          </View>

          {/* ── Indicadores principais ── */}
          <Text style={styles.sectionTitle}>Indicadores principais</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <View
                style={[styles.metricIconBox, { backgroundColor: GREEN_LIGHT }]}
              >
                <Ionicons name="calendar-outline" size={20} color={GREEN} />
              </View>
              <Text style={styles.metricValue}>
                {stats?.total_appointments ?? 0}
              </Text>
              <Text style={styles.metricLabel}>Total de consultas</Text>
            </View>

            <View style={styles.metricCard}>
              <View
                style={[styles.metricIconBox, { backgroundColor: BLUE_LIGHT }]}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color="#2d6cdf"
                />
              </View>
              <Text style={styles.metricValue}>
                {stats?.completed_appointments ?? 0}
              </Text>
              <Text style={styles.metricLabel}>Concluidas</Text>
            </View>

            <View style={styles.metricCard}>
              <View
                style={[styles.metricIconBox, { backgroundColor: RED_LIGHT }]}
              >
                <Ionicons
                  name="close-circle-outline"
                  size={20}
                  color="#d95c5c"
                />
              </View>
              <Text style={styles.metricValue}>
                {stats?.cancelled_appointments ?? 0}
              </Text>
              <Text style={styles.metricLabel}>Canceladas</Text>
            </View>

            <View style={styles.metricCard}>
              <View
                style={[styles.metricIconBox, { backgroundColor: GREEN_LIGHT }]}
              >
                <Ionicons name="people-outline" size={20} color={GREEN} />
              </View>
              <Text style={styles.metricValue}>
                {stats?.total_patients ?? 0}
              </Text>
              <Text style={styles.metricLabel}>Pacientes ativos</Text>
            </View>

            <View style={styles.metricCard}>
              <View
                style={[styles.metricIconBox, { backgroundColor: GREEN_LIGHT }]}
              >
                <Ionicons name="person-outline" size={20} color={GREEN} />
              </View>
              <Text style={styles.metricValue}>
                {stats?.total_professionals ?? 0}
              </Text>
              <Text style={styles.metricLabel}>Psicologos ativos</Text>
            </View>
          </View>

          {/* ── Dados da clínica ── */}
          <Text style={styles.sectionTitle}>Dados da clinica</Text>
          <View style={styles.clinicCard}>
            <InfoRow
              icon="business-outline"
              label="Nome da clinica"
              value={clinicData?.name ?? "—"}
            />
            {clinicData?.cnpj ? (
              <>
                <View style={styles.divider} />
                <InfoRow
                  icon="document-text-outline"
                  label="CNPJ"
                  value={clinicData.cnpj}
                />
              </>
            ) : null}
            <View style={styles.divider} />
            <InfoRow
              icon="call-outline"
              label="Telefone"
              value={clinicData?.phone ?? "—"}
            />
            <View style={styles.divider} />
            <InfoRow
              icon="mail-outline"
              label="E-mail"
              value={clinicData?.email ?? "—"}
            />
            {clinicData?.city || clinicData?.state ? (
              <>
                <View style={styles.divider} />
                <InfoRow
                  icon="location-outline"
                  label="Localizacao"
                  value={[clinicData.city, clinicData.state]
                    .filter(Boolean)
                    .join(" - ")}
                />
              </>
            ) : null}
            {clinicData?.open_from && clinicData?.open_until ? (
              <>
                <View style={styles.divider} />
                <InfoRow
                  icon="time-outline"
                  label="Horario de funcionamento"
                  value={`${clinicData.open_from} — ${clinicData.open_until}`}
                />
              </>
            ) : null}
          </View>

          {/* ── Atalho para consultas ── */}
          <TouchableOpacity
            style={styles.consultasButton}
            onPress={() => router.push("/(admin)/consultas")}
            activeOpacity={0.85}
          >
            <View style={styles.consultasButtonLeft}>
              <View style={styles.consultasButtonIcon}>
                <Ionicons name="calendar-outline" size={20} color={GREEN} />
              </View>
              <View>
                <Text style={styles.consultasButtonTitle}>Ver consultas agendadas</Text>
                <Text style={styles.consultasButtonSub}>
                  {stats?.total_appointments ?? 0} consultas no total
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward-outline" size={20} color={GREEN} />
          </TouchableOpacity>

          {/* ── Resumo operacional ── */}
          <Text style={styles.sectionTitle}>Resumo operacional</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Consultas concluidas</Text>
              <Text style={styles.summaryValue}>
                {stats?.completed_appointments ?? 0}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Consultas canceladas</Text>
              <Text style={styles.summaryValue}>
                {stats?.cancelled_appointments ?? 0}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Pacientes em acompanhamento
              </Text>
              <Text style={styles.summaryValue}>
                {stats?.total_patients ?? 0}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Psicologos disponiveis</Text>
              <Text style={styles.summaryValue}>
                {stats?.total_professionals ?? 0}
              </Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

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
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  loadingText: {
    fontSize: 15,
    color: GREEN,
    fontWeight: "600",
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
    marginBottom: 24,
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
  badgesRow: {
    marginTop: 18,
    gap: 10,
  },
  heroBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: GREEN_LIGHT,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  heroBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: GREEN,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#173d31",
    marginBottom: 14,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    width: "48%",
    backgroundColor: WHITE,
    borderRadius: 22,
    padding: 18,
    shadowColor: "#174c3e",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  metricIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  metricValue: {
    marginTop: 16,
    fontSize: 28,
    fontWeight: "800",
    color: "#173d31",
  },
  metricLabel: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: "#668277",
    fontWeight: "600",
  },
  clinicCard: {
    backgroundColor: WHITE,
    borderRadius: 26,
    padding: 18,
    marginBottom: 24,
    shadowColor: "#174c3e",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: GREEN_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  infoTextBox: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#719084",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: "700",
    color: "#1b4337",
  },
  divider: {
    height: 1,
    backgroundColor: "#edf4f0",
  },
  consultasButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: WHITE,
    borderRadius: 22,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: "#cfe7dc",
    shadowColor: "#174c3e",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  consultasButtonLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  consultasButtonIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#e8f7f1",
    alignItems: "center",
    justifyContent: "center",
  },
  consultasButtonTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#173d31",
  },
  consultasButtonSub: {
    fontSize: 12,
    color: "#7a9e90",
    fontWeight: "600",
    marginTop: 2,
  },
  summaryCard: {
    backgroundColor: WHITE,
    borderRadius: 26,
    padding: 20,
    shadowColor: "#174c3e",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    gap: 12,
  },
  summaryLabel: {
    flex: 1,
    fontSize: 14,
    color: "#5d7a6e",
    fontWeight: "600",
  },
  summaryValue: {
    fontSize: 18,
    color: GREEN,
    fontWeight: "800",
  },
});