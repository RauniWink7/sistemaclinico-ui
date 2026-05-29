import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getClinicPatients, getMe } from '../../services/api';

type PatientStatus = 'ativo' | 'inativo';

interface PatientData {
  id: string; // PatientProfile.id — usado no agendamento (campo patient)
  cpf?: string;
  birthDate?: string;
  user: {
    id: string; // User.id — usado para abrir o detalhe do paciente
    full_name: string;
    email: string;
    phone?: string;
    is_active: boolean;
  };
}

const GREEN = '#2e8b6e';
const GREEN_DARK = '#1f684f';
const GREEN_LIGHT = '#e8f7f1';
const BLUE_LIGHT = '#eaf1ff';
const RED_LIGHT = '#fdeeee';
const BG = '#f0faf5';
const WHITE = '#ffffff';

const DecorativeBackground = () => (
  <>
    <View style={styles.circle1} />
    <View style={styles.circle2} />
  </>
);

const normalizePatient = (item: any): PatientData => ({
  id: item.id,
  cpf: item.cpf ?? undefined,
  birthDate: item.birth_date ?? undefined,
  user: {
    id: item.user?.id ?? '',
    full_name: item.user?.full_name ?? '',
    email: item.user?.email ?? '',
    phone: item.user?.phone,
    is_active: item.user?.is_active ?? true,
  },
});

const getStatusMeta = (isActive: boolean) =>
  isActive
    ? { label: 'Ativo', color: GREEN, bg: GREEN_LIGHT, icon: 'checkmark-circle-outline' }
    : { label: 'Inativo', color: '#d95c5c', bg: RED_LIGHT, icon: 'pause-circle-outline' };

