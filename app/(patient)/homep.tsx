import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  StatusBar,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

// ─── Mock Data ────────────────────────────────────────────────────────────────
const PATIENT = {
  name: 'Ana Beatriz',
  nextAppointment: {
    date: 'Quinta-feira, 27 de março',
    time: '14:30',
    professional: 'Dra. Camila Rocha',
    specialty: 'Psicóloga Clínica',
    avatar: 'CR',
  },
};

// ─── Shortcut Cards Data ──────────────────────────────────────────────────────
const SHORTCUTS = [
  { id: '1', label: 'Agendar\nConsulta', icon: 'calendar-outline', color: '#2e8b6e', bg: '#e8f7f1', route: 'Schedule' },
  { id: '2', label: 'Minhas\nConsultas', icon: 'time-outline', color: '#3a7bd5', bg: '#e8f0fc', route: 'MyAppointments' },
  { id: '3', label: 'Chat', icon: 'chatbubble-ellipses-outline', color: '#8b5cf6', bg: '#f0ebff', route: 'Chat' },
  { id: '4', label: 'Documentos', icon: 'document-text-outline', color: '#e67e22', bg: '#fef3e8', route: 'Documents' },
  { id: '5', label: 'Perfil', icon: 'person-outline', color: '#e05c7a', bg: '#fdeef2', route: 'Profile' },
];

// ─── Decorative Background ───────────────────────────────────────────────────
const DecorativeBackground = () => (
  <>
    <View style={styles.circle1} />
    <View style={styles.circle2} />
  </>
);

// ─── Shortcut Card ────────────────────────────────────────────────────────────
interface ShortcutCardProps {
  label: string;
  icon: string;
  color: string;
  bg: string;
  onPress: () => void;
}

const ShortcutCard = ({ label, icon, color, bg, onPress }: ShortcutCardProps) => (
  <TouchableOpacity style={styles.shortcutCard} onPress={onPress} activeOpacity={0.8}>
    <View style={[styles.shortcutIconBox, { backgroundColor: bg }]}>
      <Ionicons name={icon as any} size={26} color={color} />
    </View>
    <Text style={styles.shortcutLabel}>{label}</Text>
  </TouchableOpacity>
);

