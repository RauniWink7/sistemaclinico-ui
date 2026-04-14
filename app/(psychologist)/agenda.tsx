import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

type AppointmentStatus = 'scheduled' | 'completed' | 'rescheduled';

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

interface BlockPeriod {
  id: string;
  label: string;
  period: string;
}

const GREEN = '#2e8b6e';
const GREEN_DARK = '#1f684f';
const GREEN_LIGHT = '#e8f7f1';
const BLUE_LIGHT = '#eaf1ff';
const ORANGE_LIGHT = '#fef3e8';
const BG = '#f0faf5';
const WHITE = '#ffffff';

const WEEK_DAYS = [
  { key: 'mon', weekday: 'Seg', fullLabel: '07 Abr' },
  { key: 'tue', weekday: 'Ter', fullLabel: '08 Abr' },
  { key: 'wed', weekday: 'Qua', fullLabel: '09 Abr' },
  { key: 'thu', weekday: 'Qui', fullLabel: '10 Abr' },
  { key: 'fri', weekday: 'Sex', fullLabel: '11 Abr' },
];

const INITIAL_APPOINTMENTS: WeeklyAppointment[] = [
  {
    id: '1',
    dayKey: 'mon',
    weekday: 'Seg',
    dateLabel: '07 Abr',
    time: '09:00',
    patientName: 'Ana Beatriz',
    type: 'Sessao individual',
    status: 'scheduled',
  },
  {
    id: '2',
    dayKey: 'mon',
    weekday: 'Seg',
    dateLabel: '07 Abr',
    time: '14:30',
    patientName: 'Carlos Henrique',
    type: 'Retorno',
    status: 'scheduled',
  },
  {
    id: '3',
    dayKey: 'tue',
    weekday: 'Ter',
    dateLabel: '08 Abr',
    time: '10:00',
    patientName: 'Juliana Alves',
    type: 'Sessao individual',
    status: 'completed',
  },
  {
    id: '4',
    dayKey: 'wed',
    weekday: 'Qua',
    dateLabel: '09 Abr',
    time: '16:00',
    patientName: 'Matheus Lima',
    type: 'Acompanhamento',
    status: 'rescheduled',
  },
  {
    id: '5',
    dayKey: 'thu',
    weekday: 'Qui',
    dateLabel: '10 Abr',
    time: '11:00',
    patientName: 'Renata Souza',
    type: 'Sessao individual',
    status: 'scheduled',
  },
  {
    id: '6',
    dayKey: 'fri',
    weekday: 'Sex',
    dateLabel: '11 Abr',
    time: '15:30',
    patientName: 'Fernanda Costa',
    type: 'Retorno',
    status: 'scheduled',
  },
];

const INITIAL_BLOCKS: BlockPeriod[] = [
  { id: '1', label: 'Folga da tarde', period: 'Sexta, 11 Abr - 18:00 ate 20:00' },
];

const DecorativeBackground = () => (
  <>
    <View style={styles.circle1} />
    <View style={styles.circle2} />
  </>
);

const getStatusMeta = (status: AppointmentStatus) => {
  switch (status) {
    case 'completed':
      return {
        label: 'Realizada',
        icon: 'checkmark-circle-outline',
        color: '#2d6cdf',
        bg: BLUE_LIGHT,
      };
    case 'rescheduled':
      return {
        label: 'Remarcada',
        icon: 'swap-horizontal-outline',
        color: '#c46a1a',
        bg: ORANGE_LIGHT,
      };
    default:
      return {
        label: 'Agendada',
        icon: 'calendar-outline',
        color: GREEN,
        bg: GREEN_LIGHT,
      };
  }
};

