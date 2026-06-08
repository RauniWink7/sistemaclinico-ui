import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  Platform,
} from "react-native";
import {
  AppointmentAvailabilityApiItem,
  createAppointment,
  getCurrentPatientProfileId,
  getPsychologistAvailability,
  getPsychologists,
  ProfessionalApiItem,
} from "../../services/api";

// Logo após os imports
const showAlert = (title: string, message: string, onOk?: () => void) => {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
    onOk?.();
  } else {
    Alert.alert(
      title,
      message,
      onOk ? [{ text: "OK", onPress: onOk }] : undefined,
    );
  }
};
// ─── Helpers ──────────────────────────────────────────────────────────────────
const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

/**
 * Converte o weekday do JavaScript (0=Dom, 1=Seg ... 6=Sáb)
 * para o padrão da API Django (0=Seg, 1=Ter ... 6=Dom).
 */
const jsToDjangoWeekday = (jsWeekday: number): number =>
  jsWeekday === 0 ? 6 : jsWeekday - 1;

/**
 * Gera slots de tempo a partir de um bloco de disponibilidade.
 * Ex: start=09:00, end=17:00, duration=50 → ["09:00", "09:50", "10:40", ...]
 */
const generateSlots = (
  startTime: string,
  endTime: string,
  durationMinutes = 50,
): string[] => {
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  const startTotal = startH * 60 + startM;
  const endTotal = endH * 60 + endM;
  const slots: string[] = [];

  for (
    let t = startTotal;
    t + durationMinutes <= endTotal;
    t += durationMinutes
  ) {
    const h = String(Math.floor(t / 60)).padStart(2, "0");
    const m = String(t % 60).padStart(2, "0");
    slots.push(`${h}:${m}`);
  }

  return slots;
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface Psychologist {
  id: string;
  name: string;
  crp: string;
  specialty: string;
  initials: string;
  color: string;
  bg: string;
  sessionDuration: number;
}

const formatInitials = (name: string) =>
  name
    .split(" ")
    .filter((part) => part.length > 0)
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

const normalizeProfessional = (item: ProfessionalApiItem): Psychologist => {
  const name =
    item.user?.full_name?.trim() ||
    item.name?.trim() ||
    item.full_name?.trim() ||
    item.psychologistName?.trim() ||
    item.psychologistNameAlt?.trim() ||
    item.professional?.trim() ||
    [item.user?.first_name, item.user?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    [item.first_name, item.last_name].filter(Boolean).join(" ").trim() ||
    "Profissional";

  return {
    id: String(item.id),
    name,
    crp: item.crp || "",
    specialty: item.specialty || "Psicologia",
    initials: item.initials || formatInitials(name),
    color: item.color || "#2e8b6e",
    bg: item.bg || "#e8f7f1",
    sessionDuration: item.session_duration_minutes || 50,
  };
};

const parsePsychologistParam = (param: string | string[] | undefined) => {
  if (!param) return null;
  try {
    const parsed =
      typeof param === "string" ? JSON.parse(param) : JSON.parse(param[0]);
    return normalizeProfessional(parsed);
  } catch {
    return null;
  }
};

type AvailabilityItem = AppointmentAvailabilityApiItem;

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function ScheduleScreen() {
  const { psychologist: psychologistParam } = useLocalSearchParams();
  const initialPsychologist = parsePsychologistParam(psychologistParam);
  const initialPsychologistId = initialPsychologist?.id;
  const { width: screenWidth } = useWindowDimensions();
  const cellSize = Math.min(46, Math.max(36, (screenWidth - 60) / 7));

  const today = new Date();
  const [professionals, setProfessionals] = useState<Psychologist[]>([]);
  const [activePsychologist, setActivePsychologist] =
    useState<Psychologist | null>(initialPsychologist);
  const [loadingPros, setLoadingPros] = useState(true);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availability, setAvailability] = useState<AvailabilityItem[]>([]);
  const [availableWeekdays, setAvailableWeekdays] = useState<string[]>([]);
  const [patientProfileId, setPatientProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

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

  React.useEffect(() => {
    const loadPatientProfile = async () => {
      const result = await getCurrentPatientProfileId();
      if (__DEV__) {
        console.log("👤 patientProfileId result:", JSON.stringify(result));
      }
      setPatientProfileId(result.ok && result.data ? result.data : null);
    };
    void loadPatientProfile();
  }, []);

  React.useEffect(() => {
    const loadProfessionals = async () => {
      setLoadingPros(true);
      const result = await getPsychologists();

      const rawPros: ProfessionalApiItem[] =
        result.ok && Array.isArray(result.data) ? result.data : [];

      if (rawPros.length > 0) {
        const mapped = rawPros.map(normalizeProfessional);
        setProfessionals(mapped);

        const match = initialPsychologistId
          ? (mapped.find((p) => p.id === initialPsychologistId) ?? null)
          : null;
        setActivePsychologist(match ?? mapped[0] ?? null);
      } else {
        setProfessionals([]);
        setActivePsychologist(null);
      }

      setLoadingPros(false);
    };

    void loadProfessionals();
  }, [psychologistParam, initialPsychologistId]);

  React.useEffect(() => {
    const loadAvailability = async () => {
      if (!activePsychologist) {
        setAvailability([]);
        setAvailableWeekdays([]);
        setLoadingSlots(false);
        return;
      }

      setLoadingSlots(true);
      setSelectedDate(null);
      setSelectedTime(null);
      const result = await getPsychologistAvailability(activePsychologist.id);
      const rawList: AvailabilityItem[] = result.data ?? [];

      if (result.ok) {
        const availableItems: AvailabilityItem[] = rawList.filter(
          (item) => item.blocked !== true,
        );
        setAvailability(availableItems);

        // Usa weekday_display diretamente da API (já está em português)
        // e mapeia para abreviações usadas no calendário
        const DJANGO_TO_LABEL: Record<number, string> = {
          0: "Seg",
          1: "Ter",
          2: "Qua",
          3: "Qui",
          4: "Sex",
          5: "Sáb",
          6: "Dom",
        };

        setAvailableWeekdays([
          ...new Set(
            availableItems
              .map(
                (item) =>
                  DJANGO_TO_LABEL[item.weekday] ?? item.weekday_display ?? "",
              )
              .filter(Boolean),
          ),
        ]);
      } else {
        setAvailability([]);
        setAvailableWeekdays([]);
      }
      setLoadingSlots(false);
    };

    void loadAvailability();
  }, [activePsychologist]);

  // ── Calendar logic ──────────────────────────────────────────────────────────
  const getDaysInMonth = (year: number, month: number) =>
    new Date(year, month + 1, 0).getDate();

  const getFirstDayOfMonth = (year: number, month: number) =>
    new Date(year, month, 1).getDay();

  const toKey = (year: number, month: number, day: number) => {
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${year}-${mm}-${dd}`;
  };

  const isPast = (year: number, month: number, day: number) => {
    const d = new Date(year, month, day);
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return d <= t;
  };

  const isAvailable = (year: number, month: number, day: number) => {
    const jsWeekday = new Date(year, month, day).getDay();
    // ✅ Converte JS (0=Dom) → Django (0=Seg)
    const djangoWeekday = jsToDjangoWeekday(jsWeekday);
    return availability.some(
      (item) => !item.blocked && item.weekday === djangoWeekday,
    );
  };

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
    setSelectedDate(null);
    setSelectedTime(null);
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
    setSelectedDate(null);
    setSelectedTime(null);
  };

  const handleDayPress = (key: string) => {
    setSelectedDate(key);
    setSelectedTime(null);
  };

  // ── Confirm ─────────────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!selectedDate || !selectedTime || !activePsychologist) {
      showAlert("Erro", "Preencha todos os campos antes de confirmar.");
      return;
    }
    if (!patientProfileId) {
      showAlert(
        "Erro",
        "Não foi possível identificar seu perfil de paciente. Tente sair e entrar novamente.",
      );

      return;
    }

    setLoading(true);
    try {
      // Cria ISO 8601 com timezone de Brasília (-03:00)
      // Exemplo: 2025-06-15T10:00:00-03:00
      const scheduledAt = `${selectedDate}T${selectedTime}:00-03:00`;

      const result = await createAppointment(
        activePsychologist.id,
        scheduledAt,
        activePsychologist.sessionDuration,
        { patientId: patientProfileId },
      );

      if (!result.ok) {
        showAlert(
          "Erro",
          result.error || "Não foi possível confirmar o agendamento.",
        );

        return;
      }

      showAlert(
        "Consulta agendada! 🎉",
        `${activePsychologist?.name ?? ""}\n${formatDate(selectedDate)}às ${selectedTime}\n\nUm e-mail de confirmação foi enviado.`,
        () => router.back(),
      );
    } catch {
      showAlert("Erro", "Não foi possível confirmar o agendamento.");
    } finally {
      setLoading(false);
    }
  };

  // ── Formatters ───────────────────────────────────────────────────────────────
  const formatDate = (key: string) => {
    const [y, m, d] = key.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return `${WEEKDAYS[date.getDay()]}, ${d} de ${MONTHS[m - 1]}`;
  };

  // ── Build calendar grid ──────────────────────────────────────────────────────
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const calendarCells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);

  // ── Slots para o dia selecionado ─────────────────────────────────────────────
  const selectedDjangoWeekday = selectedDate
    ? (() => {
        const [y, m, d] = selectedDate.split("-").map(Number);
        const jsWeekday = new Date(y, m - 1, d).getDay();
        // ✅ Converte JS (0=Dom) → Django (0=Seg)
        return jsToDjangoWeekday(jsWeekday);
      })()
    : null;

  // ✅ Gera slots de 50 em 50 min dentro de cada bloco de disponibilidade
  const slots =
    selectedDjangoWeekday !== null
      ? availability
          .filter((item) => item.weekday === selectedDjangoWeekday)
          .flatMap((item) =>
            generateSlots(
              item.start_time,
              item.end_time,
              activePsychologist?.sessionDuration ?? 50,
            ),
          )
      : [];

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back-outline" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Agendar Consulta</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          {/* ── Professionals picker ── */}
          <View style={styles.professionalsSection}>
            <Text style={styles.sectionTitle}>Escolha um profissional</Text>
            <View style={styles.professionalsList}>
              {loadingPros ? (
                <ActivityIndicator color={GREEN} />
              ) : professionals.length === 0 ? (
                <Text style={styles.noSlots}>
                  Nenhum profissional encontrado.
                </Text>
              ) : (
                professionals.map((item) => {
                  const isActive = item.id === activePsychologist?.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.professionalCard,
                        isActive && styles.professionalCardSelected,
                      ]}
                      activeOpacity={0.85}
                      onPress={() => setActivePsychologist(item)}
                    >
                      <View
                        style={[
                          styles.professionalAvatar,
                          { backgroundColor: item.bg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.professionalAvatarText,
                            { color: item.color },
                          ]}
                        >
                          {item.initials}
                        </Text>
                      </View>
                      <View style={styles.professionalInfo}>
                        <Text style={styles.professionalNameSmall}>
                          {item.name}
                        </Text>
                        <Text style={styles.professionalSpecialtySmall}>
                          {item.specialty}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </View>

          {activePsychologist ? (
            <>
              {/* ── Psychologist card ── */}
              <View style={styles.psychCard}>
                <View
                  style={[
                    styles.psychAvatar,
                    { backgroundColor: activePsychologist.bg },
                  ]}
                >
                  <Text
                    style={[
                      styles.psychAvatarText,
                      { color: activePsychologist.color },
                    ]}
                  >
                    {activePsychologist.initials}
                  </Text>
                </View>
                <View style={styles.psychInfo}>
                  <Text style={styles.psychName}>
                    {activePsychologist.name}
                  </Text>
                  <Text style={styles.psychCrp}>{activePsychologist.crp}</Text>
                  <View
                    style={[
                      styles.specialtyBadge,
                      { backgroundColor: activePsychologist.bg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.specialtyText,
                        { color: activePsychologist.color },
                      ]}
                    >
                      {activePsychologist.specialty}
                    </Text>
                  </View>
                  <View style={styles.availabilityRow}>
                    <Ionicons name="calendar-outline" size={14} color={GREEN} />
                    <Text style={styles.availabilityText}>
                      {availableWeekdays.length > 0
                        ? availableWeekdays.join(", ")
                        : "Nenhum dia disponível"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* ── Calendar ── */}
              <View style={styles.card}>
                {/* Month nav */}
                <View style={styles.monthNav}>
                  <TouchableOpacity style={styles.navBtn} onPress={prevMonth}>
                    <Ionicons
                      name="chevron-back-outline"
                      size={18}
                      color={GREEN}
                    />
                  </TouchableOpacity>
                  <Text style={styles.monthLabel}>
                    {MONTHS[currentMonth]} {currentYear}
                  </Text>
                  <TouchableOpacity style={styles.navBtn} onPress={nextMonth}>
                    <Ionicons
                      name="chevron-forward-outline"
                      size={18}
                      color={GREEN}
                    />
                  </TouchableOpacity>
                </View>

                {/* Weekday headers */}
                <View style={styles.weekdaysRow}>
                  {WEEKDAYS.map((w) => (
                    <Text
                      key={w}
                      style={[styles.weekdayText, { width: cellSize }]}
                    >
                      {w}
                    </Text>
                  ))}
                </View>

                {/* Days grid */}
                <View style={styles.daysGrid}>
                  {calendarCells.map((day, idx) => {
                    if (!day)
                      return (
                        <View
                          key={`empty-${idx}`}
                          style={[
                            styles.dayCell,
                            {
                              width: cellSize,
                              height: cellSize,
                              borderRadius: cellSize / 2,
                            },
                          ]}
                        />
                      );
                    const key = toKey(currentYear, currentMonth, day);
                    const past = isPast(currentYear, currentMonth, day);
                    const available =
                      !past && isAvailable(currentYear, currentMonth, day);
                    const selected = selectedDate === key;

                    return (
                      <TouchableOpacity
                        key={key}
                        style={[
                          styles.dayCell,
                          {
                            width: cellSize,
                            height: cellSize,
                            borderRadius: cellSize / 2,
                          },
                          available && styles.dayCellAvailable,
                          selected && styles.dayCellSelected,
                          past && styles.dayCellPast,
                        ]}
                        onPress={() => available && handleDayPress(key)}
                        disabled={!available}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            available && styles.dayTextAvailable,
                            selected && styles.dayTextSelected,
                            past && styles.dayTextPast,
                          ]}
                        >
                          {day}
                        </Text>
                        {available && !selected && (
                          <View style={styles.availDot} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Legend */}
                <View style={styles.legend}>
                  <View style={styles.legendItem}>
                    <View
                      style={[
                        styles.legendDot,
                        {
                          backgroundColor: "#e8f7f1",
                          borderWidth: 1,
                          borderColor: GREEN,
                        },
                      ]}
                    />
                    <Text style={styles.legendText}>Disponível</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View
                      style={[styles.legendDot, { backgroundColor: GREEN }]}
                    />
                    <Text style={styles.legendText}>Selecionado</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View
                      style={[styles.legendDot, { backgroundColor: "#f0f0f0" }]}
                    />
                    <Text style={styles.legendText}>Indisponível</Text>
                  </View>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.card}>
              <Text style={styles.noSlots}>
                Selecione um profissional com horário disponível acima.
              </Text>
            </View>
          )}

          {/* ── Time slots ── */}
          {selectedDate && (
            <View style={styles.card}>
              <View style={styles.slotHeader}>
                <Ionicons name="time-outline" size={16} color={GREEN} />
                <Text style={styles.slotTitle}>
                  Horários — {formatDate(selectedDate)}
                </Text>
              </View>

              {loadingSlots ? (
                <ActivityIndicator
                  color={GREEN}
                  style={{ paddingVertical: 18 }}
                />
              ) : slots.length === 0 ? (
                <Text style={styles.noSlots}>
                  Nenhum horário disponível para este dia.
                </Text>
              ) : (
                <View style={styles.slotsGrid}>
                  {slots.map((time) => (
                    <TouchableOpacity
                      key={time}
                      style={[
                        styles.slotBtn,
                        selectedTime === time && styles.slotBtnSelected,
                      ]}
                      onPress={() => setSelectedTime(time)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.slotText,
                          selectedTime === time && styles.slotTextSelected,
                        ]}
                      >
                        {time}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* ── Summary ── */}
          {selectedDate && selectedTime && (
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Ionicons name="person-outline" size={15} color={GREEN} />
                <Text style={styles.summaryText}>
                  {activePsychologist?.name ?? ""}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Ionicons name="calendar-outline" size={15} color={GREEN} />
                <Text style={styles.summaryText}>
                  {formatDate(selectedDate)}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Ionicons name="time-outline" size={15} color={GREEN} />
                <Text style={styles.summaryText}>{selectedTime}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Ionicons name="mail-outline" size={15} color={GREEN} />
                <Text style={styles.summaryText}>
                  Confirmação por e-mail será enviada
                </Text>
              </View>
            </View>
          )}

          {/* ── Confirm button ── */}
          <TouchableOpacity
            style={[
              styles.confirmBtn,
              (!selectedDate || !selectedTime || loading) &&
                styles.confirmBtnDisabled,
            ]}
            onPress={handleConfirm}
            disabled={!selectedDate || !selectedTime || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color={!selectedDate || !selectedTime ? "#aaa" : "#fff"}
                />
                <Text
                  style={[
                    styles.confirmBtnText,
                    (!selectedDate || !selectedTime) &&
                      styles.confirmBtnTextDisabled,
                  ]}
                >
                  Confirmar agendamento
                </Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const GREEN = "#2e8b6e";
const WHITE = "#ffffff";
const BG = "#f0faf5";
const CELL = 42;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  // Header
  header: {
    backgroundColor: GREEN,
    paddingTop: 52,
    paddingBottom: 18,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: WHITE,
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 48,
    gap: 16,
    width: "100%",
    maxWidth: 980,
    alignSelf: "center",
  },

  professionalsSection: {
    width: "100%",
  },
  professionalsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 10,
  },
  professionalCard: {
    minWidth: 140,
    flex: 1,
    backgroundColor: WHITE,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e8f7f1",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  professionalCardSelected: {
    borderColor: GREEN,
    backgroundColor: "#e8f7f1",
  },
  professionalAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  professionalAvatarText: {
    fontSize: 15,
    fontWeight: "800",
  },
  professionalInfo: {
    flex: 1,
    minWidth: 0,
  },
  professionalNameSmall: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1a3d31",
  },
  professionalSpecialtySmall: {
    fontSize: 11,
    color: "#7aab96",
    marginTop: 2,
  },

  // Psychologist card
  psychCard: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  psychAvatar: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  psychAvatarText: {
    fontSize: 18,
    fontWeight: "800",
  },
  psychInfo: { flex: 1, gap: 3 },
  psychName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1a3d31",
  },
  psychCrp: {
    fontSize: 12,
    color: "#7aab96",
  },
  specialtyBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 2,
  },
  specialtyText: {
    fontSize: 11,
    fontWeight: "700",
  },
  availabilityRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  availabilityText: {
    fontSize: 12,
    color: "#4c7f6d",
    fontWeight: "600",
    flexShrink: 1,
  },

  // Card wrapper
  card: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 18,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },

  // Month navigation
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  navBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#e8f7f1",
    alignItems: "center",
    justifyContent: "center",
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1a3d31",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a3d31",
  },

  // Weekdays
  weekdaysRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekdayText: {
    width: CELL,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    color: "#7aab96",
    textTransform: "uppercase",
  },

  // Days grid
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: CELL,
    height: CELL,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    borderRadius: CELL / 2,
    position: "relative",
  },
  dayCellAvailable: {
    backgroundColor: "#e8f7f1",
    borderWidth: 1,
    borderColor: "#b2dfcf",
  },
  dayCellSelected: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  dayCellPast: {
    opacity: 0.3,
  },
  dayText: {
    fontSize: 13,
    color: "#9bbfb0",
    fontWeight: "500",
  },
  dayTextAvailable: {
    color: "#1a3d31",
    fontWeight: "700",
  },
  dayTextSelected: {
    color: WHITE,
    fontWeight: "800",
  },
  dayTextPast: {
    color: "#c0c0c0",
  },
  availDot: {
    position: "absolute",
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: GREEN,
  },

  // Legend
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 11,
    color: "#7aab96",
    fontWeight: "500",
  },

  // Time slots
  slotHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 14,
  },
  slotTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a3d31",
  },
  noSlots: {
    fontSize: 13,
    color: "#7aab96",
    textAlign: "center",
    paddingVertical: 8,
  },
  slotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  slotBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#e8f7f1",
    borderWidth: 1.5,
    borderColor: "#b2dfcf",
  },
  slotBtnSelected: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  slotText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a3d31",
  },
  slotTextSelected: {
    color: WHITE,
  },

  // Summary
  summaryCard: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 18,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  summaryText: {
    fontSize: 14,
    color: "#1a3d31",
    fontWeight: "500",
    flex: 1,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#f0f8f4",
  },

  // Confirm button
  confirmBtn: {
    backgroundColor: GREEN,
    borderRadius: 16,
    height: 54,
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
  confirmBtnDisabled: {
    backgroundColor: "#e0e0e0",
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmBtnText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "700",
  },
  confirmBtnTextDisabled: {
    color: "#aaa",
  },
});
