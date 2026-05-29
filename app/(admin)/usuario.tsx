import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  Animated,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getMe, getProfessionalsByClinic, createProfessionalAsAdmin } from '../../services/api';

type ProfessionalStatus = 'ativo' | 'inativo';

interface ProfessionalData {
  id: string;
  crp?: string;
  specialty?: string;
  bio?: string;
  session_duration_minutes?: number;
  user: {
    id: string;
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

interface NewProfessionalForm {
  fullName: string;
  email: string;
  phone: string;
  crp: string;
  specialty: string;
  password: string;
}

const DecorativeBackground = () => (
  <>
    <View style={styles.circle1} />
    <View style={styles.circle2} />
  </>
);

const normalizeProfessional = (item: any): ProfessionalData => ({
  id: item.id,
  crp: item.crp,
  specialty: item.specialty,
  bio: item.bio,
  session_duration_minutes: item.session_duration_minutes,
  user: {
    id: item.user?.id ?? '',
    full_name: item.user?.full_name ?? '',
    email: item.user?.email ?? '',
    phone: item.user?.phone,
    is_active: item.user?.is_active ?? true,
  },
});

const getStatusMeta = (isActive: boolean) => {
  if (isActive) {
    return {
      label: 'Ativo',
      color: GREEN,
      bg: GREEN_LIGHT,
      icon: 'checkmark-circle-outline',
    };
  } else {
    return {
      label: 'Inativo',
      color: '#d95c5c',
      bg: RED_LIGHT,
      icon: 'pause-circle-outline',
    };
  }
};

export default function AdminUserManagementScreen() {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'todos' | ProfessionalStatus>('todos');
  const [professionals, setProfessionals] = useState<ProfessionalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [creatingProfessional, setCreatingProfessional] = useState(false);
  const [newProfessional, setNewProfessional] = useState<NewProfessionalForm>({
    fullName: '',
    email: '',
    phone: '',
    crp: '',
    specialty: '',
    password: '',
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // Carregamento de profissionais
  useEffect(() => {
    const loadProfessionals = async () => {
      try {
        setLoading(true);

        // Busca clinic_id do usuário logado
        const meResult = await getMe();
        if (!meResult.ok || !meResult.data) {
          Alert.alert('Erro', meResult.error ?? 'Não foi possível carregar o perfil.');
          return;
        }

        const cId = meResult.data.clinic;
        if (!cId) {
          Alert.alert('Erro', 'Nenhuma clínica associada ao usuário.');
          return;
        }

        setClinicId(cId);

        // Busca profissionais da clínica
        const professionalsResult = await getProfessionalsByClinic(cId);
        if (!professionalsResult.ok) {
          Alert.alert('Erro', professionalsResult.error ?? 'Não foi possível carregar os profissionais.');
          return;
        }

        setProfessionals((professionalsResult.data || []).map(normalizeProfessional));
      } catch (err: any) {
        Alert.alert('Erro', err?.message ?? 'Ocorreu um erro inesperado.');
      } finally {
        setLoading(false);
      }
    };

    void loadProfessionals();
  }, []);

  const filteredProfessionals = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return professionals.filter((professional) => {
      const status = professional.user.is_active ? 'ativo' : 'inativo';
      const matchFilter = activeFilter === 'todos' || status === activeFilter;
      const matchQuery =
        !normalizedQuery ||
        professional.user.full_name.toLowerCase().includes(normalizedQuery) ||
        (professional.specialty && professional.specialty.toLowerCase().includes(normalizedQuery)) ||
        (professional.crp && professional.crp.toLowerCase().includes(normalizedQuery));

      return matchFilter && matchQuery;
    });
  }, [activeFilter, query, professionals]);

  const summary = useMemo(
    () => ({
      total: professionals.length,
      active: professionals.filter((item) => item.user.is_active).length,

    }),
    [professionals]
  );

  const handleCreateProfessional = async () => {
    if (!clinicId) {
      Alert.alert('Erro', 'Clínica não identificada.');
      return;
    }

    if (!newProfessional.fullName || !newProfessional.email || !newProfessional.password) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios.');
      return;
    }

    if (newProfessional.password.length < 8) {
      Alert.alert('Senha inválida', 'A senha deve ter pelo menos 8 caracteres.');
      return;
    }

    setCreatingProfessional(true);

    try {
      // Cria o profissional via endpoint admin (register() não permite role=professional)
      const registerResult = await createProfessionalAsAdmin({
        full_name: newProfessional.fullName,
        email: newProfessional.email,
        phone: newProfessional.phone || undefined,
        crp: newProfessional.crp || undefined,
        specialty: newProfessional.specialty || undefined,
        send_invite: true,
      });

      if (!registerResult.ok) {
        Alert.alert('Erro', registerResult.error ?? 'Não foi possível criar o profissional.');
        return;
      }

      Alert.alert('Sucesso', 'Profissional cadastrado com sucesso.');
      setModalVisible(false);
      setNewProfessional({
        fullName: '',
        email: '',
        phone: '',
        crp: '',
        specialty: '',
        password: '',
      });

      // Recarregar lista de profissionais
      const professionalsResult = await getProfessionalsByClinic(clinicId);
      if (professionalsResult.ok) {
        setProfessionals((professionalsResult.data || []).map(normalizeProfessional));
      }
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Ocorreu um erro inesperado.');
    } finally {
      setCreatingProfessional(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle="light-content" backgroundColor={GREEN} />
        <DecorativeBackground />

        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back-outline" size={22} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerTextBox}>
            <Text style={styles.headerEyebrow}>Area administrativa</Text>
            <Text style={styles.headerTitle}>Psicologos cadastrados</Text>
          </View>

          <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/(admin)')}>
            <Ionicons name="grid-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <ActivityIndicator size="large" color={GREEN} />
          <Text style={{ fontSize: 15, color: GREEN, fontWeight: '600' }}>Carregando profissionais...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN} />
      <DecorativeBackground />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back-outline" size={22} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerTextBox}>
          <Text style={styles.headerEyebrow}>Area administrativa</Text>
          <Text style={styles.headerTitle}>Psicologos cadastrados</Text>
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
          <View style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>Usuarios</Text>
            <Text style={styles.heroTitle}>Equipe clinica registrada</Text>
            <Text style={styles.heroSubtitle}>
              Visualize os psicologos cadastrados, especialidades e disponibilidade operacional.
            </Text>

            <View style={styles.heroStatsRow}>
              <View style={styles.heroStatCard}>
                <Text style={styles.heroStatValue}>{summary.total}</Text>
                <Text style={styles.heroStatLabel}>Psicologos</Text>
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
                placeholder="Buscar por nome, CRP ou especialidade"
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
                    onPress={() => setActiveFilter(filter.key as 'todos' | ProfessionalStatus)}
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
            <Text style={styles.sectionTitle}>Lista de psicologos</Text>
            <Text style={styles.resultCount}>{filteredProfessionals.length} encontrados</Text>
          </View>

          {filteredProfessionals.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="person-outline" size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>Nenhum profissional encontrado</Text>
            </View>
          ) : (
            filteredProfessionals.map((professional) => {
              const status = getStatusMeta(professional.user.is_active);
              const initials = professional.user.full_name
                .split(' ')
                .slice(0, 2)
                .map((part) => part[0].toUpperCase())
                .join('');

              return (
                <View key={professional.id} style={styles.userCard}>
                  <View style={styles.userTopRow}>
                    <View style={styles.userMainInfo}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{initials}</Text>
                      </View>

                      <View style={styles.nameBox}>
                        <Text style={styles.userName}>{professional.user.full_name}</Text>
                        <Text style={styles.userMeta}>
                          {professional.crp || '—'} • {professional.specialty || '—'}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                      <Ionicons name={status.icon as any} size={14} color={status.color} />
                      <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                    </View>
                  </View>

                  <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>E-mail</Text>
                      <Text style={styles.infoValue}>{professional.user.email}</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Telefone</Text>
                      <Text style={styles.infoValue}>{professional.user.phone || '—'}</Text>
                    </View>
                  </View>

                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      activeOpacity={0.85}
                      onPress={() => router.push({ pathname: '/(admin)/profissional/[id]', params: { id: professional.id } })}
                    >
                      <Ionicons name="document-text-outline" size={16} color={GREEN} />
                      <Text style={styles.secondaryButtonText}>Ver perfil</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.primaryButton}
                      activeOpacity={0.85}
                      onPress={() => router.push({ pathname: '/(admin)/agendar', params: { professionalId: professional.id } })}
                    >
                      <Ionicons name="calendar-outline" size={16} color="#fff" />
                      <Text style={styles.primaryButtonText}>Agenda</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </Animated.View>
      </ScrollView>

      {/* FAB para criar novo profissional */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="person-add-outline" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Modal para criar novo profissional */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => !creatingProfessional && setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Novo profissional</Text>
              <TouchableOpacity
                onPress={() => !creatingProfessional && setModalVisible(false)}
                disabled={creatingProfessional}
              >
                <Ionicons name="close-outline" size={24} color="#173d31" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.modalForm}>
                <Text style={styles.modalFieldLabel}>Nome completo *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Digite o nome completo"
                  placeholderTextColor="#94b3a6"
                  value={newProfessional.fullName}
                  onChangeText={(text) => setNewProfessional({ ...newProfessional, fullName: text })}
                  editable={!creatingProfessional}
                />

                <Text style={styles.modalFieldLabel}>E-mail *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Digite o e-mail"
                  placeholderTextColor="#94b3a6"
                  value={newProfessional.email}
                  onChangeText={(text) => setNewProfessional({ ...newProfessional, email: text })}
                  keyboardType="email-address"
                  editable={!creatingProfessional}
                />

                <Text style={styles.modalFieldLabel}>Telefone</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Digite o telefone"
                  placeholderTextColor="#94b3a6"
                  value={newProfessional.phone}
                  onChangeText={(text) => setNewProfessional({ ...newProfessional, phone: text })}
                  keyboardType="phone-pad"
                  editable={!creatingProfessional}
                />

                <Text style={styles.modalFieldLabel}>CRP</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Ex: CRP 06/12345"
                  placeholderTextColor="#94b3a6"
                  value={newProfessional.crp}
                  onChangeText={(text) => setNewProfessional({ ...newProfessional, crp: text })}
                  editable={!creatingProfessional}
                />

                <Text style={styles.modalFieldLabel}>Especialidade</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Ex: Ansiedade e Depressão"
                  placeholderTextColor="#94b3a6"
                  value={newProfessional.specialty}
                  onChangeText={(text) => setNewProfessional({ ...newProfessional, specialty: text })}
                  editable={!creatingProfessional}
                />

                <Text style={styles.modalFieldLabel}>Senha provisória *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Digite uma senha provisória"
                  placeholderTextColor="#94b3a6"
                  value={newProfessional.password}
                  onChangeText={(text) => setNewProfessional({ ...newProfessional, password: text })}
                  secureTextEntry
                  editable={!creatingProfessional}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButtonCancel, creatingProfessional && styles.buttonDisabled]}
                onPress={() => setModalVisible(false)}
                disabled={creatingProfessional}
                activeOpacity={0.85}
              >
                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButtonCreate, creatingProfessional && styles.buttonDisabled]}
                onPress={handleCreateProfessional}
                disabled={creatingProfessional}
                activeOpacity={0.85}
              >
                {creatingProfessional ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="person-add-outline" size={18} color="#fff" />
                    <Text style={styles.modalButtonCreateText}>Cadastrar</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
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
    paddingBottom: 100,
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
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
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
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 0,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#edf4f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#163c31',
  },
  modalScroll: {
    flex: 1,
    paddingHorizontal: 24,
  },
  modalForm: {
    paddingVertical: 20,
    gap: 18,
  },
  modalFieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6a887d',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  modalInput: {
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: '#f8fcfa',
    borderWidth: 1,
    borderColor: '#e3efe8',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1f4036',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: '#edf4f0',
  },
  modalButtonCancel: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#edf5f1',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5f7e73',
  },
  modalButtonCreate: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: GREEN,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  modalButtonCreateText: {
    fontSize: 14,
    fontWeight: '700',
    color: WHITE,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
