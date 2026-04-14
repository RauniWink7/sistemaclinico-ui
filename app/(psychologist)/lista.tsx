import React, { useMemo, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface PatientRecord {
  id: string;
  name: string;
  phone: string;
  email: string;
  cpf: string;
  birthDate: string;
  age: number;
  lastAppointment: string;
  notes: string;
  focus: string;
  medicalHistory: string;
  anamnesis: string;
  documents: { id: string; title: string; type: string; date: string }[];
  appointments: { id: string; date: string; time: string; status: string }[];
}

const GREEN = '#2e8b6e';
const GREEN_DARK = '#1f684f';
const GREEN_LIGHT = '#e8f7f1';
const BLUE_LIGHT = '#eaf1ff';
const BG = '#f0faf5';
const WHITE = '#ffffff';

const MOCK_PATIENTS: PatientRecord[] = [
  {
    id: '1',
    name: 'Ana Beatriz Santos',
    phone: '(11) 98765-4321',
    email: 'ana.beatriz@email.com',
    cpf: '123.456.789-00',
    birthDate: '12/05/1996',
    age: 29,
    lastAppointment: '05/04/2026',
    notes: 'Paciente aderente ao acompanhamento e com boa resposta aos exercicios de respiracao.',
    focus: 'Ansiedade e rotina de autocuidado',
    medicalHistory:
      'Relata historico de crises de ansiedade em periodos de alta demanda. Sem comorbidades fisicas relevantes no momento.',
    anamnesis:
      'Queixa principal ligada a ansiedade antecipatoria, sobrecarga na rotina e dificuldade para manter pausas de descanso.',
    documents: [
      { id: 'd1', title: 'Termo de consentimento', type: 'PDF', date: '10/02/2026' },
      { id: 'd2', title: 'Encaminhamento medico', type: 'PDF', date: '18/03/2026' },
    ],
    appointments: [
      { id: 'a1', date: '05/04/2026', time: '14:30', status: 'Realizada' },
      { id: 'a2', date: '29/03/2026', time: '14:30', status: 'Realizada' },
    ],
  },
  {
    id: '2',
    name: 'Carlos Henrique Lima',
    phone: '(11) 97654-0098',
    email: 'carlos.lima@email.com',
    cpf: '234.567.890-11',
    birthDate: '20/07/1984',
    age: 41,
    lastAppointment: '02/04/2026',
    notes: 'Em acompanhamento quinzenal. Relata melhora gradual na comunicacao familiar.',
    focus: 'Relacionamentos familiares',
    medicalHistory: 'Sem historico medicamentoso atual. Relata episodios previos de insonia.',
    anamnesis:
      'Busca suporte para conflitos familiares recorrentes e melhora de estrategias de comunicacao.',
    documents: [
      { id: 'd3', title: 'Ficha de triagem', type: 'PDF', date: '03/01/2026' },
    ],
    appointments: [
      { id: 'a3', date: '02/04/2026', time: '10:00', status: 'Realizada' },
      { id: 'a4', date: '19/03/2026', time: '10:00', status: 'Realizada' },
    ],
  },
  {
    id: '3',
    name: 'Fernanda Costa',
    phone: '(11) 99882-7733',
    email: 'fernanda.costa@email.com',
    cpf: '345.678.901-22',
    birthDate: '09/10/1991',
    age: 34,
    lastAppointment: '31/03/2026',
    notes: 'Mantem boa frequencia. Necessita reforco no plano de enfrentamento para crises.',
    focus: 'Regulacao emocional',
    medicalHistory: 'Historico de crises de panico esporadicas. Sem restricoes fisicas relevantes.',
    anamnesis: 'Demanda principal voltada ao manejo de crises e organizacao emocional.',
    documents: [
      { id: 'd4', title: 'Relatorio medico', type: 'PDF', date: '22/02/2026' },
    ],
    appointments: [
      { id: 'a5', date: '31/03/2026', time: '15:30', status: 'Realizada' },
    ],
  },
  {
    id: '4',
    name: 'Juliana Alves',
    phone: '(11) 99544-1100',
    email: 'juliana.alves@email.com',
    cpf: '456.789.012-33',
    birthDate: '01/03/1998',
    age: 27,
    lastAppointment: '28/03/2026',
    notes: 'Paciente em processo de adaptacao a nova rotina profissional.',
    focus: 'Estresse ocupacional',
    medicalHistory: 'Sem historico clinico relevante informado ate o momento.',
    anamnesis: 'Paciente relata estresse persistente e dificuldade de desconexao do trabalho.',
    documents: [
      { id: 'd5', title: 'Questionario inicial', type: 'PDF', date: '14/02/2026' },
    ],
    appointments: [
      { id: 'a6', date: '28/03/2026', time: '09:00', status: 'Realizada' },
    ],
  },
  {
    id: '5',
    name: 'Matheus Lima',
    phone: '(11) 99123-2234',
    email: 'matheus.lima@email.com',
    cpf: '567.890.123-44',
    birthDate: '17/11/2003',
    age: 22,
    lastAppointment: '25/03/2026',
    notes: 'Consulta recente com foco em organizacao academica e autoestima.',
    focus: 'Autoestima e desempenho academico',
    medicalHistory: 'Sem intercorrencias medicas relatadas.',
    anamnesis:
      'Demanda ligada a autocobranca, desempenho academico e comparacao social frequente.',
    documents: [
      { id: 'd6', title: 'Autorizacao de atendimento', type: 'PDF', date: '28/01/2026' },
    ],
    appointments: [
      { id: 'a7', date: '25/03/2026', time: '17:00', status: 'Realizada' },
    ],
  },
];

const DecorativeBackground = () => (
  <>
    <View style={styles.circle1} />
    <View style={styles.circle2} />
  </>
);

export default function PsychologistPatientListScreen() {
  const [query, setQuery] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const filteredPatients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return MOCK_PATIENTS.filter((patient) => {
      if (!normalizedQuery) return true;

      return (
        patient.name.toLowerCase().includes(normalizedQuery) ||
        patient.phone.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [query]);

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
          <Text style={styles.headerTitle}>Lista de pacientes</Text>
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
            <Text style={styles.heroTitle}>Pacientes vinculados ao seu acompanhamento</Text>
            <Text style={styles.heroSubtitle}>
              Consulte rapidamente nome, telefone e data da ultima consulta. Toque em um paciente
              para abrir a ficha completa.
            </Text>

            <View style={styles.heroBadge}>
              <Ionicons name="people-outline" size={14} color={GREEN} />
              <Text style={styles.heroBadgeText}>{MOCK_PATIENTS.length} pacientes ativos</Text>
            </View>
          </View>

          <View style={styles.searchCard}>
            <Text style={styles.sectionTitle}>Buscar paciente</Text>
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={18} color="#6c8c80" />
              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder="Digite o nome do paciente"
                placeholderTextColor="#8ba99d"
              />
            </View>
          </View>

          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>Pacientes encontrados</Text>
            <Text style={styles.resultCount}>{filteredPatients.length}</Text>
          </View>

          {filteredPatients.map((patient) => {
            const initials = patient.name
              .split(' ')
              .slice(0, 2)
              .map((part) => part[0])
              .join('');

            return (
              <TouchableOpacity
                key={patient.id}
                style={styles.patientCard}
                activeOpacity={0.85}
                onPress={() =>
                  router.push({
                    pathname: '/(psychologist)/ficha',
                    params: { patient: JSON.stringify(patient) },
                  })
                }
              >
                <View style={styles.patientHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials}</Text>
                  </View>

                  <View style={styles.patientTextBox}>
                    <Text style={styles.patientName}>{patient.name}</Text>
                    <Text style={styles.patientMeta}>{patient.phone}</Text>
                  </View>

                  <Ionicons name="chevron-forward-outline" size={20} color="#6c8c80" />
                </View>

                <View style={styles.lastAppointmentBox}>
                  <Ionicons name="calendar-outline" size={15} color={GREEN} />
                  <Text style={styles.lastAppointmentText}>
                    Ultima consulta: {patient.lastAppointment}
                  </Text>
                </View>
              </TouchableOpacity>
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
    borderRadius: 26,
    padding: 22,
    marginTop: -18,
    marginBottom: 22,
    shadowColor: '#174c3e',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#163c31',
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: '#5d7c71',
  },
  heroBadge: {
    alignSelf: 'flex-start',
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GREEN_LIGHT,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  heroBadgeText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '700',
    color: GREEN,
  },
  searchCard: {
    backgroundColor: WHITE,
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#174c3e',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#163c31',
  },
  searchBox: {
    marginTop: 14,
    borderRadius: 18,
    backgroundColor: '#f4faf7',
    borderWidth: 1,
    borderColor: '#e3efe8',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#1f4036',
  },
  listHeader: {
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultCount: {
    fontSize: 16,
    fontWeight: '800',
    color: GREEN,
  },
  patientCard: {
    backgroundColor: WHITE,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#174c3e',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  patientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: BLUE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#2d6cdf',
  },
  patientTextBox: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#183d32',
  },
  patientMeta: {
    marginTop: 4,
    fontSize: 13,
    color: '#6a877c',
  },
  lastAppointmentBox: {
    marginTop: 16,
    borderRadius: 16,
    backgroundColor: '#f7fbf9',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastAppointmentText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#36594d',
  },
});
