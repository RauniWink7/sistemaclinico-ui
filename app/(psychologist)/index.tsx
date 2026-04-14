import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const GREEN = '#2e8b6e';
const GREEN_DARK = '#1f684f';
const GREEN_LIGHT = '#e8f7f1';
const BG = '#f0faf5';
const WHITE = '#ffffff';

const PSYCHOLOGIST_SECTIONS = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'Tela inicial com resumo de consultas, pacientes e atalhos rapidos.',
    icon: 'speedometer-outline',
    color: GREEN,
    bg: GREEN_LIGHT,
    action: () => router.push('/(psychologist)/dashboardP'),
  },
  {
    id: 'agenda',
    title: 'Agenda',
    description: 'Espaco para consultas, horarios e disponibilidade do profissional.',
    icon: 'calendar-outline',
    color: '#2d6cdf',
    bg: '#eaf1ff',
    action: () => router.push('/(psychologist)/agenda'),
  },
  {
    id: 'patients',
    title: 'Pacientes',
    description: 'Base para acompanhar prontuarios, atendimentos e historico clinico.',
    icon: 'people-outline',
    color: GREEN,
    bg: GREEN_LIGHT,
    action: () => router.push('/(psychologist)/lista'),
  },
  {
    id: 'profile',
    title: 'Perfil profissional',
    description: 'Area para dados do psicologo, especialidades e configuracoes.',
    icon: 'person-outline',
    color: '#c46a1a',
    bg: '#fef3e8',
    action: () => router.push('/(psychologist)/dashboardP'),
  },
];

const DecorativeBackground = () => (
  <>
    <View style={styles.circle1} />
    <View style={styles.circle2} />
  </>
);

export default function PsychologistHomeScreen() {
  return (
    <View style={styles.screen}>
      <DecorativeBackground />

      <View style={styles.header}>
        <View style={styles.headerBadge}>
          <Ionicons name="medkit-outline" size={18} color="#fff" />
        </View>

        <Text style={styles.eyebrow}>Area do psicologo</Text>
        <Text style={styles.title}>Central profissional</Text>
        <Text style={styles.description}>
          Essa pasta esta pronta para receber as telas do psicologo sem misturar com paciente ou
          administracao.
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Primeira tela pronta</Text>
          <Text style={styles.heroText}>
            O dashboard do psicologo ja esta criado e pode servir como ponto de partida para o
            restante do fluxo profissional.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/(psychologist)/dashboardP')}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-forward-outline" size={18} color="#fff" />
            <Text style={styles.primaryButtonText}>Abrir dashboard</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Modulos sugeridos</Text>

        {PSYCHOLOGIST_SECTIONS.map((section) => (
          <TouchableOpacity
            key={section.id}
            style={styles.sectionCard}
            onPress={section.action}
            activeOpacity={0.85}
          >
            <View style={[styles.sectionIconBox, { backgroundColor: section.bg }]}>
              <Ionicons name={section.icon as any} size={22} color={section.color} />
            </View>

            <View style={styles.sectionTextBox}>
              <Text style={styles.sectionCardTitle}>{section.title}</Text>
              <Text style={styles.sectionCardDescription}>{section.description}</Text>
            </View>

            <Ionicons name="chevron-forward-outline" size={20} color="#6c8c80" />
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.replace('/login')}
          activeOpacity={0.85}
        >
          <Ionicons name="log-out-outline" size={18} color={GREEN} />
          <Text style={styles.secondaryButtonText}>Voltar para login</Text>
        </TouchableOpacity>
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
    paddingTop: 64,
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: GREEN,
  },
  headerBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  eyebrow: {
    color: '#bce3d5',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    marginTop: 8,
    color: WHITE,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  description: {
    marginTop: 10,
    color: '#d2ece2',
    fontSize: 14,
    lineHeight: 21,
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
    shadowColor: '#174c3e',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#173d31',
  },
  heroText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: '#5d7a6e',
  },
  primaryButton: {
    marginTop: 18,
    height: 52,
    borderRadius: 16,
    backgroundColor: GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#173d31',
    marginBottom: 14,
  },
  sectionCard: {
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
  sectionIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  sectionTextBox: {
    flex: 1,
  },
  sectionCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#193f33',
  },
  sectionCardDescription: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
    color: '#69857a',
  },
  secondaryButton: {
    marginTop: 12,
    height: 50,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#cfe7dc',
    backgroundColor: '#f9fdfb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    color: GREEN,
    fontSize: 15,
    fontWeight: '700',
  },
});
