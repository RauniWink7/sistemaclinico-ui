import React, { useRef, useState } from 'react';
import {
  Alert,
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
import { router, useLocalSearchParams } from 'expo-router';

interface PatientDocument {
  id: string;
  title: string;
  type: string;
  date: string;
}

interface AppointmentHistory {
  id: string;
  date: string;
  time: string;
  status: string;
}

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
  documents: PatientDocument[];
  appointments: AppointmentHistory[];
}

const GREEN = '#2e8b6e';
const GREEN_DARK = '#1f684f';
const GREEN_LIGHT = '#e8f7f1';
const BLUE_LIGHT = '#eaf1ff';
const ORANGE_LIGHT = '#fef3e8';
const BG = '#f0faf5';
const WHITE = '#ffffff';

const FALLBACK_PATIENT: PatientRecord = {
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
    { id: 'd3', title: 'Anexo de acompanhamento', type: 'Imagem', date: '01/04/2026' },
  ],
  appointments: [
    { id: 'a1', date: '05/04/2026', time: '14:30', status: 'Realizada' },
    { id: 'a2', date: '29/03/2026', time: '14:30', status: 'Realizada' },
    { id: 'a3', date: '22/03/2026', time: '14:30', status: 'Cancelada' },
  ],
};

const DecorativeBackground = () => (
  <>
    <View style={styles.circle1} />
    <View style={styles.circle2} />
  </>
);

const ReadOnlyRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

export default function PsychologistPatientRecordScreen() {
  const params = useLocalSearchParams<{ patient?: string }>();
  const parsedPatient = params.patient ? JSON.parse(params.patient) : FALLBACK_PATIENT;

  const [patient] = useState<PatientRecord>(parsedPatient);
  const [medicalHistory, setMedicalHistory] = useState(patient.medicalHistory);
  const [anamnesis, setAnamnesis] = useState(patient.anamnesis);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleSave = () => {
    // TODO: PATCH /api/patients/<id>/record/
    Alert.alert('Ficha atualizada', 'As informacoes clinicas foram salvas com sucesso.');
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
          <Text style={styles.headerTitle}>Ficha do paciente</Text>
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
            <View style={styles.heroTopRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {patient.name
                    .split(' ')
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join('')}
                </Text>
              </View>

              <View style={styles.heroTextBox}>
                <Text style={styles.heroTitle}>{patient.name}</Text>
                <Text style={styles.heroSubtitle}>{patient.focus}</Text>
              </View>
            </View>

            <View style={styles.heroBadge}>
              <Ionicons name="calendar-outline" size={14} color={GREEN} />
              <Text style={styles.heroBadgeText}>Ultima consulta: {patient.lastAppointment}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Dados pessoais</Text>
            <ReadOnlyRow label="Nome" value={patient.name} />
            <ReadOnlyRow label="E-mail" value={patient.email} />
            <ReadOnlyRow label="Telefone" value={patient.phone} />
            <ReadOnlyRow label="CPF" value={patient.cpf} />
            <ReadOnlyRow label="Data de nascimento" value={patient.birthDate} />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Historico medico</Text>
            <Text style={styles.sectionHint}>Campo editavel pelo psicologo.</Text>
            <TextInput
              style={styles.textArea}
              value={medicalHistory}
              onChangeText={setMedicalHistory}
              multiline
              placeholder="Descreva o historico medico"
              placeholderTextColor="#8ba99d"
              textAlignVertical="top"
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Anamnese</Text>
            <Text style={styles.sectionHint}>Campo editavel pelo psicologo.</Text>
            <TextInput
              style={styles.textArea}
              value={anamnesis}
              onChangeText={setAnamnesis}
              multiline
              placeholder="Registre a anamnese do paciente"
              placeholderTextColor="#8ba99d"
              textAlignVertical="top"
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Documentos do paciente</Text>
            {patient.documents.map((document) => (
              <View key={document.id} style={styles.documentRow}>
                <View style={styles.documentIconBox}>
                  <Ionicons name="document-text-outline" size={18} color="#2d6cdf" />
                </View>
                <View style={styles.documentTextBox}>
                  <Text style={styles.documentTitle}>{document.title}</Text>
                  <Text style={styles.documentMeta}>
                    {document.type} • {document.date}
                  </Text>
                </View>
                <Ionicons name="chevron-forward-outline" size={18} color="#789286" />
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Historico de consultas</Text>
            {patient.appointments.map((appointment) => (
              <View key={appointment.id} style={styles.appointmentRow}>
                <View style={styles.appointmentDateBox}>
                  <Text style={styles.appointmentDate}>{appointment.date}</Text>
                  <Text style={styles.appointmentTime}>{appointment.time}</Text>
                </View>
                <View
                  style={[
                    styles.appointmentStatusBadge,
                    appointment.status === 'Cancelada'
                      ? styles.appointmentStatusCanceled
                      : appointment.status === 'Realizada'
                        ? styles.appointmentStatusDone
                        : styles.appointmentStatusDefault,
                  ]}
                >
                  <Text
                    style={[
                      styles.appointmentStatusText,
                      appointment.status === 'Cancelada'
                        ? styles.appointmentStatusTextCanceled
                        : appointment.status === 'Realizada'
                          ? styles.appointmentStatusTextDone
                          : styles.appointmentStatusTextDefault,
                    ]}
                  >
                    {appointment.status}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.85}>
            <Ionicons name="save-outline" size={18} color="#fff" />
            <Text style={styles.saveButtonText}>Salvar ficha clinica</Text>
          </TouchableOpacity>
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
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: BLUE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2d6cdf',
  },
  heroTextBox: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#163c31',
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#5d7c71',
    lineHeight: 20,
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
  card: {
    backgroundColor: WHITE,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
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
    marginBottom: 14,
  },
  sectionHint: {
    marginTop: -6,
    marginBottom: 12,
    fontSize: 13,
    color: '#6a887d',
  },
  infoRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#edf4f0',
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#789286',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  infoValue: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 21,
    color: '#1f4036',
    fontWeight: '600',
  },
  textArea: {
    minHeight: 140,
    borderRadius: 18,
    backgroundColor: '#f4faf7',
    borderWidth: 1,
    borderColor: '#e3efe8',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: '#1f4036',
  },
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#edf4f0',
  },
  documentIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: BLUE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  documentTextBox: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#173d31',
  },
  documentMeta: {
    marginTop: 4,
    fontSize: 13,
    color: '#6d887d',
  },
  appointmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#edf4f0',
    gap: 10,
  },
  appointmentDateBox: {
    flex: 1,
  },
  appointmentDate: {
    fontSize: 15,
    fontWeight: '700',
    color: '#173d31',
  },
  appointmentTime: {
    marginTop: 4,
    fontSize: 13,
    color: '#6d887d',
  },
  appointmentStatusBadge: {
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  appointmentStatusDefault: {
    backgroundColor: ORANGE_LIGHT,
  },
  appointmentStatusDone: {
    backgroundColor: GREEN_LIGHT,
  },
  appointmentStatusCanceled: {
    backgroundColor: '#fdeeee',
  },
  appointmentStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  appointmentStatusTextDefault: {
    color: '#c46a1a',
  },
  appointmentStatusTextDone: {
    color: GREEN,
  },
  appointmentStatusTextCanceled: {
    color: '#d95c5c',
  },
  saveButton: {
    height: 54,
    borderRadius: 18,
    backgroundColor: GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  saveButtonText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: '700',
  },
});
