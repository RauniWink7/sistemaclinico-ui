import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import {
    AppointmentApiItem,
    getAppointments,
    getMe,
    updateAppointmentStatus,
} from "../../services/api";

type AppointmentStatus =
  | "scheduled"
  | "completed"
  | "rescheduled"
  | "no_show"
  | "cancelled";

interface WeeklyAppointment {
  id: string;
  dayKey: string;
  weekday: string;
  dateLabel: string;
  time: string;
  patientName: string;
  type: string;
  status: AppointmentStatus;
}

const GREEN = "#2e8b6e";
const GREEN_DARK = "#1f684f";
const GREEN_LIGHT = "#e8f7f1";
const BLUE_LIGHT = "#eaf1ff";
const ORANGE_LIGHT = "#fef3e8";
const BG = "#f0faf5";
const WHITE = "#ffffff";

const getCurrentWeekDays = (weekOffset: number = 0) => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setDate(monday.getDate() + weekOffset * 7);

  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      key: d.toISOString().split("T")[0],
      weekday: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab"][i],
      fullLabel: d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
      }),
      date: d,
    };
  });
};

const extractPatientName = (item: AppointmentApiItem): string => {
  if (item.patient_detail?.user?.full_name) {
    return item.patient_detail.user.full_name;
  }
  if ((item as any).patient_name) {
    return (item as any).patient_name;
  }
  return "Paciente";
};

const toWeeklyAppointment = (item: AppointmentApiItem): WeeklyAppointment => {
  const date = new Date(item.scheduled_at!);
  const dayKey = item.scheduled_at!.split("T")[0];
  return {
    id: item.id,
    dayKey,
    weekday: date.toLocaleDateString("pt-BR", { weekday: "short" }),
    dateLabel: date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    }),
    time: date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    patientName: extractPatientName(item),
    type: "Sessão individual",
    status: (item.status as AppointmentStatus) ?? "scheduled",
  };
};

const DecorativeBackground = () => (
  <>
    <View style={styles.circle1} />
    <View style={styles.circle2} />
  </>
);

const getStatusMeta = (status: AppointmentStatus) => {
  switch (status) {
    case "completed":
      return {
        label: "Realizada",
        icon: "checkmark-circle-outline",
        color: "#2d6cdf",
        bg: BLUE_LIGHT,
      };
    case "rescheduled":
      return {
        label: "Remarcada",
        icon: "swap-horizontal-outline",
        color: "#c46a1a",
        bg: ORANGE_LIGHT,
      };
    case "no_show":
      return {
        label: "Não compareceu",
        icon: "close-circle-outline",
        color: "#b03030",
        bg: "#fdeaea",
      };
    case "cancelled":
      return {
        label: "Cancelada",
        icon: "ban-outline",
        color: "#888",
        bg: "#f2f2f2",
      };
    default:
      return {
        label: "Agendada",
        icon: "calendar-outline",
        color: GREEN,
        bg: GREEN_LIGHT,
      };
  }
};

