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

type ProfessionalStatus = 'ativo' | 'ferias' | 'inativo';

interface ProfessionalRecord {
  id: string;
  name: string;
  crp: string;
  specialty: string;
  email: string;
  phone: string;
  patientCount: number;
  nextAppointment: string;
  status: ProfessionalStatus;
}

const GREEN = '#2e8b6e';
const GREEN_DARK = '#1f684f';
const GREEN_LIGHT = '#e8f7f1';
const BLUE_LIGHT = '#eaf1ff';
const ORANGE_LIGHT = '#fef3e8';
const RED_LIGHT = '#fdeeee';
const BG = '#f0faf5';
const WHITE = '#ffffff';

const MOCK_PROFESSIONALS: ProfessionalRecord[] = [
  {
    id: '1',
    name: 'Dra. Camila Rocha',
    crp: 'CRP 06/12345',
    specialty: 'Ansiedade e Depressao',
    email: 'camila.rocha@clinica.com.br',
    phone: '(11) 98811-2233',
    patientCount: 28,
    nextAppointment: 'Hoje, 14:30',
    status: 'ativo',
  },
  {
    id: '2',
    name: 'Dr. Felipe Moura',
    crp: 'CRP 06/15520',
    specialty: 'Terapia Cognitivo-Comportamental',
    email: 'felipe.moura@clinica.com.br',
    phone: '(11) 97755-3311',
    patientCount: 24,
    nextAppointment: 'Hoje, 16:00',
    status: 'ativo',
  },
  {
    id: '3',
    name: 'Dra. Marina Costa',
    crp: 'CRP 06/17884',
    specialty: 'Relacionamentos e Autoestima',
    email: 'marina.costa@clinica.com.br',
    phone: '(11) 96644-1122',
    patientCount: 19,
    nextAppointment: 'Amanha, 09:00',
    status: 'ferias',
  },
  {
    id: '4',
    name: 'Dr. Rafael Nunes',
    crp: 'CRP 06/14321',
    specialty: 'Psicologia Clinica',
    email: 'rafael.nunes@clinica.com.br',
    phone: '(11) 95533-8877',
    patientCount: 0,
    nextAppointment: 'Sem agenda',
    status: 'inativo',
  },
];

const DecorativeBackground = () => (
  <>
    <View style={styles.circle1} />
    <View style={styles.circle2} />
  </>
);

const getStatusMeta = (status: ProfessionalStatus) => {
  switch (status) {
    case 'ativo':
      return {
        label: 'Ativo',
        color: GREEN,
        bg: GREEN_LIGHT,
        icon: 'checkmark-circle-outline',
      };
    case 'ferias':
      return {
        label: 'Ferias',
        color: '#c46a1a',
        bg: ORANGE_LIGHT,
        icon: 'sunny-outline',
      };
    default:
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

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const filteredProfessionals = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return MOCK_PROFESSIONALS.filter((professional) => {
      const matchFilter = activeFilter === 'todos' || professional.status === activeFilter;
      const matchQuery =
        !normalizedQuery ||
        professional.name.toLowerCase().includes(normalizedQuery) ||
        professional.specialty.toLowerCase().includes(normalizedQuery) ||
        professional.crp.toLowerCase().includes(normalizedQuery);

      return matchFilter && matchQuery;
    });
  }, [activeFilter, query]);

  const summary = useMemo(
    () => ({
      total: MOCK_PROFESSIONALS.length,
      active: MOCK_PROFESSIONALS.filter((item) => item.status === 'ativo').length,
      totalPatients: MOCK_PROFESSIONALS.reduce((total, item) => total + item.patientCount, 0),
    }),
    []
  );

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
              Visualize os psicologos cadastrados, especialidades, carga atual de pacientes e
              disponibilidade operacional.
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
              <View style={styles.heroStatCard}>
                <Text style={styles.heroStatValue}>{summary.totalPatients}</Text>
                <Text style={styles.heroStatLabel}>Pacientes vinculados</Text>
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
                { key: 'ferias', label: 'Ferias' },
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

          {filteredProfessionals.map((professional) => {
            const status = getStatusMeta(professional.status);
            const initials = professional.name
              .split(' ')
              .slice(0, 2)
              .map((part) => part[0])
              .join('');

            return (
              <View key={professional.id} style={styles.userCard}>
                <View style={styles.userTopRow}>
                  <View style={styles.userMainInfo}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{initials}</Text>
                    </View>

                    <View style={styles.nameBox}>
                      <Text style={styles.userName}>{professional.name}</Text>
                      <Text style={styles.userMeta}>
                        {professional.crp} • {professional.specialty}
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
                    <Text style={styles.infoValue}>{professional.email}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Telefone</Text>
                    <Text style={styles.infoValue}>{professional.phone}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Pacientes ativos</Text>
                    <Text style={styles.infoValue}>{professional.patientCount}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Proxima consulta</Text>
                    <Text style={styles.infoValue}>{professional.nextAppointment}</Text>
                  </View>
                </View>

                <View style={styles.actionsRow}>
                  <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.85}>
                    <Ionicons name="document-text-outline" size={16} color={GREEN} />
                    <Text style={styles.secondaryButtonText}>Ver perfil</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.primaryButton} activeOpacity={0.85}>
                    <Ionicons name="calendar-outline" size={16} color="#fff" />
                    <Text style={styles.primaryButtonText}>Ver agenda</Text>
                  </TouchableOpacity>
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
});
