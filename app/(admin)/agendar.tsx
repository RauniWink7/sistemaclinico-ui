import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
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
  useWindowDimensions,
  View,
} from "react-native";
import {
  AppointmentAvailabilityApiItem,
  createAppointment,
  getClinicPatients,
  getMe,
  getProfessionalsByClinic,
  getPsychologistAvailability,
} from "../../services/api";
import { useSavedToast } from "../../components/saved-toast";

const GREEN = "#2e8b6e";
const GREEN_DARK = "#1f684f";
const GREEN_LIGHT = "#e8f7f1";
const BG = "#f0faf5";
const WHITE = "#ffffff";

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

// JS weekday (0=Dom ... 6=Sáb) → Django (0=Seg ... 6=Dom)
const jsToDjangoWeekday = (jsWeekday: number): number =>
  jsWeekday === 0 ? 6 : jsWeekday - 1;

const DJANGO_TO_LABEL: Record<number, string> = {
  0: "Seg",
  1: "Ter",
  2: "Qua",
  3: "Qui",
  4: "Sex",
  5: "Sáb",
  6: "Dom",
};

// Gera slots dentro de um bloco de disponibilidade.
// Ex: 09:00–17:00, 50min → ["09:00", "09:50", "10:40", ...]
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

  for (let t = startTotal; t + durationMinutes <= endTotal; t += durationMinutes) {
    const h = String(Math.floor(t / 60)).padStart(2, "0");
    const m = String(t % 60).padStart(2, "0");
    slots.push(`${h}:${m}`);
  }
  return slots;
};

type AvailabilityItem = AppointmentAvailabilityApiItem;

interface SimpleUser {
  id: string;
  label: string;
  sessionDuration?: number;
}

const DecorativeBackground = () => (
  <>
    <View style={styles.circle1} />
    <View style={styles.circle2} />
  </>
);

