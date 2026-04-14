import React, { useMemo, useRef } from 'react';
import {
  Animated,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface ProfessionalInfo {
  name: string;
  crp: string;
  todayAppointments: number;
  nextAppointmentTime: string;
  nextPatientName: string;
  totalPatients: number;
}

const GREEN = '#2e8b6e';
const GREEN_DARK = '#1f684f';
const GREEN_LIGHT = '#e8f7f1';
const BLUE_LIGHT = '#eaf1ff';
const ORANGE_LIGHT = '#fef3e8';
const BG = '#f0faf5';
const WHITE = '#ffffff';

const MOCK_PROFESSIONAL: ProfessionalInfo = {
  name: 'Dra. Camila Rocha',
  crp: 'CRP 06/12345',
  todayAppointments: 6,
  nextAppointmentTime: '14:30',
  nextPatientName: 'Ana Beatriz',
  totalPatients: 48,
};

const QUICK_ACTIONS = [
  {
    id: 'agenda',
    title: 'Agenda',
    description: 'Consulte horarios e atendimentos do dia.',
    icon: 'calendar-outline',
    color: '#2d6cdf',
    bg: BLUE_LIGHT,
    route: '/(psychologist)/agenda',
  },
  {
    id: 'patients',
    title: 'Pacientes',
    description: 'Acesse o acompanhamento clinico dos pacientes.',
    icon: 'people-outline',
    color: GREEN,
    bg: GREEN_LIGHT,
    route: '/(psychologist)/lista',
  },
  {
    id: 'chat',
    title: 'Chat',
    description: 'Converse com pacientes e acompanhe mensagens.',
    icon: 'chatbubble-ellipses-outline',
    color: '#c46a1a',
    bg: ORANGE_LIGHT,
    route: '/(psychologist)/chat',
  },
];

const DecorativeBackground = () => (
  <>
    <View style={styles.circle1} />
    <View style={styles.circle2} />
  </>
);

export default function PsychologistDashboardScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
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
          <Text style={styles.headerEyebrow}>Area do psicologo</Text>
          <Text style={styles.headerTitle}>Dashboard profissional</Text>
        </View>

        <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/(psychologist)')}>
          <Ionicons name="grid-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>{greeting}</Text>
            <Text style={styles.heroTitle}>{MOCK_PROFESSIONAL.name}</Text>
            <Text style={styles.heroSubtitle}>{MOCK_PROFESSIONAL.crp}</Text>

            <View style={styles.heroBadge}>
              <Ionicons name="sparkles-outline" size={14} color={GREEN} />
              <Text style={styles.heroBadgeText}>Painel inicial do profissional</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Resumo do dia</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <View style={[styles.metricIconBox, { backgroundColor: GREEN_LIGHT }]}>
                <Ionicons name="calendar-outline" size={20} color={GREEN} />
              </View>
              <Text style={styles.metricValue}>{MOCK_PROFESSIONAL.todayAppointments}</Text>
              <Text style={styles.metricLabel}>Consultas de hoje</Text>
            </View>

            <View style={styles.metricCard}>
              <View style={[styles.metricIconBox, { backgroundColor: BLUE_LIGHT }]}>
                <Ionicons name="time-outline" size={20} color="#2d6cdf" />
              </View>
              <Text style={styles.metricValue}>{MOCK_PROFESSIONAL.nextAppointmentTime}</Text>
              <Text style={styles.metricLabel}>Proxima consulta</Text>
            </View>

            <View style={styles.metricCardWide}>
              <View style={[styles.metricIconBox, { backgroundColor: ORANGE_LIGHT }]}>
                <Ionicons name="people-outline" size={20} color="#c46a1a" />
              </View>
              <View style={styles.metricTextBox}>
                <Text style={styles.metricValue}>{MOCK_PROFESSIONAL.totalPatients}</Text>
                <Text style={styles.metricLabel}>Pacientes atendidos</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Proxima consulta</Text>
          <View style={styles.nextCard}>
            <View style={styles.nextTopRow}>
              <View style={styles.nextIconBox}>
                <Ionicons name="person-outline" size={18} color={GREEN} />
              </View>
              <View style={styles.nextTextBox}>
                <Text style={styles.nextLabel}>Paciente</Text>
                <Text style={styles.nextName}>{MOCK_PROFESSIONAL.nextPatientName}</Text>
              </View>
            </View>

            <View style={styles.nextDivider} />

            <View style={styles.nextBottomRow}>
              <View style={styles.nextTimeBadge}>
                <Ionicons name="time-outline" size={16} color={GREEN} />
                <Text style={styles.nextTimeText}>{MOCK_PROFESSIONAL.nextAppointmentTime}</Text>
              </View>
              <Text style={styles.nextHint}>Prepare-se para o proximo atendimento.</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Atalhos</Text>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.actionCard}
              activeOpacity={0.85}
              onPress={() =>
                router.push(
                  action.route as
                    | '/(psychologist)/agenda'
                    | '/(psychologist)/lista'
                    | '/(psychologist)/dashboardP'
                    | '/(psychologist)/chat'
                )
              }
            >
              <View style={[styles.actionIconBox, { backgroundColor: action.bg }]}>
                <Ionicons name={action.icon as any} size={22} color={action.color} />
              </View>

              <View style={styles.actionTextBox}>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionDescription}>{action.description}</Text>
              </View>

              <Ionicons name="chevron-forward-outline" size={20} color="#6c8c80" />
            </TouchableOpacity>
          ))}
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
    marginBottom: 24,
    shadowColor: '#174c3e',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: GREEN,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroTitle: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: '800',
    color: '#173d31',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#5e7b70',
    fontWeight: '700',
  },
  heroBadge: {
    marginTop: 16,
    alignSelf: 'flex-start',
    backgroundColor: GREEN_LIGHT,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: GREEN,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#173d31',
    marginBottom: 14,
  },
  metricsGrid: {
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    backgroundColor: WHITE,
    borderRadius: 24,
    padding: 18,
    shadowColor: '#174c3e',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  metricCardWide: {
    backgroundColor: WHITE,
    borderRadius: 24,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#174c3e',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  metricIconBox: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricTextBox: {
    marginLeft: 14,
  },
  metricValue: {
    marginTop: 16,
    fontSize: 28,
    fontWeight: '800',
    color: '#173d31',
  },
  metricLabel: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: '#668277',
    fontWeight: '600',
  },
  nextCard: {
    backgroundColor: WHITE,
    borderRadius: 26,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#174c3e',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  nextTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: GREEN_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  nextTextBox: {
    flex: 1,
  },
  nextLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#719084',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nextName: {
    marginTop: 4,
    fontSize: 17,
    fontWeight: '800',
    color: '#173d31',
  },
  nextDivider: {
    height: 1,
    backgroundColor: '#edf4f0',
    marginVertical: 16,
  },
  nextBottomRow: {
    gap: 12,
  },
  nextTimeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: GREEN_LIGHT,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nextTimeText: {
    color: GREEN,
    fontSize: 14,
    fontWeight: '800',
  },
  nextHint: {
    fontSize: 14,
    lineHeight: 20,
    color: '#647f74',
  },
  actionCard: {
    backgroundColor: WHITE,
    borderRadius: 22,
    padding: 18,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#174c3e',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  actionIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  actionTextBox: {
    flex: 1,
    marginRight: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#193f33',
  },
  actionDescription: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
    color: '#69857a',
  },
});
