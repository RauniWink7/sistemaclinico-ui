import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
import {
  AdminAppointmentsReportApi,
  downloadReportFile,
  getAdminAppointmentsReport,
  getMe,
  getProfessionalsByClinic,
  ReportPeriodQuery,
} from "../../services/api";

const GREEN = "#2e8b6e";
const GREEN_DARK = "#1f684f";
const GREEN_LIGHT = "#e8f7f1";
const BG = "#f0faf5";
const WHITE = "#ffffff";

const DecorativeBackground = () => (
  <>
    <View style={styles.circle1} />
    <View style={styles.circle2} />
  </>
);

export default function AdminReportsScreen() {
  const [report, setReport] = useState<AdminAppointmentsReportApi | null>(null);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [professionalId, setProfessionalId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  const params = useMemo<ReportPeriodQuery>(
    () => ({
      start_date: startDate.trim(),
      end_date: endDate.trim(),
      professional_id: professionalId,
    }),
    [endDate, professionalId, startDate],
  );

  const loadReport = async () => {
    setLoading(true);
    const result = await getAdminAppointmentsReport(params);
    if (result.ok && result.data) {
      setReport(result.data);
    } else {
      showAlert("Erro", result.error || "Nao foi possivel carregar o relatorio.");
    }
    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const me = await getMe();
      if (me.ok && me.data?.clinic) {
        const profs = await getProfessionalsByClinic(me.data.clinic);
        if (profs.ok && Array.isArray(profs.data)) setProfessionals(profs.data);
      }
      const result = await getAdminAppointmentsReport(params);
      if (result.ok && result.data) {
        setReport(result.data);
      } else {
        showAlert("Erro", result.error || "Nao foi possivel carregar o relatorio.");
      }
      setLoading(false);
    };

    void init();
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const exportReport = async (kind: "pdf" | "excel") => {
    setExporting(kind);
    const extension = kind === "pdf" ? "pdf" : "xlsx";
    const result = await downloadReportFile(
      `/reports/admin/appointments/${kind === "pdf" ? "pdf" : "excel"}/`,
      params,
      `relatorio-admin-consultas.${extension}`,
    );
    if (!result.ok) showAlert("Exportacao", result.error || "Falha ao exportar.");
    setExporting(null);
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN} />
      <DecorativeBackground />

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back-outline" size={22} color={WHITE} />
        </TouchableOpacity>
        <View style={styles.headerTextBox}>
          <Text style={styles.headerEyebrow}>Area administrativa</Text>
          <Text style={styles.headerTitle}>Relatorios</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={GREEN} />
            <Text style={styles.loadingText}>Carregando relatorio...</Text>
          </View>
        ) : (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <View style={styles.heroCard}>
              <Text style={styles.heroTitle}>Consultas da clinica</Text>
              <Text style={styles.heroSubtitle}>
                Acompanhe volume, status, profissionais e historico operacional.
              </Text>
            </View>

            <View style={styles.filterCard}>
              <Text style={styles.sectionTitle}>Filtros</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="Inicio YYYY-MM-DD"
                  placeholderTextColor="#8ba99d"
                />
                <TextInput
                  style={styles.input}
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="Fim YYYY-MM-DD"
                  placeholderTextColor="#8ba99d"
                />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.profScroll}>
                <TouchableOpacity
                  style={[styles.profChip, !professionalId && styles.profChipActive]}
                  onPress={() => setProfessionalId("")}
                >
                  <Text style={[styles.profChipText, !professionalId && styles.profChipTextActive]}>
                    Todos
                  </Text>
                </TouchableOpacity>
                {professionals.map((prof) => (
                  <TouchableOpacity
                    key={prof.id}
                    style={[styles.profChip, professionalId === prof.id && styles.profChipActive]}
                    onPress={() => setProfessionalId(prof.id)}
                  >
                    <Text
                      style={[
                        styles.profChipText,
                        professionalId === prof.id && styles.profChipTextActive,
                      ]}
                    >
                      {prof.user?.full_name ?? prof.full_name ?? "Profissional"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.applyBtn} onPress={() => void loadReport()}>
                <Ionicons name="filter-outline" size={17} color={WHITE} />
                <Text style={styles.applyBtnText}>Aplicar filtros</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.exportBtn} onPress={() => void exportReport("pdf")}>
                {exporting === "pdf" ? (
                  <ActivityIndicator color={GREEN} />
                ) : (
                  <Ionicons name="document-text-outline" size={18} color={GREEN} />
                )}
                <Text style={styles.exportBtnText}>PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.exportBtn} onPress={() => void exportReport("excel")}>
                {exporting === "excel" ? (
                  <ActivityIndicator color={GREEN} />
                ) : (
                  <Ionicons name="grid-outline" size={18} color={GREEN} />
                )}
                <Text style={styles.exportBtnText}>Excel</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.metricsGrid}>
              <Metric label="Consultas" value={report?.summary.total_appointments ?? 0} />
              <Metric label="Realizadas" value={report?.summary.completed ?? 0} />
              <Metric label="Cancel." value={`${report?.summary.cancellation_rate_percent ?? 0}%`} />
            </View>

            <Text style={styles.sectionTitle}>Por profissional</Text>
            {(report?.consultations_by_professional ?? []).slice(0, 10).map((item) => (
              <View key={item.professional_id} style={styles.professionalCard}>
                <View>
                  <Text style={styles.cardTitle}>{item.professional_name}</Text>
                  <Text style={styles.cardMeta}>
                    {item.unique_patients} pacientes • {item.total_appointments} consultas
                  </Text>
                </View>
                <Text style={styles.valuePill}>{item.completed}</Text>
              </View>
            ))}

            <Text style={styles.sectionTitle}>Historico recente</Text>
            {(report?.appointments ?? []).slice(0, 10).map((item) => (
              <View key={item.id} style={styles.appointmentCard}>
                <View>
                  <Text style={styles.cardTitle}>{item.patient_name}</Text>
                  <Text style={styles.cardMeta}>
                    {item.professional_name} • {new Date(item.scheduled_at).toLocaleString("pt-BR")}
                  </Text>
                </View>
                <Text style={styles.statusPill}>{item.status_label}</Text>
              </View>
            ))}
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const Metric = ({ label, value }: { label: string; value: number | string }) => (
  <View style={styles.metricCard}>
    <View style={styles.metricIcon}>
      <Ionicons name="stats-chart-outline" size={19} color={GREEN} />
    </View>
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  circle1: { position: "absolute", width: 280, height: 280, borderRadius: 140, backgroundColor: "#27795f", top: -110, right: -70, opacity: 0.45 },
  circle2: { position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: GREEN_DARK, top: -55, left: -70, opacity: 0.28 },
  header: { paddingTop: 56, paddingBottom: 24, paddingHorizontal: 24, backgroundColor: GREEN, flexDirection: "row", alignItems: "center", gap: 14 },
  iconBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  headerTextBox: { flex: 1 },
  headerEyebrow: { color: "#bce3d5", fontSize: 13, fontWeight: "700" },
  headerTitle: { color: WHITE, fontSize: 24, fontWeight: "800", marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { padding: 22, paddingBottom: 40, maxWidth: 960, alignSelf: 'center' as const, width: '100%' as const },
  loadingContainer: { minHeight: 360, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: GREEN, fontWeight: "700" },
  heroCard: { backgroundColor: WHITE, borderRadius: 22, padding: 22, marginBottom: 16, shadowColor: GREEN, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 18, elevation: 4 },
  heroTitle: { fontSize: 22, fontWeight: "800", color: "#173d31" },
  heroSubtitle: { marginTop: 8, fontSize: 14, lineHeight: 21, color: "#5d7a6e" },
  filterCard: { backgroundColor: WHITE, borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#ddf0e8" },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: "#173d31", marginBottom: 12, marginTop: 4 },
  inputRow: { flexDirection: "row", gap: 10 },
  input: { flex: 1, height: 44, borderRadius: 12, backgroundColor: "#f7fcfa", borderWidth: 1, borderColor: "#d7eee4", paddingHorizontal: 12, color: "#173d31", fontWeight: "600" },
  profScroll: { marginTop: 12 },
  profChip: { height: 36, borderRadius: 10, backgroundColor: GREEN_LIGHT, paddingHorizontal: 12, alignItems: "center", justifyContent: "center", marginRight: 8 },
  profChipActive: { backgroundColor: GREEN },
  profChipText: { color: GREEN, fontWeight: "800", fontSize: 12 },
  profChipTextActive: { color: WHITE },
  applyBtn: { marginTop: 12, height: 46, borderRadius: 12, backgroundColor: GREEN, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  applyBtnText: { color: WHITE, fontWeight: "800" },
  actionRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  exportBtn: { flex: 1, height: 46, borderRadius: 12, backgroundColor: GREEN_LIGHT, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  exportBtnText: { color: GREEN, fontWeight: "800" },
  metricsGrid: { flexDirection: "row", gap: 10, marginBottom: 22 },
  metricCard: { flex: 1, backgroundColor: WHITE, borderRadius: 18, padding: 14, minHeight: 122, shadowColor: GREEN, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.07, shadowRadius: 14, elevation: 3 },
  metricIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: GREEN_LIGHT, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  metricValue: { fontSize: 22, fontWeight: "800", color: "#173d31" },
  metricLabel: { fontSize: 12, color: "#6c8c80", fontWeight: "700", marginTop: 2 },
  professionalCard: { backgroundColor: WHITE, borderRadius: 16, padding: 16, marginBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  appointmentCard: { backgroundColor: WHITE, borderRadius: 16, padding: 16, marginBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  cardTitle: { fontSize: 14, color: "#173d31", fontWeight: "800" },
  cardMeta: { marginTop: 3, fontSize: 12, color: "#7a9d8f", fontWeight: "600" },
  valuePill: { minWidth: 34, textAlign: "center", color: GREEN, backgroundColor: GREEN_LIGHT, overflow: "hidden", borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6, fontSize: 12, fontWeight: "800" },
  statusPill: { color: GREEN, backgroundColor: GREEN_LIGHT, overflow: "hidden", borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, fontSize: 11, fontWeight: "800" },
});
