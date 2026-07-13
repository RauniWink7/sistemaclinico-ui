import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    TextInput as RNTextInput,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { showAlert } from "../../services/feedback";
import { getPsychologists, ProfessionalApiItem } from "../../services/api";

// Alias para evitar conflitos
const TextInput = RNTextInput;

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
        name={i <= Math.floor(rating) ? "star" : "star-outline"}
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
  item: ProfessionalApiItem;
  onSchedule: () => void;
  fadeAnim: Animated.Value;
  index: number;
}) => {
  const name =
    item.user?.full_name ||
    item.user?.first_name ||
    item.full_name ||
    item.name ||
    "Psicólogo";
  const specialty = item.specialty || "Psicologia";
  const color = item.color || "#2e8b6e";
  const bg = item.bg || "#e8f7f1";
  const initials = name
    .split(" ")
    .filter((part) => part.length > 0)
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
  const available = item.available ?? true;

  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
      {/* Availability badge */}
      <View
        style={[
          styles.availBadge,
          { backgroundColor: available ? "#e8f7f1" : "#fef3f3" },
        ]}
      >
        <View
          style={[
            styles.availDot,
            { backgroundColor: available ? "#2e8b6e" : "#e05c5c" },
          ]}
        />
        <Text
          style={[
            styles.availText,
            { color: available ? "#2e8b6e" : "#e05c5c" },
          ]}
        >
          {available ? "Disponível" : "Indisponível"}
        </Text>
      </View>

      {/* Top row */}
      <View style={styles.cardTop}>
        <View style={[styles.avatar, { backgroundColor: bg }]}>
          <Text style={[styles.avatarText, { color }]}>{initials}</Text>
        </View>

        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{name}</Text>
          <Text style={styles.cardCrp}>{item.crp}</Text>
          <View style={[styles.specialtyBadge, { backgroundColor: bg }]}>
            <Text style={[styles.specialtyText, { color }]}>{specialty}</Text>
          </View>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {/* ─── UX 1: Show "Novo profissional" if no rating ──────────────────── */}
        {item.rating && item.rating > 0 ? (
          <>
            <Stars rating={item.rating ?? 0} />
            <View style={styles.statDivider} />
          </>
        ) : (
          <>
            <View style={styles.newProfessionalBadge}>
              <Ionicons name="sparkles-outline" size={13} color="#c46a1a" />
              <Text style={styles.newProfessionalText}>Novo profissional</Text>
            </View>
            <View style={styles.statDivider} />
          </>
        )}

        {/* ─── UX 1: Only show sessions if > 0 ────────────────────────────── */}
        {item.sessions && item.sessions > 0 && (
          <>
            <Ionicons name="people-outline" size={13} color="#7aab96" />
            <Text style={styles.statText}>{item.sessions} sessões</Text>
          </>
        )}
      </View>

      {/* Bio */}
      <Text style={styles.bio}>{item.bio}</Text>

      {/* Schedule button */}
      <TouchableOpacity
        style={[styles.scheduleBtn, !available && styles.scheduleBtnDisabled]}
        onPress={available ? onSchedule : undefined}
        activeOpacity={0.85}
        disabled={!available}
      >
        <Ionicons
          name="calendar-outline"
          size={16}
          color={available ? "#fff" : "#aaa"}
        />
        <Text
          style={[
            styles.scheduleBtnText,
            !available && styles.scheduleBtnTextDisabled,
          ]}
        >
          {available ? "Agendar consulta" : "Sem horários disponíveis"}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function ChoosePsychologistScreen() {
  const [psychologists, setPsychologists] = useState<ProfessionalApiItem[]>([]);
  const [specialties, setSpecialties] = useState<string[]>(["Todos"]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("Todos");
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  React.useEffect(() => {
    const loadProfessionals = async () => {
      setLoading(true);
      const result = await getPsychologists();
      if (result.ok && Array.isArray(result.data)) {
        setPsychologists(result.data);

        // ─── FEATURE 4: Derive specialties dynamically from API data
        const specialtiesSet = new Set<string>(["Todos"]);
        for (const prof of result.data) {
          if (prof.specialty && prof.specialty.trim()) {
            specialtiesSet.add(prof.specialty);
          }
        }
        setSpecialties(Array.from(specialtiesSet));
      } else {
        showAlert(
          "Erro",
          result.error || "Não foi possível carregar os psicólogos.",
        );
      }
      setLoading(false);
    };

    void loadProfessionals();

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const filtered = psychologists.filter((p) => {
    const name =
      p.user?.full_name || p.user?.first_name || p.full_name || p.name || "";
    const specialty = p.specialty || "";
    const matchSearch =
      name.toLowerCase().includes(search.toLowerCase()) ||
      specialty.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      activeFilter === "Todos" ||
      specialty.toLowerCase().includes(activeFilter.toLowerCase());
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
          <Text style={styles.headerSubtitle}>
            {loading
              ? "Carregando profissionais..."
              : `${psychologists.length} profissionais disponíveis`}
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* ── Search ── */}
      <Animated.View
        style={[
          styles.searchSection,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
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
            <TouchableOpacity onPress={() => setSearch("")}>
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
          {specialties.map((s) => (
            <TouchableOpacity
              key={s}
              style={[
                styles.filterChip,
                activeFilter === s && styles.filterChipActive,
              ]}
              onPress={() => setActiveFilter(s)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeFilter === s && styles.filterChipTextActive,
                ]}
              >
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
        {loading ? (
          <View style={styles.emptyBox}>
            <ActivityIndicator size="large" color={GREEN} />
          </View>
        ) : filtered.length === 0 ? (
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
              onSchedule={() =>
                router.push({
                  pathname: "/agendamento",
                  params: { psychologist: JSON.stringify(item) },
                })
              }
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const GREEN = "#2e8b6e";
const WHITE = "#ffffff";
const BG = "#f0faf5";

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  // Header
  header: {
    backgroundColor: GREEN,
    paddingTop: 52,
    paddingBottom: 18,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: WHITE,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#b2dfcf",
    textAlign: "center",
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
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0faf5",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#d4ede3",
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#1a3d31",
    fontWeight: "500",
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
    backgroundColor: "#f0faf5",
    borderWidth: 1,
    borderColor: "#d4ede3",
  },
  filterChipActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  filterChipText: {
    fontSize: 13,
    color: "#4a7a66",
    fontWeight: "600",
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
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-end",
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
    fontWeight: "700",
  },
  cardTop: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 12,
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "800",
  },
  cardInfo: {
    flex: 1,
    justifyContent: "center",
    gap: 3,
  },
  cardName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1a3d31",
    letterSpacing: -0.2,
  },
  cardCrp: {
    fontSize: 12,
    color: "#7aab96",
    fontWeight: "500",
  },
  specialtyBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 2,
  },
  specialtyText: {
    fontSize: 11,
    fontWeight: "700",
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  ratingText: {
    fontSize: 12,
    color: "#4a7a66",
    fontWeight: "700",
    marginLeft: 4,
  },
  statDivider: {
    width: 1,
    height: 12,
    backgroundColor: "#d4ede3",
    marginHorizontal: 2,
  },
  statText: {
    fontSize: 12,
    color: "#7aab96",
    fontWeight: "500",
  },
  newProfessionalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fef3e8",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  newProfessionalText: {
    fontSize: 12,
    color: "#c46a1a",
    fontWeight: "700",
  },

  // Bio
  bio: {
    fontSize: 13,
    color: "#4a7a66",
    lineHeight: 20,
    marginBottom: 16,
  },

  // Schedule button
  scheduleBtn: {
    backgroundColor: GREEN,
    borderRadius: 12,
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  scheduleBtnDisabled: {
    backgroundColor: "#f0f0f0",
    shadowOpacity: 0,
    elevation: 0,
  },
  scheduleBtnText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: "700",
  },
  scheduleBtnTextDisabled: {
    color: "#aaa",
  },

  // Empty
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: "#7aab96",
    fontWeight: "500",
  },
});
