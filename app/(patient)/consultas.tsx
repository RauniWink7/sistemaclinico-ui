import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Animated,
    Modal,
    TextInput as RNTextInput,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import {
    AppointmentApiItem,
    cancelAppointment,
    getAppointments,
    getPsychologists,
    rateAppointment,
} from "../../services/api";

// Alias para evitar conflitos
const TextInput = RNTextInput;

type AppointmentStatus = "agendada" | "realizada" | "cancelada";

interface Appointment {
  id: string;
  date: string;
  time: string;
  psychologist: string;
  specialty: string;
  status: AppointmentStatus;
  hasReview: boolean;
}

// FIX 1: normalizeAppointment agora extrai data/hora pelo timezone local
// e mapeia professional_detail para pegar o nome correto do psicólogo
const normalizeAppointment = (
  item: AppointmentApiItem,
  profMap?: Record<string, string>,
): Appointment => {
  const scheduledAt = item.scheduled_at ?? "";
  const dt = scheduledAt ? new Date(scheduledAt) : null;

  const pad = (n: number) => String(n).padStart(2, "0");
  const date = dt
    ? `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
    : "";
  const time = dt ? `${pad(dt.getHours())}:${pad(dt.getMinutes())}` : "00:00";

  const statusMap: Record<string, AppointmentStatus> = {
    scheduled: "agendada",
    completed: "realizada",
    cancelled: "cancelada",
  };
  const status = (statusMap[item.status ?? ""] ??
    "agendada") as AppointmentStatus;

  // BUG 2 FIX: Usar mapa de profissionais para resolver UUID → nome
  const professionalId = item.professional ?? "";
  const psychologistName =
    profMap?.[professionalId] ||
    (item as any).professional_detail?.user?.full_name ||
    "Profissional";

  const specialty =
    (item as any).professional_detail?.specialty ||
    item.specialty ||
    "Psicologia";

  return {
    id: item.id,
    date,
    time,
    psychologist: psychologistName,
    specialty,
    status,
    hasReview: item.hasReview ?? item.has_review ?? false,
  };
};

const GREEN = "#2e8b6e";
const GREEN_DARK = "#1e6b54";
const GREEN_LIGHT = "#e8f7f1";
const BG = "#f0faf5";
const WHITE = "#ffffff";

const DecorativeBackground = () => (
  <>
    <View style={styles.circle1} />
    <View style={styles.circle2} />
  </>
);

const SectionTitle = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) => (
  <View style={styles.sectionHeading}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <Text style={styles.sectionSubtitle}>{subtitle}</Text>
  </View>
);

const getStatusMeta = (status: AppointmentStatus) => {
  switch (status) {
    case "agendada":
      return {
        label: "Agendada",
        icon: "calendar-outline",
        color: "#2e8b6e",
        bg: "#e8f7f1",
      };
    case "realizada":
      return {
        label: "Realizada",
        icon: "checkmark-circle-outline",
        color: "#2d6cdf",
        bg: "#eaf1ff",
      };
    default:
      return {
        label: "Cancelada",
        icon: "close-circle-outline",
        color: "#d95c5c",
        bg: "#fdeeee",
      };
  }
};

export default function ConsultasScreen() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Estados do modal de avaliação
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewAppointmentId, setReviewAppointmentId] = useState<string>("");
  const [reviewScore, setReviewScore] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  // Filtro de status
  const [activeFilter, setActiveFilter] = useState<AppointmentStatus | "todas">("todas");

  // FIX 1: Estados do modal de cancelamento (substitui Alert.prompt que não funciona no Android)
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelAppointmentId, setCancelAppointmentId] = useState<string>("");
  const [cancelReason, setCancelReason] = useState("");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    const loadAppointments = async () => {
      setLoadingAppointments(true);

      // ─── BUG 2 FIX: Load psychologists first to build profMap UUID→name
      const profsResult = await getPsychologists();
      const profMap: Record<string, string> = {};
      if (profsResult.ok && Array.isArray(profsResult.data)) {
        for (const prof of profsResult.data) {
          const name =
            prof.user?.full_name ||
            prof.full_name ||
            prof.name ||
            prof.psychologistName ||
            "Profissional";
          profMap[prof.id] = name;
        }
      }

      const result = await getAppointments();
      if (result.ok && Array.isArray(result.data)) {
        setAppointments(
          result.data.map((item) => normalizeAppointment(item, profMap)),
        );
      } else {
        if (result.error) {
          Alert.alert("Erro", result.error);
        }
      }
      setLoadingAppointments(false);
    };

    void loadAppointments();
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

  // ─── FEATURE 2: Pull-to-refresh ───────────────────────────────────────────
  const onRefresh = async () => {
    setRefreshing(true);

    try {
      // Recarregar profissionais para atualizar mapa
      const profsResult = await getPsychologists();
      const profMap: Record<string, string> = {};
      if (profsResult.ok && Array.isArray(profsResult.data)) {
        for (const prof of profsResult.data) {
          const name =
            prof.user?.full_name ||
            prof.full_name ||
            prof.name ||
            prof.psychologistName ||
            "Profissional";
          profMap[prof.id] = name;
        }
      }

      // Recarregar appointments com mapa atualizado
      const result = await getAppointments();
      if (result.ok && Array.isArray(result.data)) {
        setAppointments(
          result.data.map((item) => normalizeAppointment(item, profMap)),
        );
      } else {
        if (result.error) {
          Alert.alert("Erro", result.error);
        }
      }
    } catch (error) {
      console.error("Erro ao atualizar consultas:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const sortedAppointments = useMemo(
    () =>
      [...appointments].sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}:00`).getTime();
        const dateB = new Date(`${b.date}T${b.time}:00`).getTime();
        return dateB - dateA;
      }),
    [appointments],
  );

  const filteredAppointments = useMemo(
    () =>
      activeFilter === "todas"
        ? sortedAppointments
        : sortedAppointments.filter((a) => a.status === activeFilter),
    [sortedAppointments, activeFilter],
  );

  const summary = useMemo(() => {
    const now = new Date();
    return {
      future: appointments.filter(
        (item) =>
          item.status === "agendada" &&
          new Date(`${item.date}T${item.time}:00`) > now,
      ).length,
      finished: appointments.filter((item) => item.status === "realizada")
        .length,
      pendingReview: appointments.filter(
        (item) => item.status === "realizada" && !item.hasReview,
      ).length,
    };
  }, [appointments]);

  // FIX 2: formatDate usa o date local (já normalizado), sem forçar T12:00:00 desnecessário
  const formatDate = (date: string) =>
    new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(`${date}T12:00:00`));

  const canCancel = (appointment: Appointment) => {
    if (appointment.status !== "agendada") return false;
    const appointmentDate = new Date(
      `${appointment.date}T${appointment.time}:00`,
    );
    return appointmentDate.getTime() - Date.now() > 24 * 60 * 60 * 1000;
  };

  const canReview = (appointment: Appointment) =>
    appointment.status === "realizada" && !appointment.hasReview;

  // FIX 1: submitReview permanece igual
  const submitReview = async () => {
    const result = await rateAppointment(
      reviewAppointmentId,
      reviewScore,
      reviewComment.trim() || undefined,
    );
    if (result.ok) {
      setAppointments((current) =>
        current.map((item) =>
          item.id === reviewAppointmentId ? { ...item, hasReview: true } : item,
        ),
      );
      setReviewModalVisible(false);
      Alert.alert("Sucesso", "Avaliação registrada com sucesso.");
    } else {
      Alert.alert(
        "Erro",
        result.error || "Não foi possível registrar a avaliação.",
      );
    }
  };

  // FIX 1: handleCancelAppointment agora abre modal em vez de Alert.prompt
  const handleCancelAppointment = (appointmentId: string) => {
    setCancelAppointmentId(appointmentId);
    setCancelReason("");
    setCancelModalVisible(true);
  };

  // FIX 1: submitCancel executa a chamada de API a partir do modal
  const submitCancel = async () => {
    if (!cancelReason.trim()) {
      Alert.alert("Erro", "Motivo é obrigatório.");
      return;
    }
    const result = await cancelAppointment(
      cancelAppointmentId,
      cancelReason.trim(),
    );
    if (result.ok) {
      setAppointments((current) =>
        current.map((item) =>
          item.id === cancelAppointmentId
            ? { ...item, status: "cancelada" }
            : item,
        ),
      );
      setCancelModalVisible(false);
      Alert.alert("Sucesso", "Consulta cancelada com sucesso.");
    } else {
      Alert.alert(
        "Erro",
        result.error || "Não foi possível cancelar a consulta.",
      );
    }
  };

  const handleReviewAppointment = (appointmentId: string) => {
    setReviewAppointmentId(appointmentId);
    setReviewScore(5);
    setReviewComment("");
    setReviewModalVisible(true);
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN} />
      <DecorativeBackground />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back-outline" size={22} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerTextBox}>
          <Text style={styles.headerEyebrow}>Area do paciente</Text>
          <Text style={styles.headerTitle}>Minhas consultas</Text>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#2e8b6e"]}
            tintColor="#2e8b6e"
          />
        }
      >
        <Animated.View
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>
              Acompanhe consultas passadas e futuras
            </Text>
            <Text style={styles.heroSubtitle}>
              Veja data, horario, profissional, status e acoes disponiveis para
              cada atendimento.
            </Text>

            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{summary.future}</Text>
                <Text style={styles.summaryLabel}>Agendadas</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{summary.finished}</Text>
                <Text style={styles.summaryLabel}>Realizadas</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{summary.pendingReview}</Text>
                <Text style={styles.summaryLabel}>Sem avaliacao</Text>
              </View>
            </View>
          </View>

          <SectionTitle
            title="Historico completo"
            subtitle="Cancelamento disponivel apenas quando faltarem mais de 24 horas."
          />

          {/* Filtros de status */}
          <View style={styles.filterRow}>
            {(
              [
                { key: "todas", label: "Todas" },
                { key: "agendada", label: "Agendadas" },
                { key: "realizada", label: "Realizadas" },
                { key: "cancelada", label: "Canceladas" },
              ] as { key: AppointmentStatus | "todas"; label: string }[]
            ).map(({ key, label }) => {
              const isActive = activeFilter === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => setActiveFilter(key)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {loadingAppointments ? (
            <Text style={styles.loadingText}>Carregando consultas...</Text>
          ) : filteredAppointments.length === 0 ? (
            <Text style={styles.emptyText}>Nenhuma consulta encontrada.</Text>
          ) : (
            filteredAppointments.map((appointment) => {
              const status = getStatusMeta(appointment.status);
              const initials = appointment.psychologist
                .split(" ")
                .filter((part) => part.length > 2)
                .slice(0, 2)
                .map((part) => part[0])
                .join("");

              return (
                <View key={appointment.id} style={styles.appointmentCard}>
                  <View
                    style={[
                      styles.statusStripe,
                      { backgroundColor: status.color },
                    ]}
                  />

                  <View style={styles.appointmentBody}>
                    <View style={styles.topRow}>
                      <View style={styles.dateBox}>
                        <Text style={styles.dateDay}>
                          {new Intl.DateTimeFormat("pt-BR", {
                            day: "2-digit",
                          }).format(new Date(`${appointment.date}T12:00:00`))}
                        </Text>
                        <Text style={styles.dateMonth}>
                          {new Intl.DateTimeFormat("pt-BR", { month: "short" })
                            .format(new Date(`${appointment.date}T12:00:00`))
                            .replace(".", "")}
                        </Text>
                      </View>

                      <View style={styles.infoBox}>
                        <View style={styles.infoRow}>
                          <Ionicons
                            name="time-outline"
                            size={15}
                            color={GREEN}
                          />
                          <Text style={styles.infoText}>
                            {formatDate(appointment.date)} as {appointment.time}
                          </Text>
                        </View>

                        <View style={styles.professionalRow}>
                          <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{initials}</Text>
                          </View>
                          <View style={styles.professionalTextBox}>
                            <Text style={styles.professionalName}>
                              {appointment.psychologist}
                            </Text>
                            <Text style={styles.professionalRole}>
                              {appointment.specialty}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    <View style={styles.bottomRow}>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: status.bg },
                        ]}
                      >
                        <Ionicons
                          name={status.icon as any}
                          size={14}
                          color={status.color}
                        />
                        <Text
                          style={[styles.statusText, { color: status.color }]}
                        >
                          {status.label}
                        </Text>
                      </View>

                      <View style={styles.actionsRow}>
                        <TouchableOpacity
                          style={styles.secondaryAction}
                          activeOpacity={0.85}
                          onPress={() =>
                            router.push({
                              pathname: "/(shared)/consulta-detalhe",
                              params: { id: appointment.id },
                            } as any)
                          }
                        >
                          <Ionicons
                            name="eye-outline"
                            size={14}
                            color={GREEN}
                          />
                          <Text style={styles.secondaryActionText}>
                            Detalhes
                          </Text>
                        </TouchableOpacity>

                        {canReview(appointment) && (
                          <TouchableOpacity
                            style={styles.secondaryAction}
                            activeOpacity={0.85}
                            onPress={() =>
                              handleReviewAppointment(appointment.id)
                            }
                          >
                            <Ionicons
                              name="star-outline"
                              size={14}
                              color={GREEN}
                            />
                            <Text style={styles.secondaryActionText}>
                              Avaliar
                            </Text>
                          </TouchableOpacity>
                        )}

                        {canCancel(appointment) && (
                          <TouchableOpacity
                            style={styles.primaryAction}
                            activeOpacity={0.85}
                            onPress={() =>
                              handleCancelAppointment(appointment.id)
                            }
                          >
                            <Ionicons
                              name="close-outline"
                              size={14}
                              color="#fff"
                            />
                            <Text style={styles.primaryActionText}>
                              Cancelar
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </Animated.View>
      </ScrollView>

      {/* Modal de Avaliação */}
      <Modal
        visible={reviewModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReviewModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Avaliar consulta</Text>
            <Text style={styles.modalSubtitle}>Como foi sua experiência?</Text>

            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setReviewScore(star)}
                >
                  <Ionicons
                    name={star <= reviewScore ? "star" : "star-outline"}
                    size={32}
                    color="#f4b942"
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.commentInput}
              placeholder="Comentário opcional..."
              value={reviewComment}
              onChangeText={setReviewComment}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setReviewModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={submitReview}
              >
                <Text style={styles.modalConfirmBtnText}>Avaliar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* FIX 1: Modal de Cancelamento — substitui Alert.prompt (iOS only) */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cancelar consulta</Text>
            <Text style={styles.modalSubtitle}>
              Informe o motivo do cancelamento
            </Text>

            <TextInput
              style={styles.commentInput}
              placeholder="Motivo obrigatório..."
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setCancelModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Voltar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalDangerBtn}
                onPress={submitCancel}
              >
                <Text style={styles.modalConfirmBtnText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerSpacer: {
    width: 42,
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
    borderRadius: 26,
    padding: 22,
    marginTop: -18,
    marginBottom: 24,
    shadowColor: "#0f5132",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#163c31",
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: "#5a756a",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: GREEN_LIGHT,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: "800",
    color: GREEN,
  },
  summaryLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
    color: "#56796d",
    textAlign: "center",
  },
  sectionHeading: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#163c31",
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#68857a",
    lineHeight: 19,
  },
  loadingText: {
    marginTop: 24,
    textAlign: "center",
    color: "#4f7667",
    fontSize: 14,
    fontWeight: "600",
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: "#d4e8de",
  },
  filterChipActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#5a756a",
  },
  filterChipTextActive: {
    color: WHITE,
  },
  emptyText: {
    marginTop: 24,
    textAlign: "center",
    color: "#7a9a86",
    fontSize: 14,
    fontWeight: "600",
  },
  appointmentCard: {
    backgroundColor: WHITE,
    borderRadius: 24,
    marginBottom: 16,
    overflow: "hidden",
    flexDirection: "row",
    shadowColor: "#174c3e",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  statusStripe: {
    width: 6,
  },
  appointmentBody: {
    flex: 1,
    padding: 18,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  dateBox: {
    width: 62,
    borderRadius: 18,
    backgroundColor: "#f3fbf7",
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: "center",
    marginRight: 14,
  },
  dateDay: {
    fontSize: 24,
    fontWeight: "800",
    color: GREEN,
    lineHeight: 26,
  },
  dateMonth: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    color: "#5d7c71",
    textTransform: "lowercase",
  },
  infoBox: {
    flex: 1,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    marginBottom: 12,
  },
  infoText: {
    marginLeft: 8,
    flex: 1,
    fontSize: 14,
    color: "#456459",
    lineHeight: 20,
  },
  professionalRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: GREEN_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "800",
    color: GREEN,
  },
  professionalTextBox: {
    flex: 1,
  },
  professionalName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#183d32",
  },
  professionalRole: {
    marginTop: 2,
    fontSize: 13,
    color: "#698378",
  },
  bottomRow: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#edf4f0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  statusText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "700",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  primaryAction: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#df5d5d",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  primaryActionText: {
    marginLeft: 6,
    color: WHITE,
    fontSize: 13,
    fontWeight: "700",
  },
  secondaryAction: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GREEN_LIGHT,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  secondaryActionText: {
    marginLeft: 6,
    color: GREEN,
    fontSize: 13,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 24,
    width: "90%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#163c31",
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#5a756a",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 20,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalCancelBtnText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalDangerBtn: {
    flex: 1,
    backgroundColor: "#df5d5d",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalConfirmBtnText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "600",
  },
});