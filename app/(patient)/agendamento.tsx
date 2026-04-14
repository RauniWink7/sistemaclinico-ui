import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  StatusBar,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

const { width } = Dimensions.get('window');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

// ─── Mock available slots ─────────────────────────────────────────────────────
// Key: "YYYY-MM-DD", Value: array of time strings
const AVAILABLE_SLOTS: Record<string, string[]> = (() => {
  const slots: Record<string, string[]> = {};
  const today = new Date();
  const times = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];

  for (let i = 1; i <= 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (d.getDay() === 0 || d.getDay() === 6) continue; // skip weekends
    const key = d.toISOString().split('T')[0];
    // randomly pick 3-5 slots
    const shuffled = [...times].sort(() => Math.random() - 0.5);
    slots[key] = shuffled.slice(0, Math.floor(Math.random() * 3) + 3).sort();
  }
  return slots;
})();

// ─── Types ────────────────────────────────────────────────────────────────────
interface Psychologist {
  id: string;
  name: string;
  crp: string;
  specialty: string;
  initials: string;
  color: string;
  bg: string;
}

// ─── Default psychologist (fallback) ─────────────────────────────────────────
const DEFAULT_PSYCHOLOGIST: Psychologist = {
  id: '1',
  name: 'Dra. Camila Rocha',
  crp: 'CRP 06/12345',
  specialty: 'Ansiedade e Depressão',
  initials: 'CR',
  color: '#2e8b6e',
  bg: '#e8f7f1',
};

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function ScheduleScreen() {
  const { psychologist: psychologistParam } = useLocalSearchParams();
  const psychologist: Psychologist = psychologistParam
    ? JSON.parse(psychologistParam as string)
    : DEFAULT_PSYCHOLOGIST;

  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // ── Calendar logic ──────────────────────────────────────────────────────────
  const getDaysInMonth = (year: number, month: number) =>
    new Date(year, month + 1, 0).getDate();

  const getFirstDayOfMonth = (year: number, month: number) =>
    new Date(year, month, 1).getDay();

  const toKey = (year: number, month: number, day: number) => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  const isPast = (year: number, month: number, day: number) => {
    const d = new Date(year, month, day);
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return d <= t;
  };

  const isAvailable = (key: string) => !!AVAILABLE_SLOTS[key];

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
    if (!selectedDate || !selectedTime) return;
    setLoading(true);
    try {
      // TODO: POST /api/appointments/
      // await fetch('https://sua-api.com/api/appointments/', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json', Authorization: `Bearer TOKEN` },
      //   body: JSON.stringify({
      //     psychologist_id: psychologist.id,
      //     date: selectedDate,
      //     time: selectedTime,
      //   }),
      // });
      await new Promise((r) => setTimeout(r, 1200)); // simula delay
      Alert.alert(
        'Consulta agendada! 🎉',
        `${psychologist.name}\n${formatDate(selectedDate)} às ${selectedTime}\n\nUm e-mail de confirmação foi enviado.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch {
      Alert.alert('Erro', 'Não foi possível confirmar o agendamento.');
    } finally {
      setLoading(false);
    }
  };

  // ── Formatters ───────────────────────────────────────────────────────────────
  const formatDate = (key: string) => {
    const [y, m, d] = key.split('-').map(Number);
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
  // pad to complete last row
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);

  const slots = selectedDate ? AVAILABLE_SLOTS[selectedDate] ?? [] : [];

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
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* ── Psychologist card ── */}
          <View style={styles.psychCard}>
            <View style={[styles.psychAvatar, { backgroundColor: psychologist.bg }]}>
              <Text style={[styles.psychAvatarText, { color: psychologist.color }]}>
                {psychologist.initials}
              </Text>
            </View>
            <View style={styles.psychInfo}>
              <Text style={styles.psychName}>{psychologist.name}</Text>
              <Text style={styles.psychCrp}>{psychologist.crp}</Text>
              <View style={[styles.specialtyBadge, { backgroundColor: psychologist.bg }]}>
                <Text style={[styles.specialtyText, { color: psychologist.color }]}>
                  {psychologist.specialty}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Calendar ── */}
          <View style={styles.card}>
            {/* Month nav */}
            <View style={styles.monthNav}>
              <TouchableOpacity style={styles.navBtn} onPress={prevMonth}>
                <Ionicons name="chevron-back-outline" size={18} color={GREEN} />
              </TouchableOpacity>
              <Text style={styles.monthLabel}>
                {MONTHS[currentMonth]} {currentYear}
              </Text>
              <TouchableOpacity style={styles.navBtn} onPress={nextMonth}>
                <Ionicons name="chevron-forward-outline" size={18} color={GREEN} />
              </TouchableOpacity>
            </View>

            {/* Weekday headers */}
            <View style={styles.weekdaysRow}>
              {WEEKDAYS.map((w) => (
                <Text key={w} style={styles.weekdayText}>{w}</Text>
              ))}
            </View>

            {/* Days grid */}
            <View style={styles.daysGrid}>
              {calendarCells.map((day, idx) => {
                if (!day) return <View key={`empty-${idx}`} style={styles.dayCell} />;
                const key = toKey(currentYear, currentMonth, day);
                const past = isPast(currentYear, currentMonth, day);
                const available = !past && isAvailable(key);
                const selected = selectedDate === key;

                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.dayCell,
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
                    {available && !selected && <View style={styles.availDot} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Legend */}
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#e8f7f1', borderWidth: 1, borderColor: GREEN }]} />
                <Text style={styles.legendText}>Disponível</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: GREEN }]} />
                <Text style={styles.legendText}>Selecionado</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#f0f0f0' }]} />
                <Text style={styles.legendText}>Indisponível</Text>
              </View>
            </View>
          </View>

          {/* ── Time slots ── */}
          {selectedDate && (
            <View style={styles.card}>
              <View style={styles.slotHeader}>
                <Ionicons name="time-outline" size={16} color={GREEN} />
                <Text style={styles.slotTitle}>
                  Horários — {formatDate(selectedDate)}
                </Text>
              </View>

              {slots.length === 0 ? (
                <Text style={styles.noSlots}>Nenhum horário disponível para este dia.</Text>
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
                <Text style={styles.summaryText}>{psychologist.name}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Ionicons name="calendar-outline" size={15} color={GREEN} />
                <Text style={styles.summaryText}>{formatDate(selectedDate)}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Ionicons name="time-outline" size={15} color={GREEN} />
                <Text style={styles.summaryText}>{selectedTime}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Ionicons name="mail-outline" size={15} color={GREEN} />
                <Text style={styles.summaryText}>Confirmação por e-mail será enviada</Text>
              </View>
            </View>
          )}

          {/* ── Confirm button ── */}
          <TouchableOpacity
            style={[
              styles.confirmBtn,
              (!selectedDate || !selectedTime || loading) && styles.confirmBtnDisabled,
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
                  color={!selectedDate || !selectedTime ? '#aaa' : '#fff'}
                />
                <Text
                  style={[
                    styles.confirmBtnText,
                    (!selectedDate || !selectedTime) && styles.confirmBtnTextDisabled,
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
const GREEN = '#2e8b6e';
const WHITE = '#ffffff';
const BG = '#f0faf5';
const CELL = (width - 40 - 24) / 7;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  // Header
  header: {
    backgroundColor: GREEN,
    paddingTop: 52,
    paddingBottom: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: WHITE,
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 48,
    gap: 16,
  },

  // Psychologist card
  psychCard: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  psychAvatarText: {
    fontSize: 18,
    fontWeight: '800',
  },
  psychInfo: { flex: 1, gap: 3 },
  psychName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1a3d31',
  },
  psychCrp: {
    fontSize: 12,
    color: '#7aab96',
  },
  specialtyBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 2,
  },
  specialtyText: {
    fontSize: 11,
    fontWeight: '700',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#e8f7f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a3d31',
  },

  // Weekdays
  weekdaysRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayText: {
    width: CELL,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#7aab96',
    textTransform: 'uppercase',
  },

  // Days grid
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: CELL,
    height: CELL,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderRadius: CELL / 2,
    position: 'relative',
  },
  dayCellAvailable: {
    backgroundColor: '#e8f7f1',
    borderWidth: 1,
    borderColor: '#b2dfcf',
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
    color: '#9bbfb0',
    fontWeight: '500',
  },
  dayTextAvailable: {
    color: '#1a3d31',
    fontWeight: '700',
  },
  dayTextSelected: {
    color: WHITE,
    fontWeight: '800',
  },
  dayTextPast: {
    color: '#c0c0c0',
  },
  availDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: GREEN,
  },

  // Legend
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 11,
    color: '#7aab96',
    fontWeight: '500',
  },

  // Time slots
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 14,
  },
  slotTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a3d31',
  },
  noSlots: {
    fontSize: 13,
    color: '#7aab96',
    textAlign: 'center',
    paddingVertical: 8,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  slotBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#e8f7f1',
    borderWidth: 1.5,
    borderColor: '#b2dfcf',
  },
  slotBtnSelected: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  slotText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a3d31',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  summaryText: {
    fontSize: 14,
    color: '#1a3d31',
    fontWeight: '500',
    flex: 1,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#f0f8f4',
  },

  // Confirm button
  confirmBtn: {
    backgroundColor: GREEN,
    borderRadius: 16,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  confirmBtnDisabled: {
    backgroundColor: '#e0e0e0',
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmBtnText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '700',
  },
  confirmBtnTextDisabled: {
    color: '#aaa',
  },
});
