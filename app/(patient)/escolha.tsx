import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  StatusBar,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

// ─── Mock Data ────────────────────────────────────────────────────────────────
const PSYCHOLOGISTS = [
  {
    id: '1',
    name: 'Dra. Camila Rocha',
    crp: 'CRP 06/12345',
    specialty: 'Ansiedade e Depressão',
    bio: 'Especialista em Terapia Cognitivo-Comportamental com foco em transtornos de ansiedade, depressão e burnout. Mais de 8 anos de experiência clínica.',
    initials: 'CR',
    color: '#2e8b6e',
    bg: '#e8f7f1',
    rating: 4.9,
    sessions: 320,
    available: true,
  },
  {
    id: '2',
    name: 'Dr. Rafael Mendes',
    crp: 'CRP 06/98765',
    specialty: 'Relacionamentos e Autoestima',
    bio: 'Psicoterapeuta com abordagem humanista e existencial. Atua com questões de relacionamento, autoconhecimento e desenvolvimento pessoal.',
    initials: 'RM',
    color: '#3a7bd5',
    bg: '#e8f0fc',
    rating: 4.8,
    sessions: 210,
    available: true,
  },
  {
    id: '3',
    name: 'Dra. Fernanda Lima',
    crp: 'CRP 06/54321',
    specialty: 'Trauma e TEPT',
    bio: 'Especializada em trauma psicológico e TEPT, utilizando EMDR e técnicas de mindfulness. Experiência com adultos e adolescentes.',
    initials: 'FL',
    color: '#8b5cf6',
    bg: '#f0ebff',
    rating: 5.0,
    sessions: 180,
    available: false,
  },
  {
    id: '4',
    name: 'Dr. Lucas Tavares',
    crp: 'CRP 06/11223',
    specialty: 'Infância e Adolescência',
    bio: 'Psicólogo clínico com especialização em psicologia infantil e do adolescente. Atua com ludoterapia e orientação familiar.',
    initials: 'LT',
    color: '#e67e22',
    bg: '#fef3e8',
    rating: 4.7,
    sessions: 95,
    available: true,
  },
];

const SPECIALTIES = ['Todos', 'Ansiedade', 'Relacionamentos', 'Trauma', 'Infância'];

// ─── Types ────────────────────────────────────────────────────────────────────
interface Psychologist {
  id: string;
  name: string;
  crp: string;
  specialty: string;
  bio: string;
  initials: string;
  color: string;
  bg: string;
  rating: number;
  sessions: number;
  available: boolean;
}

// ─── Stars ────────────────────────────────────────────────────────────────────
const Stars = ({ rating }: { rating: number }) => (
  <View style={styles.starsRow}>
    {[1, 2, 3, 4, 5].map((i) => (
      <Ionicons
        key={i}
        name={i <= Math.floor(rating) ? 'star' : 'star-outline'}
        size={11}
        color="#f4b942"
      />
    ))}
    <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
  </View>
);

