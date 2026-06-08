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
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getMe, getPatientsByClinic } from '../../services/api';
import type { PatientProfileApiItem } from '../../services/api';

const GREEN = '#2e8b6e';
const GREEN_DARK = '#1f684f';
const GREEN_LIGHT = '#e8f7f1';
const TEAL_LIGHT = '#e0f5ef';
const RED_LIGHT = '#fdeeee';
const BG = '#f0faf5';
const WHITE = '#ffffff';

const DecorativeBackground = () => (
  <>
    <View style={styles.circle1} />
    <View style={styles.circle2} />
  </>
);

const getStatusMeta = (isActive: boolean) =>
  isActive
    ? { label: 'Ativo', color: GREEN, bg: GREEN_LIGHT, icon: 'checkmark-circle-outline' }
    : { label: 'Inativo', color: '#d95c5c', bg: RED_LIGHT, icon: 'pause-circle-outline' };

export default function AdminPacientesScreen() {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'todos' | 'ativo' | 'inativo'>('todos');
  const [patients, setPatients] = useState<PatientProfileApiItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const meResult = await getMe();
        if (!meResult.ok || !meResult.data) {
          Alert.alert('Erro', meResult.error ?? 'Não foi possível carregar o perfil.');
          return;
        }
        const cId = meResult.data.clinic;
        if (!cId) { Alert.alert('Erro', 'Nenhuma clínica associada.'); return; }

        const result = await getPatientsByClinic(cId);
        if (!result.ok) { Alert.alert('Erro', result.error ?? 'Erro ao carregar pacientes.'); return; }
        setPatients(result.data || []);
      } catch (err: any) {
        Alert.alert('Erro', err?.message ?? 'Erro inesperado.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return patients.filter((p) => {
      const status = p.user.is_active ? 'ativo' : 'inativo';
      const matchFilter = activeFilter === 'todos' || status === activeFilter;
      const matchQuery = !q || p.user.full_name.toLowerCase().includes(q) || p.user.email.toLowerCase().includes(q);
      return matchFilter && matchQuery;
    });
  }, [patients, query, activeFilter]);

  const summary = useMemo(() => ({
    total: patients.length,
    active: patients.filter((p) => p.user.is_active).length,
  }), [patients]);

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
            <Text style={styles.headerEyebrow}>Área administrativa</Text>
            <Text style={styles.headerTitle}>Pacientes</Text>
          </View>
          <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/(admin)')}>
            <Ionicons name="grid-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
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

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back-outline" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTextBox}>
          <Text style={styles.headerEyebrow}>Área administrativa</Text>
          <Text style={styles.headerTitle}>Pacientes</Text>
        </View>
        <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/(admin)')}>
          <Ionicons name="grid-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          <View style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>Clínica</Text>
            <Text style={styles.heroTitle}>Pacientes cadastrados</Text>
            <Text style={styles.heroSubtitle}>
              Visualize, busque e acompanhe todos os pacientes vinculados à clínica.
            </Text>
            <View style={styles.heroStatsRow}>
              <View style={styles.heroStatCard}>
                <Text style={styles.heroStatValue}>{summary.total}</Text>
                <Text style={styles.heroStatLabel}>Total</Text>
              </View>
              <View style={styles.heroStatCard}>
                <Text style={styles.heroStatValue}>{summary.active}</Text>
                <Text style={styles.heroStatLabel}>Ativos</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.newButton}
            onPress={() => router.push('/(admin)/cadastrar-paciente')}
            activeOpacity={0.85}
          >
            <Ionicons name="person-add-outline" size={20} color="#fff" />
            <Text style={styles.newButtonText}>Cadastrar novo paciente</Text>
          </TouchableOpacity>

          <View style={styles.filtersCard}>
            <Text style={styles.sectionTitle}>Busca e filtros</Text>
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={18} color="#6c8c80" />
              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar por nome ou e-mail"
                placeholderTextColor="#8ba99d"
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {[
                { key: 'todos', label: 'Todos' },
                { key: 'ativo', label: 'Ativos' },
                { key: 'inativo', label: 'Inativos' },
              ].map((f) => (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.filterChip, activeFilter === f.key && styles.filterChipActive]}
                  onPress={() => setActiveFilter(f.key as any)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.filterChipText, activeFilter === f.key && styles.filterChipTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>Lista de pacientes</Text>
            <Text style={styles.resultCount}>{filtered.length} encontrados</Text>
          </View>

          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>Nenhum paciente encontrado</Text>
            </View>
          ) : (
            filtered.map((p) => {
              const status = getStatusMeta(p.user.is_active ?? true);
              const initials = p.user.full_name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
              return (
                <View key={p.id} style={styles.userCard}>
                  <View style={styles.userTopRow}>
                    <View style={styles.userMainInfo}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{initials}</Text>
                      </View>
                      <View style={styles.nameBox}>
                        <Text style={styles.userName}>{p.user.full_name}</Text>
                        <Text style={styles.userMeta}>{p.user.email}</Text>
                      </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                      <Ionicons name={status.icon as any} size={14} color={status.color} />
                      <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                    </View>
                  </View>

                  <View style={styles.infoGrid}>
                    {p.user.phone ? (
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Telefone</Text>
                        <Text style={styles.infoValue}>{p.user.phone}</Text>
                      </View>
                    ) : null}
                    {p.birth_date ? (
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Nascimento</Text>
                        <Text style={styles.infoValue}>{p.birth_date}</Text>
                      </View>
                    ) : null}
                    {p.cpf ? (
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>CPF</Text>
                        <Text style={styles.infoValue}>{p.cpf}</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      activeOpacity={0.85}
                      onPress={() => router.push({ pathname: '/(admin)/paciente/[id]', params: { id: p.id } })}
                    >
                      <Ionicons name="document-text-outline" size={16} color={GREEN} />
                      <Text style={styles.secondaryButtonText}>Ver perfil</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.primaryButton}
                      activeOpacity={0.85}
                      onPress={() => router.push({ pathname: '/(admin)/agendar', params: { patientId: p.id } })}
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
  screen: { flex: 1, backgroundColor: BG },
  circle1: { position: 'absolute', width: 280, height: 280, borderRadius: 140, backgroundColor: '#27795f', top: -110, right: -70, opacity: 0.45 },
  circle2: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: GREEN_DARK, top: -55, left: -70, opacity: 0.28 },
  header: { paddingTop: 56, paddingBottom: 24, paddingHorizontal: 24, backgroundColor: GREEN, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  homeBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTextBox: { flex: 1, marginHorizontal: 14 },
  headerEyebrow: { color: '#bce3d5', fontSize: 13, fontWeight: '600' },
  headerTitle: { color: WHITE, fontSize: 24, fontWeight: '800', marginTop: 2, letterSpacing: -0.4 },
  scroll: { flex: 1 },
  scrollContent: { padding: 22, paddingBottom: 40 },
  heroCard: { backgroundColor: WHITE, borderRadius: 26, padding: 22, marginTop: -18, marginBottom: 14, shadowColor: '#174c3e', shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  heroEyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: '#6b8f82' },
  heroTitle: { marginTop: 8, fontSize: 22, fontWeight: '800', color: '#163c31', letterSpacing: -0.4 },
  heroSubtitle: { marginTop: 8, fontSize: 14, lineHeight: 21, color: '#5d7c71' },
  heroStatsRow: { flexDirection: 'row', marginTop: 18, gap: 10 },
  heroStatCard: { flex: 1, borderRadius: 18, backgroundColor: GREEN_LIGHT, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 10 },
  heroStatValue: { fontSize: 22, fontWeight: '800', color: GREEN },
  heroStatLabel: { marginTop: 4, fontSize: 12, fontWeight: '700', color: '#5f7e73', textAlign: 'center' },
  newButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: GREEN, borderRadius: 18, paddingVertical: 16, marginBottom: 14 },
  newButtonText: { color: WHITE, fontSize: 15, fontWeight: '700' },
  filtersCard: { backgroundColor: WHITE, borderRadius: 24, padding: 18, marginBottom: 18, shadowColor: '#174c3e', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#163c31' },
  searchBox: { marginTop: 14, borderRadius: 18, backgroundColor: '#f4faf7', borderWidth: 1, borderColor: '#e3efe8', paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: '#1f4036' },
  filterRow: { marginTop: 14, gap: 10, paddingRight: 6 },
  filterChip: { borderRadius: 999, backgroundColor: '#edf5f1', paddingVertical: 10, paddingHorizontal: 14 },
  filterChipActive: { backgroundColor: GREEN },
  filterChipText: { fontSize: 13, fontWeight: '700', color: '#5f7e73' },
  filterChipTextActive: { color: WHITE },
  listHeader: { marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultCount: { fontSize: 13, fontWeight: '700', color: '#6a887d' },
  userCard: { backgroundColor: WHITE, borderRadius: 24, padding: 18, marginBottom: 16, shadowColor: '#174c3e', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  userTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  userMainInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 52, height: 52, borderRadius: 18, backgroundColor: TEAL_LIGHT, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontSize: 17, fontWeight: '800', color: GREEN },
  nameBox: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '800', color: '#183d32' },
  userMeta: { marginTop: 4, fontSize: 13, color: '#6a877c' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12 },
  statusText: { marginLeft: 6, fontSize: 13, fontWeight: '700' },
  infoGrid: { marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#edf4f0', gap: 10 },
  infoItem: { borderRadius: 14, backgroundColor: '#f8fcfa', padding: 12 },
  infoLabel: { fontSize: 12, fontWeight: '700', color: '#789286', textTransform: 'uppercase', letterSpacing: 0.6 },
  infoValue: { marginTop: 4, fontSize: 14, color: '#1f4036', fontWeight: '600' },
  actionsRow: { marginTop: 16, flexDirection: 'row', gap: 10 },
  secondaryButton: { flex: 1, borderRadius: 16, backgroundColor: GREEN_LIGHT, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { marginLeft: 8, fontSize: 13, fontWeight: '700', color: GREEN },
  primaryButton: { flex: 1, borderRadius: 16, backgroundColor: GREEN, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { marginLeft: 8, fontSize: 13, fontWeight: '700', color: WHITE },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyStateText: { marginTop: 16, fontSize: 16, fontWeight: '600', color: '#a0b5aa' },
});