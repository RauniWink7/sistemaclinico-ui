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
} from 'react-native';
import { showAlert } from '../../services/feedback';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getMe, getProfessionalsByClinic, getPatientsByClinic } from '../../services/api';

const GREEN = '#2e8b6e';
const GREEN_DARK = '#1f684f';
const GREEN_LIGHT = '#e8f7f1';
const BLUE_LIGHT = '#eaf1ff';
const ORANGE_LIGHT = '#fef3e8';
const RED_LIGHT = '#fdeeee';
const BG = '#f0faf5';
const WHITE = '#ffffff';

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'professional' | 'patient';
  is_active: boolean;
}

const ROLE_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  admin: { label: 'Admin', color: '#c46a1a', bg: ORANGE_LIGHT, icon: 'shield-checkmark-outline' },
  professional: { label: 'Psicólogo', color: '#2d6cdf', bg: BLUE_LIGHT, icon: 'medkit-outline' },
  patient: { label: 'Paciente', color: GREEN, bg: GREEN_LIGHT, icon: 'person-outline' },
};

const DecorativeBackground = () => (
  <>
    <View style={styles.circle1} />
    <View style={styles.circle2} />
  </>
);

export default function AdminUsuariosScreen() {
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'todos' | 'admin' | 'professional' | 'patient'>('todos');
  const [users, setUsers] = useState<UserRow[]>([]);
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
          showAlert('Erro', meResult.error ?? 'Não foi possível carregar o perfil.');
          return;
        }
        const clinicId = meResult.data.clinic;
        if (!clinicId) {
          showAlert('Erro', 'Nenhuma clínica associada.');
          return;
        }

        const [profsResult, patientsResult] = await Promise.all([
          getProfessionalsByClinic(clinicId),
          getPatientsByClinic(clinicId),
        ]);

        const profs: UserRow[] = (profsResult.data || []).map((p: any) => ({
          id: p.user?.id ?? p.id,
          full_name: p.user?.full_name ?? '',
          email: p.user?.email ?? '',
          phone: p.user?.phone,
          role: 'professional',
          is_active: p.user?.is_active ?? true,
        }));

        const patients: UserRow[] = (patientsResult.data || []).map((p: any) => ({
          id: p.user?.id ?? p.id,
          full_name: p.user?.full_name ?? '',
          email: p.user?.email ?? '',
          phone: p.user?.phone,
          role: 'patient',
          is_active: p.user?.is_active ?? true,
        }));

        // Admin logado
        const adminRow: UserRow = {
          id: meResult.data.id,
          full_name: meResult.data.full_name ?? 'Admin',
          email: meResult.data.email ?? '',
          phone: meResult.data.phone,
          role: 'admin',
          is_active: true,
        };

        setUsers([adminRow, ...profs, ...patients]);
      } catch (err: any) {
        showAlert('Erro', err?.message ?? 'Erro inesperado.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      const matchRole = roleFilter === 'todos' || u.role === roleFilter;
      const matchQuery =
        !q ||
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q);
      return matchRole && matchQuery;
    });
  }, [users, query, roleFilter]);

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
            <Text style={styles.headerTitle}>Usuários</Text>
          </View>
          <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/(admin)')}>
            <Ionicons name="grid-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <ActivityIndicator size="large" color={GREEN} />
          <Text style={{ fontSize: 15, color: GREEN, fontWeight: '600' }}>Carregando usuários...</Text>
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
          <Text style={styles.headerTitle}>Usuários</Text>
        </View>
        <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/(admin)')}>
          <Ionicons name="grid-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* Hero */}
          <View style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>Sistema</Text>
            <Text style={styles.heroTitle}>Todos os usuários</Text>
            <Text style={styles.heroSubtitle}>
              Visualize todos os usuários cadastrados na clínica, independente do perfil.
            </Text>
            <View style={styles.heroStatsRow}>
              <View style={styles.heroStatCard}>
                <Text style={styles.heroStatValue}>{users.length}</Text>
                <Text style={styles.heroStatLabel}>Total</Text>
              </View>
              <View style={styles.heroStatCard}>
                <Text style={styles.heroStatValue}>{users.filter(u => u.role === 'professional').length}</Text>
                <Text style={styles.heroStatLabel}>Psicólogos</Text>
              </View>
              <View style={styles.heroStatCard}>
                <Text style={styles.heroStatValue}>{users.filter(u => u.role === 'patient').length}</Text>
                <Text style={styles.heroStatLabel}>Pacientes</Text>
              </View>
            </View>
          </View>

          {/* Ação rápida */}
          <TouchableOpacity
            style={styles.newButton}
            onPress={() =>
              showAlert('Cadastrar usuário', 'Qual tipo de perfil deseja cadastrar?', [
                { text: 'Paciente', onPress: () => router.push('/(admin)/cadastrar-paciente') },
                { text: 'Psicólogo', onPress: () => router.push('/(admin)/cadastrar-psicologo') },
                { text: 'Cancelar', style: 'cancel' },
              ])
            }
            activeOpacity={0.85}
          >
            <Ionicons name="person-add-outline" size={20} color="#fff" />
            <Text style={styles.newButtonText}>Cadastrar novo usuário</Text>
          </TouchableOpacity>

          {/* Filtros */}
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
                { key: 'admin', label: 'Admins' },
                { key: 'professional', label: 'Psicólogos' },
                { key: 'patient', label: 'Pacientes' },
              ].map((f) => (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.filterChip, roleFilter === f.key && styles.filterChipActive]}
                  onPress={() => setRoleFilter(f.key as any)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.filterChipText, roleFilter === f.key && styles.filterChipTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Lista */}
          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>Lista de usuários</Text>
            <Text style={styles.resultCount}>{filtered.length} encontrados</Text>
          </View>

          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>Nenhum usuário encontrado</Text>
            </View>
          ) : (
            filtered.map((u) => {
              const roleMeta = ROLE_META[u.role] ?? ROLE_META.patient;
              const initials = u.full_name.split(' ').slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');
              return (
                <View key={u.id} style={styles.userCard}>
                  <View style={styles.userTopRow}>
                    <View style={styles.userMainInfo}>
                      <View style={[styles.avatar, { backgroundColor: roleMeta.bg }]}>
                        <Text style={[styles.avatarText, { color: roleMeta.color }]}>{initials}</Text>
                      </View>
                      <View style={styles.nameBox}>
                        <Text style={styles.userName}>{u.full_name}</Text>
                        <Text style={styles.userMeta}>{u.email}</Text>
                      </View>
                    </View>
                    <View style={[styles.roleBadge, { backgroundColor: roleMeta.bg }]}>
                      <Ionicons name={roleMeta.icon as any} size={13} color={roleMeta.color} />
                      <Text style={[styles.roleText, { color: roleMeta.color }]}>{roleMeta.label}</Text>
                    </View>
                  </View>
                  {u.phone ? (
                    <View style={styles.infoRow}>
                      <Ionicons name="call-outline" size={14} color="#6a877c" />
                      <Text style={styles.infoText}>{u.phone}</Text>
                    </View>
                  ) : null}
                  <View style={[styles.statusDot, { backgroundColor: u.is_active ? GREEN_LIGHT : RED_LIGHT }]}>
                    <View style={[styles.dot, { backgroundColor: u.is_active ? GREEN : '#d95c5c' }]} />
                    <Text style={[styles.statusText, { color: u.is_active ? GREEN : '#d95c5c' }]}>
                      {u.is_active ? 'Ativo' : 'Inativo'}
                    </Text>
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
  userCard: { backgroundColor: WHITE, borderRadius: 24, padding: 18, marginBottom: 14, shadowColor: '#174c3e', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  userTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  userMainInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontSize: 17, fontWeight: '800' },
  nameBox: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '800', color: '#183d32' },
  userMeta: { marginTop: 4, fontSize: 13, color: '#6a877c' },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 11 },
  roleText: { fontSize: 12, fontWeight: '700' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  infoText: { fontSize: 13, color: '#6a877c' },
  statusDot: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, alignSelf: 'flex-start' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyStateText: { marginTop: 16, fontSize: 16, fontWeight: '600', color: '#a0b5aa' },
});