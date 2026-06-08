import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
  downloadReportFile,
  getProfessionalPatientReport,
  getProfessionalSummaryReport,
  PatientReportApi,
  ProfessionalSummaryReportApi,
  ReportPeriodQuery,
} from "../../services/api";

const GREEN = "#2e8b6e";
const GREEN_DARK = "#1f684f";
const GREEN_LIGHT = "#e8f7f1";
const BLUE_LIGHT = "#eaf1ff";
const BG = "#f0faf5";
const WHITE = "#ffffff";

const DecorativeBackground = () => (
  <>
    <View style={styles.circle1} />
    <View style={styles.circle2} />
  </>
);

export default function ProfessionalReportsScreen() {
  const [report, setReport] = useState<ProfessionalSummaryReportApi | null>(null);
  const [patientReport, setPatientReport] = useState<PatientReportApi | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingPatient, setLoadingPatient] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "excel" | "patient" | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  const period = useMemo<ReportPeriodQuery>(
    () => ({ start_date: startDate.trim(), end_date: endDate.trim() }),
    [startDate, endDate],
  );

  const loadReport = async () => {
    setLoading(true);
    const result = await getProfessionalSummaryReport(period);
    if (result.ok && result.data) {
      setReport(result.data);
    } else {
      Alert.alert("Erro", result.error || "Nao foi possivel carregar o relatorio.");
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadReport();
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const openPatientReport = async (patientId: string) => {
    setSelectedPatientId(patientId);
    setLoadingPatient(true);
    const result = await getProfessionalPatientReport(patientId, period);
    if (result.ok && result.data) {
      setPatientReport(result.data);
    } else {
      Alert.alert("Erro", result.error || "Nao foi possivel carregar o paciente.");
    }
    setLoadingPatient(false);
  };

  const exportSummary = async (kind: "pdf" | "excel") => {
    setExporting(kind);
    const extension = kind === "pdf" ? "pdf" : "xlsx";
    const result = await downloadReportFile(
      `/reports/professionals/summary/${kind === "pdf" ? "pdf" : "excel"}/`,
      period,
      `relatorio-profissional.${extension}`,
    );
    if (!result.ok) Alert.alert("Exportacao", result.error || "Falha ao exportar.");
    setExporting(null);
  };

  const exportPatient = async () => {
    if (!selectedPatientId) return;
    setExporting("patient");
    const result = await downloadReportFile(
      `/reports/professionals/patients/${encodeURIComponent(selectedPatientId)}/pdf/`,
      period,
      "relatorio-paciente.pdf",
    );
    if (!result.ok) Alert.alert("Exportacao", result.error || "Falha ao exportar.");
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
          <Text style={styles.headerEyebrow}>Area do psicologo</Text>
          <Text style={styles.headerTitle}>Relatorios</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={GREEN} />
            <Text style={styles.loadingText}>Carregando relatorios...</Text>
          </View>
        ) : (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <View style={styles.heroCard}>
              <Text style={styles.heroTitle}>
                {report?.professional?.full_name || "Resumo profissional"}
              </Text>
              <Text style={styles.heroSubtitle}>
                Indicadores de atendimento, pacientes acompanhados e historico do periodo.
              </Text>
            </View>

            <View style={styles.filterCard}>
              <Text style={styles.sectionTitle}>Periodo</Text>
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
              <TouchableOpacity style={styles.applyBtn} onPress={() => void loadReport()}>
                <Ionicons name="filter-outline" size={17} color={WHITE} />
                <Text style={styles.applyBtnText}>Aplicar filtros</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.exportBtn} onPress={() => void exportSummary("pdf")}>
                {exporting === "pdf" ? (
                  <ActivityIndicator color={GREEN} />
                ) : (
                  <Ionicons name="document-text-outline" size={18} color={GREEN} />
                )}
                <Text style={styles.exportBtnText}>PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.exportBtn} onPress={() => void exportSummary("excel")}>
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
              <Metric label="Pacientes" value={report?.summary.unique_patients ?? 0} />
              <Metric label="Cancel." value={`${report?.summary.cancellation_rate_percent ?? 0}%`} />
            </View>

            <Text style={styles.sectionTitle}>Pacientes atendidos</Text>
            {(report?.patients ?? []).slice(0, 12).map((patient) => (
              <TouchableOpacity
                key={patient.patient_id}
                style={[
                  styles.patientCard,
                  selectedPatientId === patient.patient_id && styles.patientCardActive,
                ]}
                onPress={() => void openPatientReport(patient.patient_id)}
                activeOpacity={0.85}
              >
                <View>
                  <Text style={styles.patientName}>{patient.patient_name}</Text>
                  <Text style={styles.patientMeta}>
                    {patient.total_appointments} consultas • {patient.completed} realizadas
                  </Text>
                </View>
                <Ionicons name="analytics-outline" size={21} color={GREEN} />
              </TouchableOpacity>
            ))}

            {loadingPatient ? (
              <View style={styles.patientReportCard}>
                <ActivityIndicator color={GREEN} />
              </View>
            ) : patientReport ? (
              <View style={styles.patientReportCard}>
                <View style={styles.patientReportHeader}>
                  <View>
                    <Text style={styles.sectionTitle}>{patientReport.patient?.full_name}</Text>
                    <Text style={styles.patientMeta}>Relatorio individual</Text>
                  </View>
                  <TouchableOpacity style={styles.smallExportBtn} onPress={exportPatient}>
                    {exporting === "patient" ? (
                      <ActivityIndicator color={GREEN} />
                    ) : (
                      <Ionicons name="download-outline" size={18} color={GREEN} />
                    )}
                  </TouchableOpacity>
                </View>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Total</Text>
                  <Text style={styles.rowValue}>{patientReport.summary.total_appointments}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Presenca</Text>
                  <Text style={styles.rowValue}>
                    {patientReport.summary.attendance_rate_percent ?? 0}%
                  </Text>
                </View>
              </View>
            ) : null}
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
  sectionTitle: { fontSize: 17, fontWeight: "800", color: "#173d31", marginBottom: 12 },
  inputRow: { flexDirection: "row", gap: 10 },
  input: { flex: 1, height: 44, borderRadius: 12, backgroundColor: "#f7fcfa", borderWidth: 1, borderColor: "#d7eee4", paddingHorizontal: 12, color: "#173d31", fontWeight: "600" },
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
  patientCard: { backgroundColor: WHITE, borderRadius: 16, padding: 16, marginBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: "#e3f1eb" },
  patientCardActive: { borderColor: GREEN, backgroundColor: "#fbfffd" },
  patientName: { fontSize: 15, fontWeight: "800", color: "#173d31" },
  patientMeta: { marginTop: 3, fontSize: 12, color: "#7a9d8f", fontWeight: "600" },
  patientReportCard: { backgroundColor: WHITE, borderRadius: 18, padding: 16, marginTop: 10 },
  patientReportHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  smallExportBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: GREEN_LIGHT, alignItems: "center", justifyContent: "center" },
  row: { minHeight: 38, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#edf5f1" },
  rowLabel: { color: "#557366", fontWeight: "700" },
  rowValue: { color: "#173d31", fontWeight: "800" },
});