// ─── Seletor de lista ─────────────────────────────────────────────────────────
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
export default function AdminAgendarScreen() {
  const params = useLocalSearchParams<{
    patientId?: string;
    professionalId?: string;
  }>();

  const { showToast, toast } = useSavedToast();
  const { width: screenWidth } = useWindowDimensions();
  const cellSize = Math.min(46, Math.max(34, (screenWidth - 80) / 7));

  const today = new Date();

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clinicId, setClinicId] = useState<string | null>(null);

  const [patients, setPatients] = useState<SimpleUser[]>([]);
  const [professionals, setProfessionals] = useState<SimpleUser[]>([]);

  const [selectedPatient, setSelectedPatient] = useState<string | null>(
    params.patientId ?? null,
  );
  const [selectedProfessional, setSelectedProfessional] = useState<
    string | null
  >(params.professionalId ?? null);

  // Calendário
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availability, setAvailability] = useState<AvailabilityItem[]>([]);
  const [availableWeekdays, setAvailableWeekdays] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [duration, setDuration] = useState("50");

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
        if (!meResult.ok || !meResult.data?.clinic) {
          Alert.alert("Erro", "Não foi possível identificar a clínica.");
          return;
        }

        const cId = meResult.data.clinic;
        setClinicId(cId);
        const [patientsRes, professionalsRes] = await Promise.all([
          getClinicPatients(cId),
          getProfessionalsByClinic(cId),
        ]);

        if (patientsRes.ok) {
          setPatients(
            (patientsRes.data ?? []).map((p: any) => ({
              id: p.id,
              label: p.user?.full_name ?? p.user?.email ?? p.id,
            })),
          );
        }

        if (professionalsRes.ok) {
          setProfessionals(
            (professionalsRes.data ?? []).map((p: any) => ({
              id: p.id,
              label: p.user?.full_name ?? p.user?.email ?? p.id,
              sessionDuration: p.session_duration_minutes ?? 50,
            })),
          );
        }
      } catch (err: any) {
        Alert.alert("Erro", err?.message ?? "Ocorreu um erro inesperado.");
      } finally {
        setLoadingInitial(false);
      }
    };

    void init();
  }, []);

  // Carrega a disponibilidade do profissional selecionado
  useEffect(() => {
    const loadAvailability = async () => {
      if (!selectedProfessional) {
        setAvailability([]);
        setAvailableWeekdays([]);
        return;
      }

      const pro = professionals.find((p) => p.id === selectedProfessional);
      if (pro?.sessionDuration) setDuration(String(pro.sessionDuration));

      setLoadingSlots(true);
      setSelectedDate(null);
      setSelectedTime(null);

      const result = await getPsychologistAvailability(selectedProfessional);
      const rawList: AvailabilityItem[] = result.data ?? [];

      if (result.ok) {
        const availableItems = rawList.filter((item) => item.blocked !== true);
        setAvailability(availableItems);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProfessional, professionals]);

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
    return d < t;
  };

  const isAvailable = (year: number, month: number, day: number) => {
    const jsWeekday = new Date(year, month, day).getDay();
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

  // ── Formatters ────────────────────────────────────────────────────────────────
  const formatDate = (key: string) => {
    const [y, m, d] = key.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return `${WEEKDAYS[date.getDay()]}, ${d} de ${MONTHS[m - 1]}`;
  };

  const selectedProfessionalLabel =
    professionals.find((p) => p.id === selectedProfessional)?.label ?? "";
  const selectedPatientLabel =
    patients.find((p) => p.id === selectedPatient)?.label ?? "";

  const handleSave = async () => {
    if (!selectedPatient) {
      Alert.alert("Campo obrigatório", "Selecione o paciente.");
      return;
    }
    if (!selectedProfessional) {
      Alert.alert("Campo obrigatório", "Selecione o psicólogo.");
      return;
    }
    if (!selectedDate || !selectedTime) {
      Alert.alert(
        "Campo obrigatório",
        "Selecione a data e o horário no calendário.",
      );
      return;
    }
    if (!clinicId) {
      Alert.alert("Erro", "Clínica não identificada.");
      return;
    }

    const durationMin = parseInt(duration, 10);
    if (isNaN(durationMin) || durationMin < 10) {
      Alert.alert(
        "Duração inválida",
        "Informe uma duração de pelo menos 10 minutos.",
      );
      return;
    }

    setSaving(true);
    try {
      // ISO 8601 com timezone de Brasília (-03:00) — o backend converte com
      // timezone.localtime para validar a disponibilidade. Enviar "Z" (UTC)
      // deslocava o horário em 3h e quebrava o agendamento.
      const scheduledAt = `${selectedDate}T${selectedTime}:00-03:00`;
      const result = await createAppointment(
        selectedProfessional,
        scheduledAt,
        durationMin,
        { patientId: selectedPatient, clinicId },
      );

      if (!result.ok) {
        Alert.alert(
          "Erro ao agendar",
          result.error ?? "Não foi possível criar a consulta.",
        );
        return;
      }

      showToast("Consulta agendada com sucesso");
      setTimeout(() => router.back(), 1200);
    } catch (err: any) {
      Alert.alert("Erro", err?.message ?? "Ocorreu um erro inesperado.");
    } finally {
      setSaving(false);
    }
  };

  // ── Build calendar grid ──────────────────────────────────────────────────────
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const calendarCells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);

  // ── Slots do dia selecionado ─────────────────────────────────────────────────
  const selectedDjangoWeekday = selectedDate
    ? (() => {
        const [y, m, d] = selectedDate.split("-").map(Number);
        const jsWeekday = new Date(y, m - 1, d).getDay();
        return jsToDjangoWeekday(jsWeekday);
      })()
    : null;

  const slotDuration = parseInt(duration, 10) || 50;
  const slots =
    selectedDjangoWeekday !== null
      ? [
          ...new Set(
            availability
              .filter((item) => item.weekday === selectedDjangoWeekday)
              .flatMap((item) =>
                generateSlots(item.start_time, item.end_time, slotDuration),
              ),
          ),
        ].sort()
      : [];

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
            <Text style={styles.headerTitle}>Novo agendamento</Text>
          </View>
          <View style={{ width: 42 }} />
        </View>
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
      <DecorativeBackground />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back-outline" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTextBox}>
          <Text style={styles.headerEyebrow}>Area administrativa</Text>
          <Text style={styles.headerTitle}>Novo agendamento</Text>
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
            <Text style={styles.heroEyebrow}>Agendamento</Text>
            <Text style={styles.heroTitle}>Nova consulta</Text>
            <Text style={styles.heroSubtitle}>
              Selecione o paciente, o psicólogo e escolha a data e o horário no
              calendário.
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Participantes</Text>

            <Selector
              label="Paciente *"
              items={patients}
              selected={selectedPatient}
              onSelect={setSelectedPatient}
            />

            <Selector
              label="Psicólogo *"
              items={professionals}
              selected={selectedProfessional}
              onSelect={setSelectedProfessional}
            />
          </View>

          {/* ── Calendário ── */}
          {!selectedProfessional ? (
            <View style={styles.formCard}>
              <Text style={styles.noSlots}>
                Selecione um psicólogo para ver os dias disponíveis.
              </Text>
            </View>
          ) : (
            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>Data e horário</Text>

              <View style={styles.availabilityRow}>
                <Ionicons name="calendar-outline" size={14} color={GREEN} />
                <Text style={styles.availabilityText}>
                  {availableWeekdays.length > 0
                    ? `Atende: ${availableWeekdays.join(", ")}`
                    : "Nenhum dia disponível para este profissional"}
                </Text>
              </View>

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
                  <Text key={w} style={[styles.weekdayText, { width: cellSize }]}>
                    {w}
                  </Text>
                ))}
              </View>

              {/* Days grid */}
              {loadingSlots ? (
                <ActivityIndicator color={GREEN} style={{ paddingVertical: 24 }} />
              ) : (
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
              )}

              {/* Legend */}
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      {
                        backgroundColor: GREEN_LIGHT,
                        borderWidth: 1,
                        borderColor: GREEN,
                      },
                    ]}
                  />
                  <Text style={styles.legendText}>Disponível</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: GREEN }]} />
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
          )}

          {/* ── Time slots ── */}
          {selectedDate && (
            <View style={styles.formCard}>
              <View style={styles.slotHeader}>
                <Ionicons name="time-outline" size={16} color={GREEN} />
                <Text style={styles.slotTitle}>
                  Horários — {formatDate(selectedDate)}
                </Text>
              </View>

              {slots.length === 0 ? (
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

          {/* ── Duração ── */}
          {selectedProfessional && (
            <View style={styles.formCard}>
              <Text style={styles.fieldLabel}>Duração (minutos)</Text>
              <TextInput
                style={styles.textRealInput}
                value={duration}
                onChangeText={setDuration}
                placeholder="50"
                placeholderTextColor="#94b3a6"
                keyboardType="numeric"
              />
            </View>
          )}

          {/* ── Resumo ── */}
          {selectedDate && selectedTime && (
            <View style={styles.formCard}>
              <View style={styles.summaryRow}>
                <Ionicons name="person-outline" size={15} color={GREEN} />
                <Text style={styles.summaryText}>{selectedPatientLabel}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Ionicons name="medkit-outline" size={15} color={GREEN} />
                <Text style={styles.summaryText}>
                  {selectedProfessionalLabel}
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
                <Text style={styles.summaryText}>
                  {selectedTime} · {slotDuration} min
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.saveButton,
              (!selectedDate || !selectedTime || saving) &&
                styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={!selectedDate || !selectedTime || saving}
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
      {toast}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
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
  headerTextBox: { flex: 1, marginHorizontal: 14 },
  headerEyebrow: { color: "#bce3d5", fontSize: 13, fontWeight: "600" },
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
  loadingText: { fontSize: 15, color: GREEN, fontWeight: "600" },
  scroll: { flex: 1 },
  scrollContent: {
    padding: 22,
    paddingBottom: 40,
    maxWidth: 960,
    alignSelf: "center" as const,
    width: "100%" as const,
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
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#5f7d70",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  selectorGroup: { marginBottom: 16 },
  selectorBtn: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#d7ebe2",
    backgroundColor: "#fbfefd",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectorBtnText: {
    fontSize: 15,
    color: "#173d31",
    fontWeight: "500",
    flex: 1,
  },
  dropdown: {
    marginTop: 4,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#d7ebe2",
    backgroundColor: WHITE,
    overflow: "hidden",
  },
  dropdownEmpty: {
    padding: 16,
    fontSize: 14,
    color: "#94b3a6",
    textAlign: "center",
  },
  dropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownItemActive: { backgroundColor: GREEN_LIGHT },
  dropdownItemText: { fontSize: 15, color: "#173d31", fontWeight: "500" },
  dropdownItemTextActive: { color: GREEN, fontWeight: "700" },

  // Disponibilidade
  availabilityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  availabilityText: {
    fontSize: 13,
    color: "#4c7f6d",
    fontWeight: "600",
    flexShrink: 1,
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
    backgroundColor: GREEN_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1a3d31",
  },

  // Weekdays
  weekdaysRow: { flexDirection: "row", marginBottom: 8 },
  weekdayText: {
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    color: "#7aab96",
    textTransform: "uppercase",
  },

  // Days grid
  daysGrid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    position: "relative",
  },
  dayCellAvailable: {
    backgroundColor: GREEN_LIGHT,
    borderWidth: 1,
    borderColor: "#b2dfcf",
  },
  dayCellSelected: { backgroundColor: GREEN, borderColor: GREEN },
  dayCellPast: { opacity: 0.3 },
  dayText: { fontSize: 13, color: "#9bbfb0", fontWeight: "500" },
  dayTextAvailable: { color: "#1a3d31", fontWeight: "700" },
  dayTextSelected: { color: WHITE, fontWeight: "800" },
  dayTextPast: { color: "#c0c0c0" },
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
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontSize: 11, color: "#7aab96", fontWeight: "500" },

  // Time slots
  slotHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 14,
  },
  slotTitle: { fontSize: 14, fontWeight: "700", color: "#1a3d31" },
  noSlots: {
    fontSize: 13,
    color: "#7aab96",
    textAlign: "center",
    paddingVertical: 8,
  },
  slotsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  slotBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: GREEN_LIGHT,
    borderWidth: 1.5,
    borderColor: "#b2dfcf",
  },
  slotBtnSelected: { backgroundColor: GREEN, borderColor: GREEN },
  slotText: { fontSize: 14, fontWeight: "700", color: "#1a3d31" },
  slotTextSelected: { color: WHITE },

  // Resumo
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
  summaryDivider: { height: 1, backgroundColor: "#f0f8f4" },

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
  saveButtonDisabled: { backgroundColor: "#cdddd5", shadowOpacity: 0 },
  saveButtonText: { color: WHITE, fontSize: 16, fontWeight: "700" },
  textRealInput: {
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
});