// ─── Props ────────────────────────────────────────────────────────────────────
// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function HomeP() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN} />
      <DecorativeBackground />

      {/* ── Header ── */}
      <View style={styles.header}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.patientName}>{PATIENT.name} 👋</Text>
        </Animated.View>

        <TouchableOpacity
          style={styles.notifBtn}
          onPress={() => Alert.alert('Avisos', 'Central de notificacoes em breve.')}
        >
          <Ionicons name="notifications-outline" size={22} color="#fff" />
          <View style={styles.notifDot} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Próxima Consulta ── */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Text style={styles.sectionTitle}>Próxima consulta</Text>

          <View style={styles.appointmentCard}>
            {/* Faixa lateral */}
            <View style={styles.appointmentAccent} />

            <View style={styles.appointmentContent}>
              {/* Data e hora */}
              <View style={styles.appointmentDateRow}>
                <Ionicons name="calendar-outline" size={15} color={GREEN} />
                <Text style={styles.appointmentDate}>{PATIENT.nextAppointment.date}</Text>
              </View>
              <View style={styles.appointmentTimeRow}>
                <Ionicons name="time-outline" size={15} color={GREEN} />
                <Text style={styles.appointmentTime}>{PATIENT.nextAppointment.time}</Text>
              </View>

              <View style={styles.divider} />

              {/* Profissional */}
              <View style={styles.professionalRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{PATIENT.nextAppointment.avatar}</Text>
                </View>
                <View>
                  <Text style={styles.professionalName}>{PATIENT.nextAppointment.professional}</Text>
                  <Text style={styles.professionalSpecialty}>{PATIENT.nextAppointment.specialty}</Text>
                </View>
              </View>

              {/* Botão */}
              <TouchableOpacity style={styles.detailsBtn} activeOpacity={0.8}>
                <Text style={styles.detailsBtnText}>Ver detalhes</Text>
                <Ionicons name="arrow-forward-outline" size={14} color={GREEN} />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* ── Atalhos ── */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Text style={styles.sectionTitle}>O que você precisa?</Text>

          <View style={styles.shortcutsGrid}>
            {SHORTCUTS.map((item) => (
              <ShortcutCard
                key={item.id}
                label={item.label}
                icon={item.icon}
                color={item.color}
                bg={item.bg}
                onPress={() => {
                  const routes: Record<
                    string,
                    '/agendamento' | '/consultas' | '/chat' | '/documento' | '/perfil'
                  > = {
                    Schedule: '/agendamento',
                    MyAppointments: '/consultas',
                    Chat: '/chat',
                    Documents: '/documento',
                    Profile: '/perfil',
                  };

                  const targetRoute = routes[item.route];

                  if (targetRoute) {
                    router.push(targetRoute);
                    return;
                  }

                  Alert.alert('Tela indisponivel', 'Esse atalho ainda nao foi configurado.');
                }}
              />
            ))}
          </View>
        </Animated.View>

        {/* ── Banner motivacional ── */}
        <Animated.View style={[styles.bannerCard, { opacity: fadeAnim }]}>
          <View style={styles.bannerTextBox}>
            <Text style={styles.bannerTitle}>Cuide da sua saúde mental 🌿</Text>
            <Text style={styles.bannerSubtitle}>
              Manter a regularidade nas consultas faz toda a diferença.
            </Text>
          </View>
          <Ionicons name="heart-outline" size={40} color="#b2dfcf" />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const GREEN = '#2e8b6e';
const WHITE = '#ffffff';

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f0faf5',
  },

  // Decorative
  circle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#27795f',
    top: -100,
    right: -80,
    opacity: 0.5,
  },
  circle2: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#1e6b54',
    top: -60,
    left: -60,
    opacity: 0.3,
  },

  // Header
  header: {
    backgroundColor: GREEN,
    paddingTop: 56,
    paddingBottom: 28,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: 15,
    color: '#b2dfcf',
    fontWeight: '500',
  },
  patientName: {
    fontSize: 26,
    fontWeight: '800',
    color: WHITE,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  notifBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f87171',
    borderWidth: 1.5,
    borderColor: GREEN,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },

  // Section title
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a3d31',
    marginBottom: 14,
    marginTop: 4,
  },

  // Appointment card
  appointmentCard: {
    backgroundColor: WHITE,
    borderRadius: 20,
    flexDirection: 'row',
    marginBottom: 28,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
    overflow: 'hidden',
  },
  appointmentAccent: {
    width: 5,
    backgroundColor: GREEN,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  appointmentContent: {
    flex: 1,
    padding: 18,
  },
  appointmentDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  appointmentDate: {
    fontSize: 13,
    color: '#4a7a66',
    fontWeight: '600',
  },
  appointmentTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  appointmentTime: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a3d31',
    letterSpacing: -0.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#e8f4ef',
    marginVertical: 14,
  },
  professionalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#e8f7f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: GREEN,
  },
  professionalName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a3d31',
  },
  professionalSpecialty: {
    fontSize: 12,
    color: '#7aab96',
    marginTop: 1,
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#e8f7f1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  detailsBtnText: {
    fontSize: 12,
    color: GREEN,
    fontWeight: '700',
  },

  // Shortcuts grid
  shortcutsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },
  shortcutCard: {
    width: (width - 40 - 12 * 2) / 3,
    backgroundColor: WHITE,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    shadowColor: '#2e8b6e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  shortcutIconBox: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  shortcutLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2a5044',
    textAlign: 'center',
    lineHeight: 15,
  },

  // Banner
  bannerCard: {
    backgroundColor: GREEN,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 5,
  },
  bannerTextBox: {
    flex: 1,
    marginRight: 12,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: WHITE,
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#b2dfcf',
    lineHeight: 17,
  },
});
