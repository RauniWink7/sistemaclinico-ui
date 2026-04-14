import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

type AppointmentStatus = 'agendada' | 'realizada' | 'cancelada';

interface Appointment {
  id: string;
  date: string;
  time: string;
  psychologist: string;
  specialty: string;
  status: AppointmentStatus;
  hasReview: boolean;
}

const GREEN = '#2e8b6e';
const GREEN_DARK = '#1e6b54';
const GREEN_LIGHT = '#e8f7f1';
const BG = '#f0faf5';
const WHITE = '#ffffff';

const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: '1',
    date: '2026-04-04',
    time: '09:00',
    psychologist: 'Dra. Camila Rocha',
    specialty: 'Psicologia Clinica',
    status: 'agendada',
    hasReview: false,
  },
  {
    id: '2',
    date: '2026-04-01',
    time: '18:30',
    psychologist: 'Dr. Felipe Moura',
    specialty: 'Terapia Cognitivo-Comportamental',
    status: 'agendada',
    hasReview: false,
  },
  {
    id: '3',
    date: '2026-03-28',
    time: '14:00',
    psychologist: 'Dra. Marina Costa',
    specialty: 'Psicologia Clinica',
    status: 'realizada',
    hasReview: false,
  },
  {
    id: '4',
    date: '2026-03-18',
    time: '10:30',
    psychologist: 'Dra. Camila Rocha',
    specialty: 'Ansiedade e Depressao',
    status: 'realizada',
    hasReview: true,
  },
  {
    id: '5',
    date: '2026-03-10',
    time: '16:00',
    psychologist: 'Dr. Felipe Moura',
    specialty: 'Relacionamentos',
    status: 'cancelada',
    hasReview: false,
  },
];

const DecorativeBackground = () => (
  <>
    <View style={styles.circle1} />
    <View style={styles.circle2} />
  </>
);

const SectionTitle = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <View style={styles.sectionHeading}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <Text style={styles.sectionSubtitle}>{subtitle}</Text>
  </View>
);

const getStatusMeta = (status: AppointmentStatus) => {
  switch (status) {
    case 'agendada':
      return {
        label: 'Agendada',
        icon: 'calendar-outline',
        color: '#2e8b6e',
        bg: '#e8f7f1',
      };
    case 'realizada':
      return {
        label: 'Realizada',
        icon: 'checkmark-circle-outline',
        color: '#2d6cdf',
        bg: '#eaf1ff',
      };
    default:
      return {
        label: 'Cancelada',
        icon: 'close-circle-outline',
        color: '#d95c5c',
        bg: '#fdeeee',
      };
  }
};