// ─── Psychologist Card ────────────────────────────────────────────────────────
const PsychologistCard = ({
  item,
  onSchedule,
  fadeAnim,
  index,
}: {
  item: Psychologist;
  onSchedule: () => void;
  fadeAnim: Animated.Value;
  index: number;
}) => (
  <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
    {/* Availability badge */}
    <View style={[styles.availBadge, { backgroundColor: item.available ? '#e8f7f1' : '#fef3f3' }]}>
      <View style={[styles.availDot, { backgroundColor: item.available ? '#2e8b6e' : '#e05c5c' }]} />
      <Text style={[styles.availText, { color: item.available ? '#2e8b6e' : '#e05c5c' }]}>
        {item.available ? 'Disponível' : 'Indisponível'}
      </Text>
    </View>

    {/* Top row */}
    <View style={styles.cardTop}>
      <View style={[styles.avatar, { backgroundColor: item.bg }]}>
        <Text style={[styles.avatarText, { color: item.color }]}>{item.initials}</Text>
      </View>

      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{item.name}</Text>
        <Text style={styles.cardCrp}>{item.crp}</Text>
        <View style={[styles.specialtyBadge, { backgroundColor: item.bg }]}>
          <Text style={[styles.specialtyText, { color: item.color }]}>{item.specialty}</Text>
        </View>
      </View>
    </View>

    {/* Stats */}
    <View style={styles.statsRow}>
      <Stars rating={item.rating} />
      <View style={styles.statDivider} />
      <Ionicons name="people-outline" size={13} color="#7aab96" />
      <Text style={styles.statText}>{item.sessions} sessões</Text>
    </View>

    {/* Bio */}
    <Text style={styles.bio}>{item.bio}</Text>

    {/* Schedule button */}
    <TouchableOpacity
      style={[styles.scheduleBtn, !item.available && styles.scheduleBtnDisabled]}
      onPress={item.available ? onSchedule : undefined}
      activeOpacity={0.85}
      disabled={!item.available}
    >
      <Ionicons
        name="calendar-outline"
        size={16}
        color={item.available ? '#fff' : '#aaa'}
      />
      <Text style={[styles.scheduleBtnText, !item.available && styles.scheduleBtnTextDisabled]}>
        {item.available ? 'Agendar consulta' : 'Sem horários disponíveis'}
      </Text>
    </TouchableOpacity>
  </Animated.View>
);

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function ChoosePsychologistScreen() {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('Todos');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const filtered = PSYCHOLOGISTS.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.specialty.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      activeFilter === 'Todos' ||
      p.specialty.toLowerCase().includes(activeFilter.toLowerCase());
    return matchSearch && matchFilter;
  });

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back-outline" size={22} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Nossos Psicólogos</Text>
          <Text style={styles.headerSubtitle}>{PSYCHOLOGISTS.length} profissionais disponíveis</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* ── Search ── */}
      <Animated.View
        style={[styles.searchSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#7aab96" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nome ou especialidade..."
            placeholderTextColor="#9bbfb0"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#9bbfb0" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          {SPECIALTIES.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.filterChip, activeFilter === s && styles.filterChipActive]}
              onPress={() => setActiveFilter(s)}
            >
              <Text style={[styles.filterChipText, activeFilter === s && styles.filterChipTextActive]}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      {/* ── List ── */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="search-outline" size={40} color="#b2dfcf" />
            <Text style={styles.emptyText}>Nenhum psicólogo encontrado</Text>
          </View>
        ) : (
          filtered.map((item, index) => (
            <PsychologistCard
              key={item.id}
              item={item}
              index={index}
              fadeAnim={fadeAnim}
              onSchedule={() => router.push({ pathname: '/agendamento', params: { psychologist: JSON.stringify(item) } })}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const GREEN = '#2e8b6e';
const WHITE = '#ffffff';
const BG = '#f0faf5';

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  // Header
  header: {
    backgroundColor: GREEN,
    paddingTop: 52,
    paddingBottom: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: WHITE,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#b2dfcf',
    textAlign: 'center',
    marginTop: 2,
  },

  // Search
  searchSection: {
    backgroundColor: WHITE,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0faf5',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#d4ede3',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1a3d31',
    fontWeight: '500',
  },

  // Filter chips
  filtersRow: {
    gap: 8,
    paddingBottom: 14,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f0faf5',
    borderWidth: 1,
    borderColor: '#d4ede3',
  },
  filterChipActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  filterChipText: {
    fontSize: 13,
    color: '#4a7a66',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: WHITE,
  },

  // List
  listContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },

  // Card
  card: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 18,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  availBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 12,
  },
  availDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  availText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardTop: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 12,
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
  },
  cardInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 3,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a3d31',
    letterSpacing: -0.2,
  },
  cardCrp: {
    fontSize: 12,
    color: '#7aab96',
    fontWeight: '500',
  },
  specialtyBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 2,
  },
  specialtyText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 12,
    color: '#4a7a66',
    fontWeight: '700',
    marginLeft: 4,
  },
  statDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#d4ede3',
    marginHorizontal: 2,
  },
  statText: {
    fontSize: 12,
    color: '#7aab96',
    fontWeight: '500',
  },

  // Bio
  bio: {
    fontSize: 13,
    color: '#4a7a66',
    lineHeight: 20,
    marginBottom: 16,
  },

  // Schedule button
  scheduleBtn: {
    backgroundColor: GREEN,
    borderRadius: 12,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  scheduleBtnDisabled: {
    backgroundColor: '#f0f0f0',
    shadowOpacity: 0,
    elevation: 0,
  },
  scheduleBtnText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: '700',
  },
  scheduleBtnTextDisabled: {
    color: '#aaa',
  },

  // Empty
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#7aab96',
    fontWeight: '500',
  },
});
