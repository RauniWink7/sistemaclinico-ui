import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Animated,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { getMe } from "../../services/api";

type AppointmentStatus = "agendada" | "realizada" | "cancelada";

interface ClinicInfo {
  name: string;
  cnpj: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  activePatients: number;
  activePsychologists: number;
}

interface AppointmentRecord {
  id: string;
  status: AppointmentStatus;
}

const GREEN = "#2e8b6e";
const GREEN_DARK = "#1f684f";
const GREEN_LIGHT = "#e8f7f1";
const BLUE_LIGHT = "#eaf1ff";
const RED_LIGHT = "#fdeeee";
const BG = "#f0faf5";
const WHITE = "#ffffff";

const MOCK_CLINIC: ClinicInfo = {
  name: "Clinica Equilibrio Mental",
  cnpj: "12.345.678/0001-90",
  phone: "(11) 4002-8922",
  email: "contato@equilibriomental.com.br",
  city: "Sao Paulo",
  state: "SP",
  activePatients: 186,
  activePsychologists: 14,
};

const MOCK_APPOINTMENTS: AppointmentRecord[] = [
  { id: "1", status: "agendada" },
  { id: "2", status: "agendada" },
  { id: "3", status: "agendada" },
  { id: "4", status: "agendada" },
  { id: "5", status: "realizada" },
  { id: "6", status: "realizada" },
  { id: "7", status: "realizada" },
  { id: "8", status: "realizada" },
  { id: "9", status: "realizada" },
  { id: "10", status: "realizada" },
  { id: "11", status: "cancelada" },
  { id: "12", status: "cancelada" },
];

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

export default function AdminDashboardScreen() {
  const [adminName, setAdminName] = useState("Administrador");
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    const loadProfile = async () => {
      const result = await getMe();
      if (result.ok && result.data) {
        setAdminName(
          result.data.full_name || result.data.name || "Administrador",
        );
      } else if (result.error) {
        Alert.alert("Erro", result.error);
      }
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

  const stats = useMemo(() => {
    const totalAppointments = MOCK_APPOINTMENTS.length;
    const completedAppointments = MOCK_APPOINTMENTS.filter(
      (item) => item.status === "realizada",
    ).length;
    const canceledAppointments = MOCK_APPOINTMENTS.filter(
      (item) => item.status === "cancelada",
    ).length;

    return {
      totalAppointments,
      completedAppointments,
      canceledAppointments,
    };
  }, []);

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
                  {MOCK_CLINIC.activePatients} pacientes ativos
                </Text>
              </View>
              <View style={styles.heroBadge}>
                <Ionicons name="medkit-outline" size={14} color={GREEN} />
                <Text style={styles.heroBadgeText}>
                  {MOCK_CLINIC.activePsychologists} psicologos ativos
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Indicadores principais</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <View
                style={[styles.metricIconBox, { backgroundColor: GREEN_LIGHT }]}
              >
                <Ionicons name="calendar-outline" size={20} color={GREEN} />
              </View>
              <Text style={styles.metricValue}>{stats.totalAppointments}</Text>
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
                {stats.completedAppointments}
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
                {stats.canceledAppointments}
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
                {MOCK_CLINIC.activePatients}
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
                {MOCK_CLINIC.activePsychologists}
              </Text>
              <Text style={styles.metricLabel}>Psicologos ativos</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Dados da clinica</Text>
          <View style={styles.clinicCard}>
            <InfoRow
              icon="business-outline"
              label="Nome da clinica"
              value={MOCK_CLINIC.name}
            />
            <View style={styles.divider} />
            <InfoRow
              icon="document-text-outline"
              label="CNPJ"
              value={MOCK_CLINIC.cnpj}
            />
            <View style={styles.divider} />
            <InfoRow
              icon="call-outline"
              label="Telefone"
              value={MOCK_CLINIC.phone}
            />
            <View style={styles.divider} />
            <InfoRow
              icon="mail-outline"
              label="E-mail"
              value={MOCK_CLINIC.email}
            />
            <View style={styles.divider} />
            <InfoRow
              icon="location-outline"
              label="Localizacao"
              value={`${MOCK_CLINIC.city} - ${MOCK_CLINIC.state}`}
            />
          </View>

          <Text style={styles.sectionTitle}>Resumo operacional</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Consultas concluidas</Text>
              <Text style={styles.summaryValue}>
                {stats.completedAppointments}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Consultas canceladas</Text>
              <Text style={styles.summaryValue}>
                {stats.canceledAppointments}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Pacientes em acompanhamento
              </Text>
              <Text style={styles.summaryValue}>
                {MOCK_CLINIC.activePatients}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Psicologos disponiveis</Text>
              <Text style={styles.summaryValue}>
                {MOCK_CLINIC.activePsychologists}
              </Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
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
