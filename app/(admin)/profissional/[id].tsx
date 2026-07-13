import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { showAlert } from '../../../services/feedback';
import { getPsychologists, updateProfessionalProfile, ProfessionalApiItem } from '../../../services/api';

const GREEN = '#2e8b6e';
const GREEN_DARK = '#1f684f';
const GREEN_LIGHT = '#e8f7f1';
const ORANGE_LIGHT = '#fef3e8';
const BG = '#f0faf5';
const WHITE = '#ffffff';

// Usa ProfessionalApiItem da API:
// { id, user: { id, full_name, email, phone, is_active, created_at }, crp, specialty, bio, session_duration_minutes }
type ProfessionalDetail = ProfessionalApiItem;

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
      <Ionicons name={icon as any} size={16} color="#c46a1a" />
    </View>
    <View style={styles.infoTextBox}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  </View>
);

export default function ProfessionalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [professional, setProfessional] = useState<ProfessionalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Campos editáveis do perfil profissional
  const [editCrp, setEditCrp] = useState('');
  const [editSpecialty, setEditSpecialty] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editDuration, setEditDuration] = useState('');

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
        const result = await getPsychologists();
        if (!result.ok || !result.data) {
          showAlert('Erro', result.error ?? 'Não foi possível carregar o profissional.');
          router.back();
          return;
        }
        const data = result.data.find((p) => p.id === id);
        if (!data) {
          showAlert('Erro', 'Profissional não encontrado.');
          router.back();
          return;
        }
        setProfessional(data);
        setEditCrp(data.crp ?? '');
        setEditSpecialty(data.specialty ?? '');
        setEditBio(data.bio ?? '');
        setEditDuration(String(data.session_duration_minutes ?? 50));
      } catch (err: any) {
        showAlert('Erro', err?.message ?? 'Ocorreu um erro inesperado.');
        router.back();
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id]);

  const handleSave = async () => {
    if (!professional) return;
    setSaving(true);
    try {
      const result = await updateProfessionalProfile(professional.id, {
        crp: editCrp.trim(),
        specialty: editSpecialty.trim(),
        bio: editBio.trim(),
        session_duration_minutes: parseInt(editDuration, 10) || 50,
      });
      if (!result.ok) {
        showAlert('Erro', result.error ?? 'Não foi possível salvar as alterações.');
        return;
      }
      setProfessional((prev) =>
        prev
          ? {
              ...prev,
              crp: editCrp.trim(),
              specialty: editSpecialty.trim(),
              bio: editBio.trim(),
              session_duration_minutes: parseInt(editDuration, 10) || 50,
            }
          : prev
      );
      setEditing(false);
      showAlert('Sucesso', 'Perfil do profissional atualizado.');
    } catch (err: any) {
      showAlert('Erro', err?.message ?? 'Ocorreu um erro inesperado.');
    } finally {
      setSaving(false);
    }
  };

  const initials = professional
    ? professional.user.full_name.split(' ').slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('')
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
            <Text style={styles.headerEyebrow}>Profissional</Text>
            <Text style={styles.headerTitle}>Carregando...</Text>
          </View>
          <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/(admin)')}>
            <Ionicons name="grid-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GREEN} />
          <Text style={styles.loadingText}>Buscando dados do profissional...</Text>
        </View>
      </View>
    );
  }

  if (!professional) return null;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN} />
      <DecorativeBackground />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back-outline" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTextBox}>
          <Text style={styles.headerEyebrow}>Profissional</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>Perfil</Text>
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
            <Text style={styles.profileName}>{professional.user.full_name}</Text>
            <Text style={styles.profileEmail}>{professional.user.email}</Text>

            <View style={styles.badgesRow}>
              {professional.specialty ? (
                <View style={styles.specialtyBadge}>
                  <Ionicons name="medkit-outline" size={13} color="#c46a1a" />
                  <Text style={styles.specialtyBadgeText}>{professional.specialty}</Text>
                </View>
              ) : null}

              <View style={[
                styles.statusBadge,
                { backgroundColor: professional.user.is_active ? GREEN_LIGHT : '#fdeeee' }
              ]}>
                <Ionicons
                  name={professional.user.is_active ? 'checkmark-circle-outline' : 'pause-circle-outline'}
                  size={13}
                  color={professional.user.is_active ? GREEN : '#d95c5c'}
                />
                <Text style={[
                  styles.statusText,
                  { color: professional.user.is_active ? GREEN : '#d95c5c' }
                ]}>
                  {professional.user.is_active ? 'Ativo' : 'Inativo'}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Dados de contato ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Dados de contato</Text>
            <InfoRow icon="mail-outline" label="E-mail" value={professional.user.email} />
            <View style={styles.divider} />
            <InfoRow icon="call-outline" label="Telefone" value={professional.user.phone ?? '—'} />
            <View style={styles.divider} />
            <InfoRow icon="time-outline" label="Cadastrado em" value={formatDate(professional.user.created_at)} />
          </View>

          {/* ── Perfil clínico ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Perfil clinico</Text>
            <InfoRow icon="id-card-outline" label="CRP" value={professional.crp ?? '—'} />
            <View style={styles.divider} />
            <InfoRow icon="medkit-outline" label="Especialidade" value={professional.specialty ?? '—'} />
            <View style={styles.divider} />
            <InfoRow
              icon="hourglass-outline"
              label="Duracao da sessao"
              value={professional.session_duration_minutes ? `${professional.session_duration_minutes} minutos` : '—'}
            />
            {professional.bio ? (
              <>
                <View style={styles.divider} />
                <View style={styles.bioBox}>
                  <Text style={styles.infoLabel}>Bio</Text>
                  <Text style={styles.bioText}>{professional.bio}</Text>
                </View>
              </>
            ) : null}
          </View>

          {/* ── Edição do perfil clínico ── */}
          {editing ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Editar perfil clinico</Text>

              <Text style={styles.fieldLabel}>CRP</Text>
              <TextInput
                style={styles.input}
                value={editCrp}
                onChangeText={setEditCrp}
                placeholder="Ex: 06/12345"
                placeholderTextColor="#94b3a6"
                editable={!saving}
              />

              <Text style={styles.fieldLabel}>Especialidade</Text>
              <TextInput
                style={styles.input}
                value={editSpecialty}
                onChangeText={setEditSpecialty}
                placeholder="Ex: Terapia Cognitivo-Comportamental"
                placeholderTextColor="#94b3a6"
                editable={!saving}
              />

              <Text style={styles.fieldLabel}>Duracao da sessao (minutos)</Text>
              <TextInput
                style={styles.input}
                value={editDuration}
                onChangeText={setEditDuration}
                placeholder="50"
                placeholderTextColor="#94b3a6"
                keyboardType="numeric"
                editable={!saving}
              />

              <Text style={styles.fieldLabel}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editBio}
                onChangeText={setEditBio}
                placeholder="Breve descricao sobre o profissional"
                placeholderTextColor="#94b3a6"
                multiline
                numberOfLines={4}
                editable={!saving}
              />

              <View style={styles.editActionsRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setEditing(false);
                    setEditCrp(professional.crp ?? '');
                    setEditSpecialty(professional.specialty ?? '');
                    setEditBio(professional.bio ?? '');
                    setEditDuration(String(professional.session_duration_minutes ?? 50));
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
              <Text style={styles.editButtonText}>Editar perfil clinico</Text>
            </TouchableOpacity>
          )}

          {/* ── Ações rápidas ── */}
          <View style={styles.actionsCard}>
            <Text style={styles.cardTitle}>Acoes rapidas</Text>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => router.push({ pathname: '/(admin)/agendar', params: { professionalId: professional.id } })}
              activeOpacity={0.85}
            >
              <View style={[styles.actionIconBox, { backgroundColor: GREEN_LIGHT }]}>
                <Ionicons name="calendar-outline" size={20} color={GREEN} />
              </View>
              <View style={styles.actionTextBox}>
                <Text style={styles.actionTitle}>Agendar consulta</Text>
                <Text style={styles.actionSubtitle}>Criar agendamento com este profissional</Text>
              </View>
              <Ionicons name="chevron-forward-outline" size={18} color="#8aab9e" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => router.push({ pathname: '/(admin)/consultas' })}
              activeOpacity={0.85}
            >
              <View style={[styles.actionIconBox, { backgroundColor: ORANGE_LIGHT }]}>
                <Ionicons name="list-outline" size={20} color="#c46a1a" />
              </View>
              <View style={styles.actionTextBox}>
                <Text style={styles.actionTitle}>Ver agenda da clinica</Text>
                <Text style={styles.actionSubtitle}>Supervisionar todas as consultas</Text>
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
  scrollContent: { padding: 22, paddingBottom: 40 },

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
    backgroundColor: ORANGE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#c46a1a' },
  profileName: { fontSize: 22, fontWeight: '800', color: '#173d31', textAlign: 'center', letterSpacing: -0.4 },
  profileEmail: { marginTop: 6, fontSize: 14, color: '#6a877c', textAlign: 'center' },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14, justifyContent: 'center' },
  specialtyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: ORANGE_LIGHT,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  specialtyBadgeText: { fontSize: 12, fontWeight: '700', color: '#c46a1a' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  statusText: { fontSize: 12, fontWeight: '700' },

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
    backgroundColor: ORANGE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  infoTextBox: { flex: 1 },
  infoLabel: { fontSize: 11, fontWeight: '700', color: '#7a9b8e', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { marginTop: 3, fontSize: 15, fontWeight: '600', color: '#1b4337' },
  divider: { height: 1, backgroundColor: '#edf4f0', marginVertical: 2 },

  bioBox: { paddingVertical: 8 },
  bioText: { marginTop: 6, fontSize: 14, lineHeight: 21, color: '#3d5e52', fontWeight: '500' },

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
  textArea: { minHeight: 100, paddingTop: 12, textAlignVertical: 'top' },

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