export default function PsychologistAgendaScreen() {
  const [appointments, setAppointments] = useState(INITIAL_APPOINTMENTS);
  const [blockedPeriods, setBlockedPeriods] = useState(INITIAL_BLOCKS);
  const [selectedDay, setSelectedDay] = useState(WEEK_DAYS[0].key);
  const [selectedAppointment, setSelectedAppointment] = useState<WeeklyAppointment | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const summary = useMemo(() => {
    const todayCount = appointments.filter((item) => item.dayKey === selectedDay).length;
    const completedCount = appointments.filter((item) => item.status === 'completed').length;
    return {
      todayCount,
      completedCount,
      blockedCount: blockedPeriods.length,
    };
  }, [appointments, blockedPeriods, selectedDay]);

  const selectedDayAppointments = useMemo(
    () =>
      appointments
        .filter((item) => item.dayKey === selectedDay)
        .sort((a, b) => a.time.localeCompare(b.time)),
    [appointments, selectedDay]
  );

  const handleBlockPeriod = () => {
    const activeDay = WEEK_DAYS.find((day) => day.key === selectedDay) ?? WEEK_DAYS[0];
    const newBlock: BlockPeriod = {
      id: `block-${Date.now()}`,
      label: 'Periodo bloqueado',
      period: `${activeDay.weekday}, ${activeDay.fullLabel} - 13:00 ate 17:00`,
    };

    setBlockedPeriods((current) => [newBlock, ...current]);
    Alert.alert('Periodo bloqueado', 'Horario reservado para folga, ferias ou indisponibilidade.');
  };

  const handleMarkCompleted = () => {
    if (!selectedAppointment) return;

    setAppointments((current) =>
      current.map((item) =>
        item.id === selectedAppointment.id ? { ...item, status: 'completed' } : item
      )
    );

    setSelectedAppointment((current) =>
      current ? { ...current, status: 'completed' } : current
    );

    // TODO: PATCH /api/appointments/<id>/ { status: 'completed' }
    Alert.alert('Consulta atualizada', 'Status enviado como completed para a consulta.');
  };

  const handleMarkRescheduled = () => {
    if (!selectedAppointment) return;

    setAppointments((current) =>
      current.map((item) =>
        item.id === selectedAppointment.id ? { ...item, status: 'rescheduled' } : item
      )
    );

    setSelectedAppointment((current) =>
      current ? { ...current, status: 'rescheduled' } : current
    );

    Alert.alert('Consulta remarcada', 'A consulta foi marcada como remarcada.');
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
          <Text style={styles.headerEyebrow}>Area do psicologo</Text>
          <Text style={styles.headerTitle}>Agenda profissional</Text>
        </View>

        <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/dashboardP')}>
          <Ionicons name="home-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>Visualize sua semana clinica</Text>
            <Text style={styles.heroSubtitle}>
              Acompanhe consultas agendadas, veja o status de cada atendimento e bloqueie periodos
              da sua agenda.
            </Text>

            <TouchableOpacity
              style={styles.blockButton}
              onPress={handleBlockPeriod}
              activeOpacity={0.85}
            >
              <Ionicons name="ban-outline" size={18} color="#fff" />
              <Text style={styles.blockButtonText}>Bloquear periodo</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{summary.todayCount}</Text>
              <Text style={styles.summaryLabel}>Consultas no dia</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{summary.completedCount}</Text>
              <Text style={styles.summaryLabel}>Realizadas</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{summary.blockedCount}</Text>
              <Text style={styles.summaryLabel}>Bloqueios</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Calendario semanal</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.weekRow}
          >
            {WEEK_DAYS.map((day) => {
              const isActive = day.key === selectedDay;
              const appointmentsCount = appointments.filter((item) => item.dayKey === day.key).length;

              return (
                <TouchableOpacity
                  key={day.key}
                  style={[styles.dayCard, isActive && styles.dayCardActive]}
                  onPress={() => setSelectedDay(day.key)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.dayWeekLabel, isActive && styles.dayWeekLabelActive]}>
                    {day.weekday}
                  </Text>
                  <Text style={[styles.dayDateLabel, isActive && styles.dayDateLabelActive]}>
                    {day.fullLabel}
                  </Text>
                  <View style={[styles.dayBadge, isActive && styles.dayBadgeActive]}>
                    <Text style={[styles.dayBadgeText, isActive && styles.dayBadgeTextActive]}>
                      {appointmentsCount} consulta{appointmentsCount === 1 ? '' : 's'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.sectionTitle}>Consultas agendadas</Text>
          {selectedDayAppointments.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="calendar-clear-outline" size={34} color="#9bbcaf" />
              <Text style={styles.emptyTitle}>Sem consultas nesse dia</Text>
              <Text style={styles.emptyText}>Selecione outro dia da semana ou bloqueie o periodo.</Text>
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
                  <View style={[styles.statusStripe, { backgroundColor: statusMeta.color }]} />

                  <View style={styles.appointmentBody}>
                    <View style={styles.appointmentTopRow}>
                      <View>
                        <Text style={styles.appointmentTime}>{appointment.time}</Text>
                        <Text style={styles.appointmentPatient}>{appointment.patientName}</Text>
                      </View>

                      <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}>
                        <Ionicons
                          name={statusMeta.icon as any}
                          size={14}
                          color={statusMeta.color}
                        />
                        <Text style={[styles.statusText, { color: statusMeta.color }]}>
                          {statusMeta.label}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.appointmentType}>{appointment.type}</Text>
                    <Text style={styles.appointmentHint}>
                      Toque para abrir detalhes e atualizar o atendimento.
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          <Text style={styles.sectionTitle}>Periodos bloqueados</Text>
          <View style={styles.blocksCard}>
            {blockedPeriods.map((period) => (
              <View key={period.id} style={styles.blockRow}>
                <View style={styles.blockIconBox}>
                  <Ionicons name="ban-outline" size={16} color="#c46a1a" />
                </View>
                <View style={styles.blockTextBox}>
                  <Text style={styles.blockLabel}>{period.label}</Text>
                  <Text style={styles.blockPeriod}>{period.period}</Text>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>
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
                  {selectedAppointment.weekday}, {selectedAppointment.dateLabel} as{' '}
                  {selectedAppointment.time}
                </Text>

                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Paciente</Text>
                  <Text style={styles.detailValue}>{selectedAppointment.patientName}</Text>
                </View>

                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Tipo de atendimento</Text>
                  <Text style={styles.detailValue}>{selectedAppointment.type}</Text>
                </View>

                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Status atual</Text>
                  <Text style={styles.detailValue}>
                    {getStatusMeta(selectedAppointment.status).label}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.primaryAction}
                  onPress={handleMarkCompleted}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                  <Text style={styles.primaryActionText}>Marcar como realizada</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryAction}
                  onPress={handleMarkRescheduled}
                  activeOpacity={0.85}
                >
                  <Ionicons name="swap-horizontal-outline" size={18} color={GREEN} />
                  <Text style={styles.secondaryActionText}>Marcar como remarcada</Text>
                </TouchableOpacity>

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
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#27795f',
    top: -110,
    right: -70,
    opacity: 0.45,
  },
  circle2: {
    position: 'absolute',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextBox: {
    flex: 1,
    marginHorizontal: 14,
  },
  headerEyebrow: {
    color: '#bce3d5',
    fontSize: 13,
    fontWeight: '600',
  },
  headerTitle: {
    color: WHITE,
    fontSize: 24,
    fontWeight: '800',
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
    shadowColor: '#174c3e',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#173d31',
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: '#5e7b70',
  },
  blockButton: {
    marginTop: 18,
    alignSelf: 'flex-start',
    backgroundColor: GREEN,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  blockButtonText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: WHITE,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    shadowColor: '#174c3e',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    color: GREEN,
  },
  summaryLabel: {
    marginTop: 4,
    fontSize: 12,
    textAlign: 'center',
    color: '#648075',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#173d31',
    marginBottom: 14,
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
    shadowColor: '#174c3e',
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
    color: '#648075',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  dayWeekLabelActive: {
    color: '#d9efe5',
  },
  dayDateLabel: {
    marginTop: 8,
    fontSize: 19,
    color: '#173d31',
    fontWeight: '800',
  },
  dayDateLabelActive: {
    color: WHITE,
  },
  dayBadge: {
    marginTop: 14,
    alignSelf: 'flex-start',
    backgroundColor: '#f1f8f4',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  dayBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  dayBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: GREEN,
  },
  dayBadgeTextActive: {
    color: WHITE,
  },
  emptyCard: {
    backgroundColor: WHITE,
    borderRadius: 24,
    padding: 26,
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 17,
    fontWeight: '800',
    color: '#173d31',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#6d877d',
    textAlign: 'center',
  },
  appointmentCard: {
    backgroundColor: WHITE,
    borderRadius: 24,
    marginBottom: 14,
    overflow: 'hidden',
    flexDirection: 'row',
    shadowColor: '#174c3e',
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  appointmentTime: {
    fontSize: 22,
    fontWeight: '800',
    color: '#173d31',
  },
  appointmentPatient: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '700',
    color: '#24463a',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  statusText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '700',
  },
  appointmentType: {
    marginTop: 12,
    fontSize: 14,
    color: '#617d72',
    fontWeight: '600',
  },
  appointmentHint: {
    marginTop: 8,
    fontSize: 12,
    color: '#88a397',
    lineHeight: 18,
  },
  blocksCard: {
    backgroundColor: WHITE,
    borderRadius: 24,
    padding: 18,
    shadowColor: '#174c3e',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  blockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  blockIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: ORANGE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  blockTextBox: {
    flex: 1,
  },
  blockLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#173d31',
  },
  blockPeriod: {
    marginTop: 4,
    fontSize: 13,
    color: '#677f74',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 21, 17, 0.35)',
    justifyContent: 'flex-end',
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
    backgroundColor: '#d7ebe2',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#173d31',
  },
  modalSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#678076',
    marginBottom: 18,
  },
  detailCard: {
    backgroundColor: '#f8fcfa',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e8f2ed',
  },
  detailLabel: {
    fontSize: 11,
    color: '#769186',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    marginTop: 6,
    fontSize: 15,
    color: '#173d31',
    fontWeight: '700',
  },
  primaryAction: {
    marginTop: 10,
    height: 52,
    borderRadius: 16,
    backgroundColor: GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryActionText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryAction: {
    marginTop: 10,
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#cfe2d8',
    backgroundColor: '#f8fcfa',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryActionText: {
    color: GREEN,
    fontSize: 15,
    fontWeight: '700',
  },
  closeAction: {
    marginTop: 10,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeActionText: {
    color: '#6f877d',
    fontSize: 15,
    fontWeight: '700',
  },
});
