import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import {
    clearTokens,
    getMe,
    getProfessionalSummary,
    getPsychologists,
} from "../../services/api";

const GREEN = "#2e8b6e";
const GREEN_DARK = "#1f684f";
const GREEN_LIGHT = "#e8f7f1";
const BLUE_LIGHT = "#eaf1ff";
const ORANGE_LIGHT = "#fef3e8";
const BG = "#f0faf5";
const WHITE = "#ffffff";

const formatTime = (isoDate: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoDate));

const QUICK_ACTIONS = [
  {
    id: "agenda",
    title: "Agenda",
    description: "Consulte horarios e atendimentos do dia.",
    icon: "calendar-outline",
    color: "#2d6cdf",
    bg: BLUE_LIGHT,
    route: "/(psychologist)/agenda",
  },
  {
    id: "patients",
    title: "Pacientes",
    description: "Acesse o acompanhamento clinico dos pacientes.",
    icon: "people-outline",
    color: GREEN,
    bg: GREEN_LIGHT,
    route: "/(psychologist)/lista",
  },
  {
    id: "chat",
    title: "Chat",
    description: "Converse com pacientes e acompanhe mensagens.",
    icon: "chatbubble-ellipses-outline",
    color: "#c46a1a",
    bg: ORANGE_LIGHT,
    route: "/(shared)/chat",
  },
  {
    id: "profile",
    title: "Meu Perfil",
    description: "Edite seus dados, especialidade e disponibilidade semanal.",
    icon: "person-circle-outline",
    color: "#7c3aed",
    bg: "#f3eeff",
    route: "/(psychologist)/perfilP",
  },
  {
    id: "disponibilidade",
    title: "Disponibilidade",
    description: "Veja suas disponibilidades semanais.",
    icon: "calendar",
    color: "#7c3aed",
    bg: "#f3eeff",
    route: "/(psychologist)/disponibilidade",
  },
  {
    id: "reports",
    title: "Relatorios",
    description: "Acompanhe indicadores, pacientes e exportacoes.",
    icon: "analytics-outline",
    color: "#2d6cdf",
    bg: BLUE_LIGHT,
    route: "/(psychologist)/relatorios",
  },
];

const DecorativeBackground = () => (
  <>
    <View style={styles.circle1} />
    <View style={styles.circle2} />
  </>
);

