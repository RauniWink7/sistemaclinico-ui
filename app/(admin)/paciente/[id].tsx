import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
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
  View,
} from 'react-native';
import { getPatientProfile, updateUser, PatientProfileApiItem } from '../../../services/api';

const GREEN = '#2e8b6e';
const GREEN_DARK = '#1f684f';
const GREEN_LIGHT = '#e8f7f1';
const BLUE_LIGHT = '#eaf1ff';
const BG = '#f0faf5';
const WHITE = '#ffffff';

// Usa PatientProfileApiItem da API:
// { id, user: { id, full_name, email, phone, is_active, created_at, ... }, birth_date, cpf, ... }
type PatientDetail = PatientProfileApiItem;

const DecorativeBackground = () => (
  <>
    <View style={styles.circle1} />
    <View style={styles.circle2} />
  </>
);

const InfoRow = ({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIconBox}>
      <Ionicons name={icon as any} size={16} color={GREEN} />
    </View>
    <View style={styles.infoTextBox}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  </View>
);

export default function PatientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Campos editáveis
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const result = await getPatientProfile(id);
        if (!result.ok || !result.data) {
          Alert.alert('Erro', result.error ?? 'Não foi possível carregar o paciente.');
          router.back();
          return;
        }
        setPatient(result.data);
        setEditName(result.data.user.full_name ?? '');
        setEditPhone(result.data.user.phone ?? '');
      } catch (err: any) {
        Alert.alert('Erro', err?.message ?? 'Ocorreu um erro inesperado.');
        router.back();
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id]);

  const handleSave = async () => {
    if (!patient) return;
    if (!editName.trim()) {
      Alert.alert('Campo obrigatório', 'O nome não pode ficar em branco.');
      return;
    }
    setSaving(true);
    try {
      // full_name e phone pertencem ao model User → PATCH /api/auth/me/ via updateUser
      const userResult = await updateUser(patient.user.id, {
        full_name: editName.trim(),
        phone: editPhone.trim() || undefined,
      });
      if (!userResult.ok) {
        Alert.alert('Erro', userResult.error ?? 'Não foi possível salvar as alterações.');
        return;
      }
      setPatient((prev) =>
        prev
          ? { ...prev, user: { ...prev.user, full_name: editName.trim(), phone: editPhone.trim() } }
          : prev
      );
      setEditing(false);
      Alert.alert('Sucesso', 'Dados do paciente atualizados.');
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Ocorreu um erro inesperado.');
    } finally {
      setSaving(false);
    }
  };

  const initials = patient
    ? patient.user.full_name.split(' ').slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('')
    : '';

  const formatDate = (iso?: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle="light-content" backgroundColor={GREEN} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back-outline" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTextBox}>
            <Text style={styles.headerEyebrow}>Paciente</Text>
            <Text style={styles.headerTitle}>Carregando...</Text>
          </View>
          <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/(admin)')}>
            <Ionicons name="grid-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GREEN} />
          <Text style={styles.loadingText}>Buscando dados do paciente...</Text>
        </View>
      </View>
    );
  }

  if (!patient) return null;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN} />
      <DecorativeBackground />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back-outline" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTextBox}>
          <Text style={styles.headerEyebrow}>Paciente</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>Cadastro</Text>
        </View>
        <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/(admin)')}>
          <Ionicons name="grid-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* ── Avatar + nome ── */}
          <View style={styles.profileCard}>
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={styles.profileName}>{patient.user.full_name}</Text>
            <Text style={styles.profileEmail}>{patient.user.email}</Text>

            <View style={[
              styles.statusBadge,
              { backgroundColor: patient.user.is_active ? GREEN_LIGHT : '#fdeeee' }
            ]}>
              <Ionicons
                name={patient.user.is_active ? 'checkmark-circle-outline' : 'pause-circle-outline'}
                size={14}
                color={patient.user.is_active ? GREEN : '#d95c5c'}
              />
              <Text style={[
                styles.statusText,
                { color: patient.user.is_active ? GREEN : '#d95c5c' }
              ]}>
                {patient.user.is_active ? 'Ativo' : 'Inativo'}
              </Text>
            </View>
          </View>

          {/* ── Dados cadastrais ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Dados cadastrais</Text>

            <InfoRow icon="mail-outline" label="E-mail" value={patient.user.email} />
            <View style={styles.divider} />
            <InfoRow icon="call-outline" label="Telefone" value={patient.user.phone ?? '—'} />
            <View style={styles.divider} />
            <InfoRow icon="card-outline" label="CPF" value={patient.cpf ?? '—'} />
            <View style={styles.divider} />
            <InfoRow
              icon="calendar-outline"
              label="Data de nascimento"
              value={formatDate(patient.birth_date ?? undefined)}
            />
            <View style={styles.divider} />
            <InfoRow
              icon="time-outline"
              label="Cadastrado em"
              value={formatDate(patient.user.created_at)}
            />
          </View>

          {/* ── Edição rápida ── */}
          {editing ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Editar dados basicos</Text>
              <Text style={styles.fieldLabel}>Nome completo</Text>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="Nome completo"
                placeholderTextColor="#94b3a6"
                editable={!saving}
              />
              <Text style={styles.fieldLabel}>Telefone</Text>
              <TextInput
                style={styles.input}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="Telefone"
                placeholderTextColor="#94b3a6"
                keyboardType="phone-pad"
                editable={!saving}
              />
              <View style={styles.editActionsRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setEditing(false);
                    setEditName(patient.user.full_name);
                    setEditPhone(patient.user.phone ?? '');
                  }}
                  disabled={saving}
                  activeOpacity={0.85}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                  activeOpacity={0.85}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={16} color="#fff" />
                      <Text style={styles.saveButtonText}>Salvar</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setEditing(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="create-outline" size={18} color={GREEN} />
              <Text style={styles.editButtonText}>Editar dados basicos</Text>
            </TouchableOpacity>
          )}

          {/* ── Ações rápidas ── */}
          <View style={styles.actionsCard}>
            <Text style={styles.cardTitle}>Acoes rapidas</Text>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => router.push({ pathname: '/(admin)/agendar', params: { patientId: patient.id } })}
              activeOpacity={0.85}
            >
              <View style={[styles.actionIconBox, { backgroundColor: GREEN_LIGHT }]}>
                <Ionicons name="calendar-outline" size={20} color={GREEN} />
              </View>
              <View style={styles.actionTextBox}>
                <Text style={styles.actionTitle}>Agendar consulta</Text>
                <Text style={styles.actionSubtitle}>Criar novo agendamento para este paciente</Text>
              </View>
              <Ionicons name="chevron-forward-outline" size={18} color="#8aab9e" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => router.push({ pathname: '/(admin)/consultas' })}
              activeOpacity={0.85}
            >
              <View style={[styles.actionIconBox, { backgroundColor: BLUE_LIGHT }]}>
                <Ionicons name="list-outline" size={20} color="#2d6cdf" />
              </View>
              <View style={styles.actionTextBox}>
                <Text style={styles.actionTitle}>Ver consultas</Text>
                <Text style={styles.actionSubtitle}>Historico de atendimentos da clinica</Text>
              </View>
              <Ionicons name="chevron-forward-outline" size={18} color="#8aab9e" />
            </TouchableOpacity>
          </View>

        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  circle1: { position: 'absolute', width: 280, height: 280, borderRadius: 140, backgroundColor: '#27795f', top: -110, right: -70, opacity: 0.45 },
  circle2: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: GREEN_DARK, top: -55, left: -70, opacity: 0.28 },
  header: { paddingTop: 56, paddingBottom: 24, paddingHorizontal: 24, backgroundColor: GREEN, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  homeBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTextBox: { flex: 1, marginHorizontal: 14 },
  headerEyebrow: { color: '#bce3d5', fontSize: 13, fontWeight: '600' },
  headerTitle: { color: WHITE, fontSize: 24, fontWeight: '800', marginTop: 2, letterSpacing: -0.4 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText: { fontSize: 15, color: GREEN, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { padding: 22, paddingBottom: 40, maxWidth: 960, alignSelf: 'center' as const, width: '100%' as const },

  profileCard: {
    backgroundColor: WHITE,
    borderRadius: 28,
    padding: 28,
    marginTop: -18,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#174c3e',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 26,
    backgroundColor: BLUE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#2d6cdf' },
  profileName: { fontSize: 22, fontWeight: '800', color: '#173d31', textAlign: 'center', letterSpacing: -0.4 },
  profileEmail: { marginTop: 6, fontSize: 14, color: '#6a877c', textAlign: 'center' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  statusText: { fontSize: 13, fontWeight: '700' },

  card: {
    backgroundColor: WHITE,
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#174c3e',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardTitle: { fontSize: 17, fontWeight: '800', color: '#173d31', marginBottom: 16 },

  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  infoIconBox: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: GREEN_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  infoTextBox: { flex: 1 },
  infoLabel: { fontSize: 11, fontWeight: '700', color: '#7a9b8e', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { marginTop: 3, fontSize: 15, fontWeight: '600', color: '#1b4337' },
  divider: { height: 1, backgroundColor: '#edf4f0', marginVertical: 2 },

  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#5f7d70', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 12 },
  input: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#d7ebe2',
    backgroundColor: '#fbfefd',
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#173d31',
    fontWeight: '500',
  },
  editActionsRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#d7ebe2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: { fontSize: 14, fontWeight: '700', color: GREEN },
  saveButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  saveButtonDisabled: { opacity: 0.75 },
  saveButtonText: { fontSize: 14, fontWeight: '700', color: WHITE },

  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#cfe7dc',
    backgroundColor: '#f9fdfb',
    marginBottom: 14,
  },
  editButtonText: { fontSize: 15, fontWeight: '700', color: GREEN },

  actionsCard: {
    backgroundColor: WHITE,
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#174c3e',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  actionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  actionIconBox: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  actionTextBox: { flex: 1, marginRight: 8 },
  actionTitle: { fontSize: 15, fontWeight: '700', color: '#173d31' },
  actionSubtitle: { marginTop: 3, fontSize: 12, color: '#7a9b8e' },
});