export default function ConsultasScreen() {
  const [appointments, setAppointments] = useState<Appointment[]>(MOCK_APPOINTMENTS);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const sortedAppointments = useMemo(
    () =>
      [...appointments].sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}:00`).getTime();
        const dateB = new Date(`${b.date}T${b.time}:00`).getTime();
        return dateB - dateA;
      }),
    [appointments]
  );

  const summary = useMemo(() => {
    const now = new Date();
    return {
      future: appointments.filter(
        (item) => item.status === 'agendada' && new Date(`${item.date}T${item.time}:00`) > now
      ).length,
      finished: appointments.filter((item) => item.status === 'realizada').length,
      pendingReview: appointments.filter(
        (item) => item.status === 'realizada' && !item.hasReview
      ).length,
    };
  }, [appointments]);

  const formatDate = (date: string) =>
    new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date(`${date}T12:00:00`));

  const canCancel = (appointment: Appointment) => {
    if (appointment.status !== 'agendada') return false;
    const appointmentDate = new Date(`${appointment.date}T${appointment.time}:00`);
    return appointmentDate.getTime() - Date.now() > 24 * 60 * 60 * 1000;
  };

  const canReview = (appointment: Appointment) =>
    appointment.status === 'realizada' && !appointment.hasReview;

  const handleCancelAppointment = (appointmentId: string) => {
    setAppointments((current) =>
      current.map((item) =>
        item.id === appointmentId ? { ...item, status: 'cancelada' } : item
      )
    );
    Alert.alert('Consulta cancelada', 'A consulta foi atualizada como cancelada.');
  };

  const handleReviewAppointment = (appointmentId: string) => {
    setAppointments((current) =>
      current.map((item) =>
        item.id === appointmentId ? { ...item, hasReview: true } : item
      )
    );
    Alert.alert('Avaliacao registrada', 'Obrigado por avaliar sua consulta.');
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
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>Acompanhe consultas passadas e futuras</Text>
            <Text style={styles.heroSubtitle}>
              Veja data, horario, profissional, status e acoes disponiveis para cada atendimento.
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

          {sortedAppointments.map((appointment) => {
            const status = getStatusMeta(appointment.status);
            const initials = appointment.psychologist
              .split(' ')
              .filter((part) => part.length > 2)
              .slice(0, 2)
              .map((part) => part[0])
              .join('');

            return (
              <View key={appointment.id} style={styles.appointmentCard}>
                <View style={[styles.statusStripe, { backgroundColor: status.color }]} />

                <View style={styles.appointmentBody}>
                  <View style={styles.topRow}>
                    <View style={styles.dateBox}>
                      <Text style={styles.dateDay}>
                        {new Intl.DateTimeFormat('pt-BR', { day: '2-digit' }).format(
                          new Date(`${appointment.date}T12:00:00`)
                        )}
                      </Text>
                      <Text style={styles.dateMonth}>
                        {new Intl.DateTimeFormat('pt-BR', { month: 'short' })
                          .format(new Date(`${appointment.date}T12:00:00`))
                          .replace('.', '')}
                      </Text>
                    </View>

                    <View style={styles.infoBox}>
                      <View style={styles.infoRow}>
                        <Ionicons name="time-outline" size={15} color={GREEN} />
                        <Text style={styles.infoText}>
                          {formatDate(appointment.date)} as {appointment.time}
                        </Text>
                      </View>

                      <View style={styles.professionalRow}>
                        <View style={styles.avatar}>
                          <Text style={styles.avatarText}>{initials}</Text>
                        </View>
                        <View style={styles.professionalTextBox}>
                          <Text style={styles.professionalName}>{appointment.psychologist}</Text>
                          <Text style={styles.professionalRole}>{appointment.specialty}</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View style={styles.bottomRow}>
                    <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                      <Ionicons name={status.icon as any} size={14} color={status.color} />
                      <Text style={[styles.statusText, { color: status.color }]}>
                        {status.label}
                      </Text>
                    </View>

                    <View style={styles.actionsRow}>
                      {canReview(appointment) && (
                        <TouchableOpacity
                          style={styles.secondaryAction}
                          activeOpacity={0.85}
                          onPress={() => handleReviewAppointment(appointment.id)}
                        >
                          <Ionicons name="star-outline" size={14} color={GREEN} />
                          <Text style={styles.secondaryActionText}>Avaliar</Text>
                        </TouchableOpacity>
                      )}

                      {canCancel(appointment) && (
                        <TouchableOpacity
                          style={styles.primaryAction}
                          activeOpacity={0.85}
                          onPress={() => handleCancelAppointment(appointment.id)}
                        >
                          <Ionicons name="close-outline" size={14} color="#fff" />
                          <Text style={styles.primaryActionText}>Cancelar</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
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
  headerSpacer: {
    width: 42,
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
    borderRadius: 26,
    padding: 22,
    marginTop: -18,
    marginBottom: 24,
    shadowColor: '#0f5132',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#163c31',
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: '#5a756a',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: GREEN_LIGHT,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    color: GREEN,
  },
  summaryLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#56796d',
    textAlign: 'center',
  },
  sectionHeading: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#163c31',
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#68857a',
    lineHeight: 19,
  },
  appointmentCard: {
    backgroundColor: WHITE,
    borderRadius: 24,
    marginBottom: 16,
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dateBox: {
    width: 62,
    borderRadius: 18,
    backgroundColor: '#f3fbf7',
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    marginRight: 14,
  },
  dateDay: {
    fontSize: 24,
    fontWeight: '800',
    color: GREEN,
    lineHeight: 26,
  },
  dateMonth: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
    color: '#5d7c71',
    textTransform: 'lowercase',
  },
  infoBox: {
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 12,
  },
  infoText: {
    marginLeft: 8,
    flex: 1,
    fontSize: 14,
    color: '#456459',
    lineHeight: 20,
  },
  professionalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: GREEN_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: GREEN,
  },
  professionalTextBox: {
    flex: 1,
  },
  professionalName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#183d32',
  },
  professionalRole: {
    marginTop: 2,
    fontSize: 13,
    color: '#698378',
  },
  bottomRow: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#edf4f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
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
    fontSize: 13,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#df5d5d',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  primaryActionText: {
    marginLeft: 6,
    color: WHITE,
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GREEN_LIGHT,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  secondaryActionText: {
    marginLeft: 6,
    color: GREEN,
    fontSize: 13,
    fontWeight: '700',
  },
});