export default function PsychologistAgendaScreen() {
  const [appointments, setAppointments] = useState<WeeklyAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedAppointment, setSelectedAppointment] =
    useState<WeeklyAppointment | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const weekDays = useMemo(() => getCurrentWeekDays(weekOffset), [weekOffset]);

  useEffect(() => {
    // Compute the week days for the current offset inside the effect
    // so we don't depend on the weekDays memo (which changes reference every render)
    const currentWeekDays = getCurrentWeekDays(weekOffset);

    const loadData = async () => {
      setLoading(true);
      try {
        const [meResult, appointmentsResult] = await Promise.all([
          getMe(),
          getAppointments(),
        ]);

        if (!meResult.ok || !meResult.data) {
          Alert.alert("Erro", meResult.error || "Erro ao carregar perfil.");
          setLoading(false);
          return;
        }

        if (appointmentsResult.ok && appointmentsResult.data) {
          const weeklyAppointments = appointmentsResult.data
            .filter((item) => item.scheduled_at)
            .map(toWeeklyAppointment)
            .filter((item) =>
              currentWeekDays.some((day) => day.key === item.dayKey),
            );
          setAppointments(weeklyAppointments);
        } else {
          Alert.alert(
            "Erro",
            appointmentsResult.error || "Erro ao carregar consultas.",
          );
        }

        const todayKey = new Date().toISOString().split("T")[0];
        if (currentWeekDays.some((day) => day.key === todayKey)) {
          setSelectedDay(todayKey);
        } else if (currentWeekDays.length > 0) {
          setSelectedDay(currentWeekDays[0].key);
        }
      } catch {
        Alert.alert("Erro", "Erro inesperado ao carregar dados.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [weekOffset]); // ✅ Only re-run when the week actually changes, not on every render

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

  const summary = useMemo(() => {
    const todayCount = appointments.filter(
      (item) => item.dayKey === selectedDay,
    ).length;
    const completedCount = appointments.filter(
      (item) => item.status === "completed",
    ).length;
    return { todayCount, completedCount };
  }, [appointments, selectedDay]);

  const selectedDayAppointments = useMemo(
    () =>
      appointments
        .filter((item) => item.dayKey === selectedDay)
        .sort((a, b) => a.time.localeCompare(b.time)),
    [appointments, selectedDay],
  );

  const handleStatusChange = async (
    newStatus: "completed" | "scheduled" | "rescheduled" | "no_show",
    successMessage: string,
  ) => {
    if (!selectedAppointment) return;
    setUpdatingStatus(true);

    // Captura o id ANTES de qualquer setState para evitar closure stale
    const updatedId = selectedAppointment.id;

    if (__DEV__) {
      console.log(
        `🔄 Enviando atualização: appointmentId=${updatedId}, newStatus=${newStatus}`,
      );
    }

    const result = await updateAppointmentStatus(updatedId, newStatus);

    if (__DEV__) {
      console.log("📡 Resposta da API:", result);
    }

    setUpdatingStatus(false);

    if (result.ok) {
      if (__DEV__) {
        console.log("✅ Atualização bem-sucedida no backend");
      }

      // Atualiza estado local imediatamente para feedback instantâneo
      setAppointments((current) =>
        current.map((item) =>
          item.id === updatedId ? { ...item, status: newStatus } : item,
        ),
      );
      setSelectedAppointment((current) =>
        current ? { ...current, status: newStatus } : current,
      );

      Alert.alert("Consulta atualizada", successMessage);

      // Recarrega do backend após 1.5s e FAZ MERGE preservando o status confirmado
      // Isso evita que uma resposta lenta do backend reverta o status local
      setTimeout(() => {
        const reloadData = async () => {
          if (__DEV__) {
            console.log("🔄 Recarregando consultas do backend...");
          }
          const appointmentsResult = await getAppointments();
          if (__DEV__) {
            console.log("📝 Consultas recarregadas:", appointmentsResult);
          }

          if (appointmentsResult.ok && appointmentsResult.data) {
            const freshAppointments = appointmentsResult.data
              .filter((item) => item.scheduled_at)
              .map(toWeeklyAppointment);

            // CORREÇÃO: merge que protege o item recém-atualizado
            // Se o backend ainda retornar o status antigo (race condition),
            // mantém o newStatus que confirmamos via 200 OK
            setAppointments((current) => {
              return freshAppointments.map((fetched) => {
                if (fetched.id === updatedId) {
                  const backendReflected = fetched.status === newStatus;
                  if (!backendReflected) {
                    if (__DEV__) {
                      console.warn(
                        `⚠️ Backend ainda retornou status antigo (${fetched.status}) para ${updatedId}. Mantendo ${newStatus}.`,
                      );
                    }
                  }
                  return backendReflected
                    ? fetched
                    : { ...fetched, status: newStatus as AppointmentStatus };
                }
                return fetched;
              });
            });

            // Atualiza também o modal se ainda estiver aberto com o mesmo appointment
            setSelectedAppointment((current) => {
              if (!current || current.id !== updatedId) return current;
              return { ...current, status: newStatus as AppointmentStatus };
            });
          }
        };
        reloadData();
      }, 1500);
    } else {
      if (__DEV__) {
        console.error("❌ Erro ao atualizar:", result.error);
      }
      const detail = result.data ? JSON.stringify(result.data) : "";
      Alert.alert(
        "Erro ao atualizar",
        result.error
          ? `${result.error}${detail ? `\n\n${detail}` : ""}`
          : "Não foi possível atualizar o status.",
      );
    }
  };

  const handleMarkCompleted = () =>
    handleStatusChange("completed", "Consulta marcada como realizada.");

  const handleUndoCompleted = () =>
    handleStatusChange("scheduled", "Consulta revertida para agendada.");

  const handleMarkRescheduled = () =>
    handleStatusChange("rescheduled", "A consulta foi marcada como remarcada.");

  const handlePreviousWeek = () => {
    const newOffset = weekOffset - 1;
    setWeekOffset(newOffset);
    const newWeekDays = getCurrentWeekDays(newOffset);
    setSelectedDay(newWeekDays[0].key);
  };

  const handleNextWeek = () => {
    const newOffset = weekOffset + 1;
    setWeekOffset(newOffset);
    const newWeekDays = getCurrentWeekDays(newOffset);
    setSelectedDay(newWeekDays[0].key);
  };

  const handleTodayWeek = () => {
    setWeekOffset(0);
    const todayKey = new Date().toISOString().split("T")[0];
    const todayInWeek = getCurrentWeekDays(0).find(
      (day) => day.key === todayKey,
    );
    if (todayInWeek) {
      setSelectedDay(todayInWeek.key);
    } else if (weekDays.length > 0) {
      setSelectedDay(weekDays[0].key);
    }
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
          <Text style={styles.headerEyebrow}>Área do psicólogo</Text>
          <Text style={styles.headerTitle}>Agenda profissional</Text>
        </View>

        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => router.replace("/(psychologist)/dashboardP")}
        >
          <Ionicons name="home-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={GREEN} />
            <Text style={styles.loadingText}>Carregando agenda...</Text>
          </View>
        ) : (
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            <View style={styles.heroCard}>
              <Text style={styles.heroTitle}>Visualize sua semana clinica</Text>
              <Text style={styles.heroSubtitle}>
                Acompanhe consultas agendadas e veja o status de cada
                atendimento.
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{summary.todayCount}</Text>
                <Text style={styles.summaryLabel}>Consultas no dia</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>
                  {summary.completedCount}
                </Text>
                <Text style={styles.summaryLabel}>Realizadas</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Calendario semanal</Text>
            <View style={styles.weekNavigationContainer}>
              <TouchableOpacity
                style={styles.weekNavButton}
                onPress={handlePreviousWeek}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back-outline" size={20} color={GREEN} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.todayButton}
                onPress={handleTodayWeek}
                activeOpacity={0.7}
              >
                <Text style={styles.todayButtonText}>Hoje</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.weekNavButton}
                onPress={handleNextWeek}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="chevron-forward-outline"
                  size={20}
                  color={GREEN}
                />
              </TouchableOpacity>
            </View>

            {/* ─── FEATURE 3: Week interval label ─────────────────────────────────── */}
            {weekDays.length > 0 && (
              <View style={styles.weekLabelContainer}>
                <View style={styles.weekLabelBadge}>
                  <Text style={styles.weekLabelText}>
                    {weekDays[0].fullLabel.split(" ")[0]}{" "}
                    {weekDays[0].fullLabel.split(" ")[1]} –{" "}
                    {weekDays[5].fullLabel.split(" ")[0]}{" "}
                    {weekDays[5].fullLabel.split(" ")[1]}{" "}
                    {new Date().getFullYear()}
                  </Text>
                </View>
              </View>
            )}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.weekRow}
            >
              {weekDays.map((day) => {
                const isActive = day.key === selectedDay;
                const appointmentsCount = appointments.filter(
                  (item) => item.dayKey === day.key,
                ).length;

                return (
                  <TouchableOpacity
                    key={day.key}
                    style={[styles.dayCard, isActive && styles.dayCardActive]}
                    onPress={() => setSelectedDay(day.key)}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.dayWeekLabel,
                        isActive && styles.dayWeekLabelActive,
                      ]}
                    >
                      {day.weekday}
                    </Text>
                    <Text
                      style={[
                        styles.dayDateLabel,
                        isActive && styles.dayDateLabelActive,
                      ]}
                    >
                      {day.fullLabel}
                    </Text>
                    <View
                      style={[
                        styles.dayBadge,
                        isActive && styles.dayBadgeActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayBadgeText,
                          isActive && styles.dayBadgeTextActive,
                        ]}
                      >
                        {appointmentsCount} consulta
                        {appointmentsCount === 1 ? "" : "s"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.sectionTitle}>Consultas agendadas</Text>
            {selectedDayAppointments.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons
                  name="calendar-clear-outline"
                  size={34}
                  color="#9bbcaf"
                />
                <Text style={styles.emptyTitle}>Sem consultas nesse dia</Text>
                <Text style={styles.emptyText}>
                  Nenhuma consulta agendada para este dia.
                </Text>
                <TouchableOpacity
                  style={styles.emptyBtn}
                  onPress={() => router.push("/(psychologist)/agenda")}
                  activeOpacity={0.85}
                >
                  <Ionicons name="time-outline" size={15} color="#2e8b6e" />
                  <Text style={styles.emptyBtnText}>
                    Ver minha disponibilidade
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              selectedDayAppointments.map((appointment) => {
                const statusMeta = getStatusMeta(appointment.status);

                return (
                  <TouchableOpacity
                    key={appointment.id}
                    style={styles.appointmentCard}
                    activeOpacity={0.85}
                    onPress={() => setSelectedAppointment(appointment)}
                  >
                    <View
                      style={[
                        styles.statusStripe,
                        { backgroundColor: statusMeta.color },
                      ]}
                    />

                    <View style={styles.appointmentBody}>
                      <View style={styles.appointmentTopRow}>
                        <View>
                          <Text style={styles.appointmentTime}>
                            {appointment.time}
                          </Text>
                          <Text style={styles.appointmentPatient}>
                            {appointment.patientName}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: statusMeta.bg },
                          ]}
                        >
                          <Ionicons
                            name={statusMeta.icon as any}
                            size={14}
                            color={statusMeta.color}
                          />
                          <Text
                            style={[
                              styles.statusText,
                              { color: statusMeta.color },
                            ]}
                          >
                            {statusMeta.label}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.appointmentType}>
                        {appointment.type}
                      </Text>
                      <Text style={styles.appointmentHint}>
                        Toque para abrir detalhes e atualizar o atendimento.
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </Animated.View>
        )}
      </ScrollView>

      <Modal
        visible={!!selectedAppointment}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedAppointment(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            {selectedAppointment && (
              <>
                <Text style={styles.modalTitle}>Detalhes da consulta</Text>
                <Text style={styles.modalSubtitle}>
                  {selectedAppointment.weekday}, {selectedAppointment.dateLabel}{" "}
                  as {selectedAppointment.time}
                </Text>

                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Paciente</Text>
                  <Text style={styles.detailValue}>
                    {selectedAppointment.patientName}
                  </Text>
                </View>

                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Tipo de atendimento</Text>
                  <Text style={styles.detailValue}>
                    {selectedAppointment.type}
                  </Text>
                </View>

                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Status atual</Text>
                  <Text style={styles.detailValue}>
                    {getStatusMeta(selectedAppointment.status).label}
                  </Text>
                </View>

                {selectedAppointment.status === "scheduled" && (
                  <>
                    <TouchableOpacity
                      style={[
                        styles.primaryAction,
                        updatingStatus && styles.actionDisabled,
                      ]}
                      onPress={handleMarkCompleted}
                      disabled={updatingStatus}
                      activeOpacity={0.85}
                    >
                      {updatingStatus ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Ionicons
                          name="checkmark-circle-outline"
                          size={18}
                          color="#fff"
                        />
                      )}
                      <Text style={styles.primaryActionText}>
                        Marcar como realizada
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.secondaryAction,
                        updatingStatus && styles.actionDisabled,
                      ]}
                      onPress={handleMarkRescheduled}
                      disabled={updatingStatus}
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name="swap-horizontal-outline"
                        size={18}
                        color={GREEN}
                      />
                      <Text style={styles.secondaryActionText}>
                        Marcar como remarcada
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                {selectedAppointment.status === "completed" && (
                  <TouchableOpacity
                    style={[
                      styles.undoAction,
                      updatingStatus && styles.actionDisabled,
                    ]}
                    onPress={handleUndoCompleted}
                    disabled={updatingStatus}
                    activeOpacity={0.85}
                  >
                    {updatingStatus ? (
                      <ActivityIndicator size="small" color="#c46a1a" />
                    ) : (
                      <Ionicons
                        name="arrow-undo-outline"
                        size={18}
                        color="#c46a1a"
                      />
                    )}
                    <Text style={styles.undoActionText}>
                      Desfazer realizada
                    </Text>
                  </TouchableOpacity>
                )}

                {selectedAppointment.status === "rescheduled" && (
                  <TouchableOpacity
                    style={[
                      styles.secondaryAction,
                      updatingStatus && styles.actionDisabled,
                    ]}
                    onPress={() =>
                      handleStatusChange(
                        "scheduled",
                        "Consulta reativada como agendada.",
                      )
                    }
                    disabled={updatingStatus}
                    activeOpacity={0.85}
                  >
                    {updatingStatus ? (
                      <ActivityIndicator size="small" color={GREEN} />
                    ) : (
                      <Ionicons
                        name="refresh-outline"
                        size={18}
                        color={GREEN}
                      />
                    )}
                    <Text style={styles.secondaryActionText}>
                      Reverter para agendada
                    </Text>
                  </TouchableOpacity>
                )}

                {(selectedAppointment.status === "cancelled" ||
                  selectedAppointment.status === "no_show") && (
                  <View style={styles.detailCard}>
                    <Text style={[styles.detailLabel, { color: "#b03030" }]}>
                      Esta consulta não pode ser alterada
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.closeAction}
                  onPress={() => setSelectedAppointment(null)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.closeActionText}>Fechar</Text>
                </TouchableOpacity>
              </>
            )}
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
    marginBottom: 20,
    shadowColor: "#174c3e",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#173d31",
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: "#5e7b70",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: WHITE,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: "center",
    shadowColor: "#174c3e",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: "800",
    color: GREEN,
  },
  summaryLabel: {
    marginTop: 4,
    fontSize: 12,
    textAlign: "center",
    color: "#648075",
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#173d31",
    marginBottom: 14,
  },
  weekNavigationContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 20,
  },
  weekNavButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#174c3e",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  todayButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#174c3e",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  todayButtonText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: "700",
  },
  weekLabelContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  weekLabelBadge: {
    backgroundColor: "#e8f7f1",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  weekLabelText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2e8b6e",
    textAlign: "center",
  },
  weekRow: {
    gap: 12,
    paddingBottom: 8,
    marginBottom: 20,
  },
  dayCard: {
    width: 120,
    backgroundColor: WHITE,
    borderRadius: 22,
    padding: 16,
    shadowColor: "#174c3e",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  dayCardActive: {
    backgroundColor: GREEN,
  },
  dayWeekLabel: {
    fontSize: 13,
    color: "#648075",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  dayWeekLabelActive: {
    color: "#d9efe5",
  },
  dayDateLabel: {
    marginTop: 8,
    fontSize: 19,
    color: "#173d31",
    fontWeight: "800",
  },
  dayDateLabelActive: {
    color: WHITE,
  },
  dayBadge: {
    marginTop: 14,
    alignSelf: "flex-start",
    backgroundColor: "#f1f8f4",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  dayBadgeActive: {
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  dayBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: GREEN,
  },
  dayBadgeTextActive: {
    color: WHITE,
  },
  emptyCard: {
    backgroundColor: WHITE,
    borderRadius: 24,
    padding: 26,
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 17,
    fontWeight: "800",
    color: "#173d31",
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "#6d877d",
    textAlign: "center",
  },
  emptyBtn: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: "#2e8b6e",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  emptyBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2e8b6e",
  },
  appointmentCard: {
    backgroundColor: WHITE,
    borderRadius: 24,
    marginBottom: 14,
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
  appointmentTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  appointmentTime: {
    fontSize: 22,
    fontWeight: "800",
    color: "#173d31",
  },
  appointmentPatient: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "700",
    color: "#24463a",
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
    fontSize: 12,
    fontWeight: "700",
  },
  appointmentType: {
    marginTop: 12,
    fontSize: 14,
    color: "#617d72",
    fontWeight: "600",
  },
  appointmentHint: {
    marginTop: 8,
    fontSize: 12,
    color: "#88a397",
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(10, 21, 17, 0.35)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 36,
  },
  modalHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#d7ebe2",
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#173d31",
  },
  modalSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: "#678076",
    marginBottom: 18,
  },
  detailCard: {
    backgroundColor: "#f8fcfa",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e8f2ed",
  },
  detailLabel: {
    fontSize: 11,
    color: "#769186",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailValue: {
    marginTop: 6,
    fontSize: 15,
    color: "#173d31",
    fontWeight: "700",
  },
  primaryAction: {
    marginTop: 10,
    height: 52,
    borderRadius: 16,
    backgroundColor: GREEN,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryActionText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryAction: {
    marginTop: 10,
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#cfe2d8",
    backgroundColor: "#f8fcfa",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secondaryActionText: {
    color: GREEN,
    fontSize: 15,
    fontWeight: "700",
  },
  undoAction: {
    marginTop: 10,
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#f5d5b8",
    backgroundColor: ORANGE_LIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  undoActionText: {
    color: "#c46a1a",
    fontSize: 15,
    fontWeight: "700",
  },
  actionDisabled: {
    opacity: 0.6,
  },
  closeAction: {
    marginTop: 10,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  closeActionText: {
    color: "#6f877d",
    fontSize: 15,
    fontWeight: "700",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: GREEN,
    fontWeight: "600",
  },
});