export default function PsychologistDashboardScreen() {
  const [profileName, setProfileName] = useState("");
  const [profileCrp, setProfileCrp] = useState("CRP não informado");
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<{
    consultas_hoje: number;
    proxima_consulta: any | null;
    total_pacientes: number;
  } | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch profile and psychologists in parallel
        const [meResult, profsResult] = await Promise.all([
          getMe(),
          getPsychologists(),
        ]);
        if (meResult.ok && meResult.data) {
          setProfileName(
            meResult.data.full_name || meResult.data.name || "Profissional",
          );
          const myProfile = profsResult.data?.find(
            (p) => p.user.id === meResult.data.id,
          );
          setProfileCrp(
            myProfile?.crp ? `CRP ${myProfile.crp}` : "CRP não informado",
          );
        } else {
          Alert.alert("Erro", meResult.error || "Erro ao carregar perfil.");
        }

        // Fetch summary
        const summaryResult = await getProfessionalSummary();
        if (summaryResult.ok && summaryResult.data) {
          setSummary(summaryResult.data);
        } else {
          Alert.alert(
            "Erro",
            summaryResult.error || "Erro ao carregar resumo.",
          );
        }
      } catch {
        Alert.alert("Erro", "Erro inesperado ao carregar dados.");
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  React.useEffect(() => {
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

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      "Deseja sair da sua conta?",
      "Você será desconectado e precisará fazer login novamente.",
      [
        {
          text: "Cancelar",
          onPress: () => {},
          style: "cancel",
        },
        {
          text: "Sair",
          onPress: async () => {
            try {
              await clearTokens();
              router.replace("/login");
            } catch {
              Alert.alert("Erro", "Erro ao fazer logout. Tente novamente.");
            }
          },
          style: "destructive",
        },
      ],
    );
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN} />
      <DecorativeBackground />

      <View style={styles.header}>
        <View style={styles.headerTextBox}>
          <Text style={styles.headerEyebrow}>Area do psicologo</Text>
          <Text style={styles.headerTitle}>Dashboard profissional</Text>
        </View>

        <TouchableOpacity
          style={styles.homeBtn}
          onPress={handleLogout}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="log-out-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={GREEN} />
            <Text style={styles.loadingText}>Carregando dados...</Text>
          </View>
        ) : (
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            <View style={styles.heroCard}>
              <Text style={styles.heroEyebrow}>{greeting}</Text>
              <Text style={styles.heroTitle}>{profileName}</Text>
              <Text style={styles.heroSubtitle}>{profileCrp}</Text>

              <View style={styles.heroBadge}>
                <Ionicons name="sparkles-outline" size={14} color={GREEN} />
                <Text style={styles.heroBadgeText}>
                  Painel inicial do profissional
                </Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Resumo do dia</Text>
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <View
                  style={[
                    styles.metricIconBox,
                    { backgroundColor: GREEN_LIGHT },
                  ]}
                >
                  <Ionicons name="calendar-outline" size={20} color={GREEN} />
                </View>
                <Text style={styles.metricValue}>
                  {summary?.consultas_hoje ?? 0}
                </Text>
                <Text style={styles.metricLabel}>Consultas de hoje</Text>
              </View>

              <View style={styles.metricCard}>
                <View
                  style={[
                    styles.metricIconBox,
                    { backgroundColor: BLUE_LIGHT },
                  ]}
                >
                  <Ionicons name="time-outline" size={20} color="#2d6cdf" />
                </View>
                <Text style={styles.metricValue}>
                  {summary?.proxima_consulta
                    ? formatTime(summary.proxima_consulta.scheduled_at)
                    : "--:--"}
                </Text>
                <Text style={styles.metricLabel}>Proxima consulta</Text>
              </View>

              <View style={styles.metricCardWide}>
                <View
                  style={[
                    styles.metricIconBox,
                    { backgroundColor: ORANGE_LIGHT },
                  ]}
                >
                  <Ionicons name="people-outline" size={20} color="#c46a1a" />
                </View>
                <View style={styles.metricTextBox}>
                  <Text style={styles.metricValue}>
                    {summary?.total_pacientes ?? 0}
                  </Text>
                  <Text style={styles.metricLabel}>Pacientes atendidos</Text>
                </View>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Proxima consulta</Text>
            <View style={styles.nextCard}>
              <View style={styles.nextTopRow}>
                <View style={styles.nextIconBox}>
                  <Ionicons name="person-outline" size={18} color={GREEN} />
                </View>
                <View style={styles.nextTextBox}>
                  <Text style={styles.nextLabel}>Paciente</Text>
                  <Text style={styles.nextName}>
                    {summary?.proxima_consulta?.patient_detail?.user
                      ?.full_name ?? "Não definido"}
                  </Text>
                </View>
              </View>

              <View style={styles.nextDivider} />

              <View style={styles.nextBottomRow}>
                <View style={styles.nextTimeBadge}>
                  <Ionicons name="time-outline" size={16} color={GREEN} />
                  <Text style={styles.nextTimeText}>
                    {summary?.proxima_consulta
                      ? formatTime(summary.proxima_consulta.scheduled_at)
                      : "--:--"}
                  </Text>
                </View>
                <Text style={styles.nextHint}>
                  Prepare-se para o proximo atendimento.
                </Text>
              </View>

              {summary?.proxima_consulta?.id && (
                <TouchableOpacity
                  style={styles.nextDetailBtn}
                  activeOpacity={0.8}
                  onPress={() =>
                    router.push({
                      pathname: "/(shared)/consulta-detalhe",
                      params: { id: summary.proxima_consulta.id },
                    } as any)
                  }
                >
                  <Ionicons name="eye-outline" size={14} color={GREEN} />
                  <Text style={styles.nextDetailBtnText}>Ver detalhes</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.sectionTitle}>Atalhos</Text>
            {QUICK_ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionCard}
                activeOpacity={0.85}
                onPress={() =>
                  router.push(
                    action.route as
                      | "/(psychologist)/agenda"
                      | "/(psychologist)/lista"
                      | "/(psychologist)/dashboardP"
                      | "/(shared)/chat"
                      | "/(psychologist)/disponibilidade",
                    
                  )
                }
              >
                <View
                  style={[styles.actionIconBox, { backgroundColor: action.bg }]}
                >
                  <Ionicons
                    name={action.icon as any}
                    size={22}
                    color={action.color}
                  />
                </View>

                <View style={styles.actionTextBox}>
                  <Text style={styles.actionTitle}>{action.title}</Text>
                  <Text style={styles.actionDescription}>
                    {action.description}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward-outline"
                  size={20}
                  color="#6c8c80"
                />
              </TouchableOpacity>
            ))}
          </Animated.View>
        )}
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
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "#27795f",
    top: -110,
    right: -70,
    opacity: 0.45,
  },
  circle2: {
    position: "absolute",
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  homeBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextBox: {
    flex: 1,
    marginHorizontal: 14,
  },
  headerEyebrow: {
    color: "#bce3d5",
    fontSize: 13,
    fontWeight: "600",
  },
  headerTitle: {
    color: WHITE,
    fontSize: 24,
    fontWeight: "800",
    marginTop: 2,
    letterSpacing: -0.4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 22,
    paddingBottom: 40,
    maxWidth: 960,
    alignSelf: 'center' as const,
    width: '100%' as const,
  },
  heroCard: {
    backgroundColor: WHITE,
    borderRadius: 28,
    padding: 22,
    marginTop: -18,
    marginBottom: 24,
    shadowColor: "#174c3e",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: GREEN,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  heroTitle: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: "800",
    color: "#173d31",
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: "#5e7b70",
    fontWeight: "700",
  },
  heroBadge: {
    marginTop: 16,
    alignSelf: "flex-start",
    backgroundColor: GREEN_LIGHT,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heroBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: GREEN,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#173d31",
    marginBottom: 14,
  },
  metricsGrid: {
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    backgroundColor: WHITE,
    borderRadius: 24,
    padding: 18,
    shadowColor: "#174c3e",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  metricCardWide: {
    backgroundColor: WHITE,
    borderRadius: 24,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#174c3e",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  metricIconBox: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  metricTextBox: {
    marginLeft: 14,
  },
  metricValue: {
    marginTop: 16,
    fontSize: 28,
    fontWeight: "800",
    color: "#173d31",
  },
  metricLabel: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: "#668277",
    fontWeight: "600",
  },
  nextCard: {
    backgroundColor: WHITE,
    borderRadius: 26,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#174c3e",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  nextTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  nextIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: GREEN_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  nextTextBox: {
    flex: 1,
  },
  nextLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#719084",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  nextName: {
    marginTop: 4,
    fontSize: 17,
    fontWeight: "800",
    color: "#173d31",
  },
  nextDivider: {
    height: 1,
    backgroundColor: "#edf4f0",
    marginVertical: 16,
  },
  nextBottomRow: {
    gap: 12,
  },
  nextTimeBadge: {
    alignSelf: "flex-start",
    backgroundColor: GREEN_LIGHT,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  nextTimeText: {
    color: GREEN,
    fontSize: 14,
    fontWeight: "800",
  },
  nextHint: {
    fontSize: 14,
    lineHeight: 20,
    color: "#647f74",
  },
  nextDetailBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#e8f7f1",
  },
  nextDetailBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2e8b6e",
  },
  actionCard: {
    backgroundColor: WHITE,
    borderRadius: 22,
    padding: 18,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#174c3e",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  actionIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  actionTextBox: {
    flex: 1,
    marginRight: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#193f33",
  },
  actionDescription: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
    color: "#69857a",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: GREEN,
    fontWeight: "600",
  },
});
