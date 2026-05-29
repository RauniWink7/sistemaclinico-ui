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
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import {
    getAppointments,
    getClinicPatients,
    getMe,
    getPatientProfile,
} from "../../services/api";

const GREEN = "#2e8b6e";
const GREEN_DARK = "#1f684f";
const GREEN_LIGHT = "#e8f7f1";
const BLUE_LIGHT = "#eaf1ff";
const BG = "#f0faf5";
const WHITE = "#ffffff";

const DecorativeBackground = () => (
  <>
    <View style={styles.circle1} />
    <View style={styles.circle2} />
  </>
);

export default function PsychologistPatientListScreen() {
  const [query, setQuery] = useState("");
  const [allPatients, setAllPatients] = useState<any[]>([]); // All loaded patients
  const [patients, setPatients] = useState<any[]>([]); // Paginated display
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    const loadPatients = async () => {
      setLoading(true);
      try {
        // getMe e getAppointments não dependem um do outro — rodam em paralelo
        const [meResult, appointmentsResult] = await Promise.all([
          getMe(),
          getAppointments(),
        ]);

        if (!meResult.ok || !meResult.data?.clinic) {
          Alert.alert("Erro", "Não foi possível obter a clínica do usuário.");
          setLoading(false);
          return;
        }
        const clinicId = meResult.data.clinic;

        const patientsResult = await getClinicPatients(clinicId);
        if (!patientsResult.ok) {
          Alert.alert(
            "Erro",
            patientsResult.error || "Erro ao carregar pacientes.",
          );
          setLoading(false);
          return;
        }

        const appointments = appointmentsResult.ok
          ? appointmentsResult.data || []
          : [];

        // ─── FEATURE 5: Load PatientProfile.id for each patient in parallel
        const patientsWithProfiles = await Promise.all(
          (patientsResult.data || []).map(async (patient: any) => {
            const userId = patient.id;
            let profileId = patient.id; // fallback to User.id

            // Try to load the actual PatientProfile to get the correct profile.id
            const profileResult = await getPatientProfile(userId);
            if (profileResult.ok && profileResult.data?.id) {
              profileId = profileResult.data.id;
            } else if (profileResult.error) {
              console.warn(
                `[FEATURE 5] Failed to load PatientProfile for user ${userId}: ${profileResult.error}`,
              );
            }

            return { ...patient, userId, profileId };
          }),
        );

        const patientsWithLastAppointment = patientsWithProfiles.map(
          (patient: any) => {
            const patientAppointments = appointments
              .filter(
                (app: any) =>
                  app.patient === patient.profileId ||
                  app.patient === patient.userId,
              )
              .sort(
                (a: any, b: any) =>
                  new Date(b.scheduled_at).getTime() -
                  new Date(a.scheduled_at).getTime(),
              );

            const lastAppointment = patientAppointments[0];

            return {
              ...patient,
              _userId: patient.userId,
              _profileId: patient.profileId,
              // Serializer flat: full_name e phone já estão na raiz do objeto
              _displayName: patient.full_name ?? "Sem nome",
              _displayPhone: patient.phone ?? "Telefone não informado",
              lastAppointment: lastAppointment?.scheduled_at
                ? new Date(lastAppointment.scheduled_at).toLocaleDateString(
                    "pt-BR",
                  )
                : patient.created_at
                  ? new Date(patient.created_at).toLocaleDateString("pt-BR")
                  : "Não informado",
            };
          },
        );

        // ─── FEATURE 5: Pagination — show first 20 items and set hasMore flag
        const pageSize = 20;
        const initialPageItems = patientsWithLastAppointment.slice(0, pageSize);
        setAllPatients(patientsWithLastAppointment);
        setPatients(initialPageItems);
        setHasMore(patientsWithLastAppointment.length > pageSize);
        setPage(1);
      } catch {
        Alert.alert("Erro", "Erro inesperado ao carregar pacientes.");
      } finally {
        setLoading(false);
      }
    };

    loadPatients();
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

  const filteredPatients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return patients.filter((patient) => {
      if (!normalizedQuery) return true;
      return (
        patient._displayName.toLowerCase().includes(normalizedQuery) ||
        patient._displayPhone?.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [query, patients]);

  // ─── FEATURE 5: Handle load more ──────────────────────────────────────────
  const handleLoadMore = async () => {
    const pageSize = 20;
    const newPage = page + 1;
    const startIndex = (newPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    setLoadingMore(true);
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    const newPageItems = allPatients.slice(0, endIndex);
    setPatients(newPageItems);
    setPage(newPage);
    setHasMore(endIndex < allPatients.length);
    setLoadingMore(false);
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN} />
      <DecorativeBackground />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back-outline" size={22} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerTextBox}>
          <Text style={styles.headerEyebrow}>Area do psicologo</Text>
          <Text style={styles.headerTitle}>Lista de pacientes</Text>
        </View>

        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => router.replace("/(psychologist)/dashboardP")}
        >
          <Ionicons name="home-outline" size={20} color="#fff" />
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
            <Text style={styles.loadingText}>Carregando pacientes...</Text>
          </View>
        ) : (
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            <View style={styles.heroCard}>
              <Text style={styles.heroTitle}>
                Pacientes vinculados ao seu acompanhamento
              </Text>
              <Text style={styles.heroSubtitle}>
                Consulte rapidamente nome, telefone e data da ultima consulta.
                Toque em um paciente para abrir a ficha completa.
              </Text>

              <View style={styles.heroBadge}>
                <Ionicons name="people-outline" size={14} color={GREEN} />
                <Text style={styles.heroBadgeText}>
                  {patients.length} pacientes ativos
                </Text>
              </View>
            </View>

            <View style={styles.searchCard}>
              <Text style={styles.sectionTitle}>Buscar paciente</Text>
              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={18} color="#6c8c80" />
                <TextInput
                  style={styles.searchInput}
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Digite o nome do paciente"
                  placeholderTextColor="#8ba99d"
                />
              </View>
            </View>

            <View style={styles.listHeader}>
              <Text style={styles.sectionTitle}>Pacientes encontrados</Text>
              <Text style={styles.resultCount}>{filteredPatients.length}</Text>
            </View>

            {filteredPatients.map((patient) => {
              const initials = patient._displayName
                .split(" ")
                .slice(0, 2)
                .map((part: string) => part[0])
                .join("");

              return (
                <TouchableOpacity
                  key={patient._profileId}
                  style={styles.patientCard}
                  activeOpacity={0.85}
                  onPress={() =>
                    router.push({
                      pathname: "/(psychologist)/ficha",
                      params: {
                        // user.id — necessário para carregar o perfil do paciente
                        patientId: patient._userId,
                        // patientProfileId será sobrescrito em ficha.tsx com patient?.id do getPatientProfile()
                        // que é o verdadeiro PatientProfile.id exigido pelo backend para upload
                        patientProfileId: patient._profileId,
                        patientName: patient._displayName,
                        patientPhone: patient._displayPhone,
                      },
                    })
                  }
                >
                  <View style={styles.patientHeader}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{initials}</Text>
                    </View>

                    <View style={styles.patientTextBox}>
                      <Text style={styles.patientName}>
                        {patient._displayName}
                      </Text>
                      <Text style={styles.patientMeta}>
                        {patient._displayPhone}
                      </Text>
                    </View>

                    <Ionicons
                      name="chevron-forward-outline"
                      size={20}
                      color="#6c8c80"
                    />
                  </View>

                  <View style={styles.lastAppointmentBox}>
                    <Ionicons name="calendar-outline" size={15} color={GREEN} />
                    <Text style={styles.lastAppointmentText}>
                      Última consulta: {patient.lastAppointment}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* ─── FEATURE 5: Load more button ────────────────────────────────── */}
            {hasMore && (
              <TouchableOpacity
                style={styles.loadMoreBtn}
                onPress={handleLoadMore}
                disabled={loadingMore}
                activeOpacity={0.85}
              >
                {loadingMore ? (
                  <ActivityIndicator size="small" color={GREEN} />
                ) : (
                  <>
                    <Ionicons
                      name="cloud-download-outline"
                      size={18}
                      color={GREEN}
                    />
                    <Text style={styles.loadMoreText}>
                      Carregar mais pacientes
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
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
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
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
    borderRadius: 26,
    padding: 22,
    marginTop: -18,
    marginBottom: 22,
    shadowColor: "#174c3e",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#163c31",
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: "#5d7c71",
  },
  heroBadge: {
    alignSelf: "flex-start",
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GREEN_LIGHT,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  heroBadgeText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "700",
    color: GREEN,
  },
  searchCard: {
    backgroundColor: WHITE,
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
    shadowColor: "#174c3e",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#163c31",
  },
  searchBox: {
    marginTop: 14,
    borderRadius: 18,
    backgroundColor: "#f4faf7",
    borderWidth: 1,
    borderColor: "#e3efe8",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: "#1f4036",
  },
  listHeader: {
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resultCount: {
    fontSize: 16,
    fontWeight: "800",
    color: GREEN,
  },
  patientCard: {
    backgroundColor: WHITE,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#174c3e",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  patientHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: BLUE_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#2d6cdf",
  },
  patientTextBox: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#183d32",
  },
  patientMeta: {
    marginTop: 4,
    fontSize: 13,
    color: "#6a877c",
  },
  lastAppointmentBox: {
    marginTop: 16,
    borderRadius: 16,
    backgroundColor: "#f7fbf9",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  lastAppointmentText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "600",
    color: "#36594d",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#5d7c71",
    fontWeight: "600",
  },
  loadMoreBtn: {
    backgroundColor: WHITE,
    borderRadius: 24,
    padding: 18,
    marginTop: 8,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: GREEN,
    shadowColor: "#174c3e",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  loadMoreText: {
    marginLeft: 12,
    fontSize: 15,
    fontWeight: "800",
    color: GREEN,
  },
});