export default function AdminPatientsScreen() {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'todos' | PatientStatus>('todos');
  const [patients, setPatients] = useState<PatientData[]>([]);
  const [loading, setLoading] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    const loadPatients = async () => {
      try {
        setLoading(true);

        const meResult = await getMe();
        if (!meResult.ok || !meResult.data) {
          Alert.alert('Erro', meResult.error ?? 'Não foi possível carregar o perfil.');
          return;
        }

        const clinicId = meResult.data.clinic;
        if (!clinicId) {
          Alert.alert('Erro', 'Nenhuma clínica associada ao usuário.');
          return;
        }

        const patientsResult = await getClinicPatients(clinicId);
        if (!patientsResult.ok) {
          Alert.alert('Erro', patientsResult.error ?? 'Não foi possível carregar os pacientes.');
          return;
        }

        setPatients((patientsResult.data || []).map(normalizePatient));
      } catch (err: any) {
        Alert.alert('Erro', err?.message ?? 'Ocorreu um erro inesperado.');
      } finally {
        setLoading(false);
      }
    };

    void loadPatients();
  }, []);

  const filteredPatients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return patients.filter((patient) => {
      const status = patient.user.is_active ? 'ativo' : 'inativo';
      const matchFilter = activeFilter === 'todos' || status === activeFilter;
      const matchQuery =
        !normalizedQuery ||
        patient.user.full_name.toLowerCase().includes(normalizedQuery) ||
        patient.user.email.toLowerCase().includes(normalizedQuery) ||
        (patient.cpf && patient.cpf.toLowerCase().includes(normalizedQuery));

      return matchFilter && matchQuery;
    });
  }, [activeFilter, query, patients]);

  const summary = useMemo(
    () => ({
      total: patients.length,
      active: patients.filter((item) => item.user.is_active).length,
    }),
    [patients]
  );

  const renderHeader = (title: string) => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back-outline" size={22} color="#fff" />
      </TouchableOpacity>

      <View style={styles.headerTextBox}>
        <Text style={styles.headerEyebrow}>Area administrativa</Text>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>

      <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/(admin)')}>
        <Ionicons name="grid-outline" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle="light-content" backgroundColor={GREEN} />
        <DecorativeBackground />
        {renderHeader('Pacientes cadastrados')}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <ActivityIndicator size="large" color={GREEN} />
          <Text style={{ fontSize: 15, color: GREEN, fontWeight: '600' }}>Carregando pacientes...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN} />
      <DecorativeBackground />

      {renderHeader('Pacientes cadastrados')}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>Usuarios</Text>
            <Text style={styles.heroTitle}>Pacientes da clinica</Text>
            <Text style={styles.heroSubtitle}>
              Visualize os pacientes cadastrados, acesse os perfis e agende consultas.
            </Text>

            <View style={styles.heroStatsRow}>
              <View style={styles.heroStatCard}>
                <Text style={styles.heroStatValue}>{summary.total}</Text>
                <Text style={styles.heroStatLabel}>Pacientes</Text>
              </View>
              <View style={styles.heroStatCard}>
                <Text style={styles.heroStatValue}>{summary.active}</Text>
                <Text style={styles.heroStatLabel}>Ativos</Text>
              </View>
            </View>
          </View>

          <View style={styles.filtersCard}>
            <Text style={styles.sectionTitle}>Busca e filtros</Text>

            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={18} color="#6c8c80" />
              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar por nome, e-mail ou CPF"
                placeholderTextColor="#8ba99d"
              />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {[
                { key: 'todos', label: 'Todos' },
                { key: 'ativo', label: 'Ativos' },
                { key: 'inativo', label: 'Inativos' },
              ].map((filter) => {
                const isActive = activeFilter === filter.key;

                return (
                  <TouchableOpacity
                    key={filter.key}
                    style={[styles.filterChip, isActive && styles.filterChipActive]}
                    onPress={() => setActiveFilter(filter.key as 'todos' | PatientStatus)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>Lista de pacientes</Text>
            <Text style={styles.resultCount}>{filteredPatients.length} encontrados</Text>
          </View>

          {filteredPatients.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>Nenhum paciente encontrado</Text>
            </View>
          ) : (
            filteredPatients.map((patient) => {
              const status = getStatusMeta(patient.user.is_active);
              const initials = patient.user.full_name
                .split(' ')
                .filter((part) => part.length > 0)
                .slice(0, 2)
                .map((part) => part[0].toUpperCase())
                .join('');

              return (
                <View key={patient.id} style={styles.userCard}>
                  <View style={styles.userTopRow}>
                    <View style={styles.userMainInfo}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{initials || '?'}</Text>
                      </View>

                      <View style={styles.nameBox}>
                        <Text style={styles.userName}>{patient.user.full_name || '—'}</Text>
                        <Text style={styles.userMeta}>{patient.user.email || '—'}</Text>
                      </View>
                    </View>

                    <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                      <Ionicons name={status.icon as any} size={14} color={status.color} />
                      <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                    </View>
                  </View>

                  <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Telefone</Text>
                      <Text style={styles.infoValue}>{patient.user.phone || '—'}</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>CPF</Text>
                      <Text style={styles.infoValue}>{patient.cpf || '—'}</Text>
                    </View>
                  </View>

                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      activeOpacity={0.85}
                      onPress={() =>
                        router.push({
                          pathname: '/(admin)/paciente/[id]',
                          params: { id: patient.user.id },
                        })
                      }
                    >
                      <Ionicons name="document-text-outline" size={16} color={GREEN} />
                      <Text style={styles.secondaryButtonText}>Ver perfil</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.primaryButton}
                      activeOpacity={0.85}
                      onPress={() =>
                        router.push({
                          pathname: '/(admin)/agendar',
                          params: { patientId: patient.id },
                        })
                      }
                    >
                      <Ionicons name="calendar-outline" size={16} color="#fff" />
                      <Text style={styles.primaryButtonText}>Agendar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
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
    paddingBottom: 60,
    maxWidth: 960,
    alignSelf: 'center' as const,
    width: '100%' as const,
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
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#6b8f82',
  },
  heroTitle: {
    marginTop: 8,
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
  heroStatsRow: {
    flexDirection: 'row',
    marginTop: 18,
    gap: 10,
  },
  heroStatCard: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: GREEN_LIGHT,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  heroStatValue: {
    fontSize: 22,
    fontWeight: '800',
    color: GREEN,
  },
  heroStatLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
    color: '#5f7e73',
    textAlign: 'center',
  },
  filtersCard: {
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
  filterRow: {
    marginTop: 14,
    gap: 10,
    paddingRight: 6,
  },
  filterChip: {
    borderRadius: 999,
    backgroundColor: '#edf5f1',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  filterChipActive: {
    backgroundColor: GREEN,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5f7e73',
  },
  filterChipTextActive: {
    color: WHITE,
  },
  listHeader: {
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6a887d',
  },
  userCard: {
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
  userTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  userMainInfo: {
    flex: 1,
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
  nameBox: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#183d32',
  },
  userMeta: {
    marginTop: 4,
    fontSize: 13,
    color: '#6a877c',
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
  infoGrid: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#edf4f0',
    gap: 12,
  },
  infoItem: {
    borderRadius: 16,
    backgroundColor: '#f8fcfa',
    padding: 14,
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
    fontSize: 14,
    lineHeight: 20,
    color: '#1f4036',
    fontWeight: '600',
  },
  actionsRow: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: GREEN_LIGHT,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '700',
    color: GREEN,
  },
  primaryButton: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: GREEN,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '700',
    color: WHITE,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#a0b5aa',
  },
});
