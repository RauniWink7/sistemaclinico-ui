import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import { showAlert } from "../../services/feedback";
import {
    getMe,
    getProfessionalSummary,
    getPsychologists,
    logout,
} from "../../services/api";
import { confirmAction } from "../../services/confirm";

const GREEN = "#2e8b6e";
const GREEN_LIGHT = "#e8f7f1";
const BLUE = "#2d6cdf";
const BLUE_LIGHT = "#eaf1ff";
const ORANGE = "#c46a1a";
const ORANGE_LIGHT = "#fef3e8";
const PURPLE = "#7c3aed";
const PURPLE_LIGHT = "#f3eeff";
const TEAL = "#0d9488";
const TEAL_LIGHT = "#e3f4f1";

const PAGE_BG = "#e8f1ec";
const WHITE = "#ffffff";
const BORDER = "#dfece5";
const TEXT_DARK = "#17352b";
const TEXT_MUTED = "#5f7a6f";
const LABEL = "#78938a";

const MAX_WIDTH = 1120;
const DESKTOP_BREAKPOINT = 900;

const formatTime = (isoDate: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoDate));

const formatDate = (isoDate: string) => {
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(new Date(isoDate));
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

const QUICK_ACTIONS = [
  {
    id: "agenda",
    title: "Agenda",
    description: "Consulte horários e atendimentos do dia.",
    icon: "calendar-outline",
    color: BLUE,
    bg: BLUE_LIGHT,
    route: "/(psychologist)/agenda",
  },
  {
    id: "patients",
    title: "Pacientes",
    description: "Acesse o acompanhamento clínico dos pacientes.",
    icon: "people-outline",
    color: GREEN,
    bg: GREEN_LIGHT,
    route: "/(psychologist)/lista",
  },
  {
    id: "relatorios",
    title: "Relatórios",
    description: "Indicadores, relatórios por paciente e exportações.",
    icon: "stats-chart-outline",
    color: TEAL,
    bg: TEAL_LIGHT,
    route: "/(psychologist)/relatorios",
  },
  {
    id: "chat",
    title: "Chat",
    description: "Converse com pacientes e acompanhe mensagens.",
    icon: "chatbubble-ellipses-outline",
    color: ORANGE,
    bg: ORANGE_LIGHT,
    route: "/(shared)/chat",
  },
  {
    id: "disponibilidade",
    title: "Disponibilidade",
    description: "Defina e revise seus horários semanais.",
    icon: "time-outline",
    color: PURPLE,
    bg: PURPLE_LIGHT,
    route: "/(psychologist)/disponibilidade",
  },
  {
    id: "profile",
    title: "Meu Perfil",
    description: "Edite seus dados e especialidade.",
    icon: "person-circle-outline",
    color: PURPLE,
    bg: PURPLE_LIGHT,
    route: "/(psychologist)/perfilP",
  },
];

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

  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

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
          showAlert("Erro", meResult.error || "Erro ao carregar perfil.");
        }

        // Fetch summary
        const summaryResult = await getProfessionalSummary();
        if (summaryResult.ok && summaryResult.data) {
          setSummary(summaryResult.data);
        } else {
          showAlert("Erro", summaryResult.error || "Erro ao carregar resumo.");
        }
      } catch (error) {
        showAlert("Erro", "Erro inesperado ao carregar dados.");
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

  const initials = useMemo(() => {
    const parts = (profileName || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "P";
    const first = parts[0][0] ?? "";
    const second = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + second).toUpperCase();
  }, [profileName]);

  const proxima = summary?.proxima_consulta ?? null;
  const proximaPatient =
    proxima?.patient_detail?.user?.full_name ?? "Não definido";

  const handleLogout = () => {
    confirmAction(
      "Deseja sair da sua conta?",
      "Você será desconectado e precisará fazer login novamente.",
      async () => {
        try {
          await logout();
        } finally {
          router.replace("/login");
        }
      },
      { confirmText: "Sair" },
    );
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN} />

      {/* ── Barra de identidade ── */}
      <View style={styles.header}>
        <View style={styles.headerInner}>
          <View style={styles.identity}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.identityText}>
              <Text style={styles.headerGreeting}>{greeting},</Text>
              <Text style={styles.headerName} numberOfLines={1}>
                {profileName || "Profissional"}
              </Text>
              <Text style={styles.headerCrp}>{profileCrp}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="log-out-outline" size={19} color="#fff" />
            {isDesktop && <Text style={styles.logoutText}>Sair</Text>}
          </TouchableOpacity>
        </View>
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
            style={[
              styles.container,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* ── Resumo do dia ── */}
            <Text style={styles.sectionTitle}>Resumo do dia</Text>
            <View style={styles.kpiBanner}>
              <View style={[styles.kpiIcon, { backgroundColor: GREEN_LIGHT }]}>
                <Ionicons name="calendar-outline" size={20} color={GREEN} />
              </View>
              <View style={styles.kpiBannerText}>
                <Text style={styles.kpiValue}>
                  {summary?.consultas_hoje ?? 0}
                </Text>
                <Text style={styles.kpiLabel}>Consultas de hoje</Text>
              </View>
            </View>

            {/* ── Próxima consulta ── */}
            <Text style={styles.sectionTitle}>Próxima consulta</Text>
            <View style={styles.nextCard}>
              {proxima ? (
                <View
                  style={[
                    styles.nextInner,
                    isDesktop && styles.nextInnerDesktop,
                  ]}
                >
                  <View style={styles.nextPatient}>
                    <View style={styles.nextIcon}>
                      <Ionicons name="person-outline" size={18} color={GREEN} />
                    </View>
                    <View style={styles.nextPatientText}>
                      <Text style={styles.nextLabel}>Paciente</Text>
                      <Text style={styles.nextName} numberOfLines={1}>
                        {proximaPatient}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.nextMeta,
                      isDesktop && styles.nextMetaDesktop,
                    ]}
                  >
                    <View style={styles.nextBadges}>
                      <View style={styles.nextBadge}>
                        <Ionicons
                          name="calendar-outline"
                          size={15}
                          color={GREEN}
                        />
                        <Text style={styles.nextBadgeText}>
                          {formatDate(proxima.scheduled_at)}
                        </Text>
                      </View>
                      <View style={styles.nextBadge}>
                        <Ionicons name="time-outline" size={15} color={GREEN} />
                        <Text style={styles.nextBadgeText}>
                          {formatTime(proxima.scheduled_at)}
                        </Text>
                      </View>
                    </View>

                    {proxima.id ? (
                      <TouchableOpacity
                        style={styles.nextDetailsBtn}
                        activeOpacity={0.85}
                        onPress={() =>
                          router.push({
                            pathname: "/(shared)/consulta-detalhe",
                            params: { id: String(proxima.id) },
                          })
                        }
                      >
                        <Text style={styles.nextDetailsBtnText}>
                          Ver detalhes
                        </Text>
                        <Ionicons
                          name="arrow-forward-outline"
                          size={16}
                          color={WHITE}
                        />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              ) : (
                <View style={styles.nextEmpty}>
                  <Ionicons
                    name="calendar-clear-outline"
                    size={26}
                    color="#a7c2b6"
                  />
                  <Text style={styles.nextEmptyText}>
                    Nenhuma consulta agendada no momento.
                  </Text>
                </View>
              )}
            </View>

            {/* ── Atalhos ── */}
            <Text style={styles.sectionTitle}>Atalhos</Text>
            <View style={styles.actionsGrid}>
              {QUICK_ACTIONS.map((action) => (
                <TouchableOpacity
                  key={action.id}
                  style={[
                    styles.actionTile,
                    { flexBasis: isDesktop ? 320 : "100%" },
                  ]}
                  activeOpacity={0.85}
                  onPress={() => router.push(action.route as any)}
                >
                  <View
                    style={[styles.actionIcon, { backgroundColor: action.bg }]}
                  >
                    <Ionicons
                      name={action.icon as any}
                      size={20}
                      color={action.color}
                    />
                  </View>

                  <View style={styles.actionText}>
                    <Text style={styles.actionTitle}>{action.title}</Text>
                    <Text style={styles.actionDescription}>
                      {action.description}
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward-outline"
                    size={18}
                    color="#9db6ab"
                  />
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  header: {
    backgroundColor: GREEN,
    paddingTop: 52,
    paddingBottom: 20,
  },
  headerInner: {
    width: "100%",
    maxWidth: MAX_WIDTH,
    alignSelf: "center",
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  identity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: WHITE,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  identityText: {
    flex: 1,
  },
  headerGreeting: {
    color: "#c6e6da",
    fontSize: 13,
    fontWeight: "600",
  },
  headerName: {
    color: WHITE,
    fontSize: 21,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginTop: 1,
  },
  headerCrp: {
    color: "#a9d6c6",
    fontSize: 12.5,
    fontWeight: "600",
    marginTop: 2,
  },
  logoutBtn: {
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.14)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  logoutText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: "700",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 44,
  },
  container: {
    width: "100%",
    maxWidth: MAX_WIDTH,
    alignSelf: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: TEXT_DARK,
    letterSpacing: -0.2,
    marginBottom: 12,
    marginTop: 4,
  },
  // KPIs
  kpiBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 18,
    marginBottom: 26,
    shadowColor: "#1f5442",
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  kpiBannerText: {
    flex: 1,
  },
  kpiIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  kpiValue: {
    fontSize: 26,
    fontWeight: "800",
    color: TEXT_DARK,
    letterSpacing: -0.5,
  },
  kpiLabel: {
    marginTop: 4,
    fontSize: 12.5,
    lineHeight: 17,
    color: TEXT_MUTED,
    fontWeight: "600",
  },
  // Próxima consulta
  nextCard: {
    backgroundColor: WHITE,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 18,
    marginBottom: 26,
    shadowColor: "#1f5442",
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  nextInner: {
    gap: 18,
  },
  nextInnerDesktop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  nextPatient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  nextIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: GREEN_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  nextPatientText: {
    flex: 1,
  },
  nextLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: LABEL,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  nextName: {
    marginTop: 3,
    fontSize: 17,
    fontWeight: "800",
    color: TEXT_DARK,
  },
  nextMeta: {
    gap: 14,
  },
  nextMetaDesktop: {
    flexDirection: "row",
    alignItems: "center",
  },
  nextBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  nextBadge: {
    backgroundColor: "#f2f9f5",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  nextBadgeText: {
    color: "#2c5a49",
    fontSize: 13.5,
    fontWeight: "700",
  },
  nextDetailsBtn: {
    alignSelf: "flex-start",
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  nextDetailsBtnText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: "800",
  },
  nextEmpty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 10,
  },
  nextEmptyText: {
    fontSize: 14,
    color: TEXT_MUTED,
    fontWeight: "600",
  },
  // Atalhos
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  actionTile: {
    flexGrow: 1,
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    shadowColor: "#1f5442",
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  actionIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15.5,
    fontWeight: "800",
    color: TEXT_DARK,
  },
  actionDescription: {
    marginTop: 4,
    fontSize: 12.5,
    lineHeight: 17,
    color: TEXT_MUTED,
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
