import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getMe, isPushEnabled, logout, unregisterDeviceToken } from "../../services/api";
import { showConfirm, showToast } from "../../services/feedback";
import { registerForPushNotifications } from "../../services/push";

// ─── Tema (mesmo do restante do app) ──────────────────────────────────────────
const GREEN = "#2e8b6e";
const GREEN_LIGHT = "#e8f7f1";
const PAGE_BG = "#e8f1ec";
const WHITE = "#ffffff";
const BORDER = "#dfece5";
const TEXT_DARK = "#173d31";
const MUTED = "#6c8c80";
const DANGER = "#c0392b";
const MAX_WIDTH = 720;

// E-mail de suporte (placeholder até a clínica definir o oficial).
const SUPPORT_EMAIL = "suporte@clinica.com.br";

const CARD_SHADOW = {
  shadowColor: "#1f5442",
  shadowOpacity: 0.05,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
} as const;

const isWeb = Platform.OS === "web";

export default function SettingsScreen() {
  const [role, setRole] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  const appVersion =
    (Constants.expoConfig as any)?.version ??
    (Constants as any)?.manifest?.version ??
    "1.0.0";

  useEffect(() => {
    const init = async () => {
      const me = await getMe();
      if (me.ok && me.data?.role) setRole(String(me.data.role).toLowerCase());
      if (!isWeb) setPushOn(await isPushEnabled());
      setLoading(false);
    };
    void init();
  }, []);

  // Rota da tela de perfil conforme o papel. Admin não tem perfil editável.
  const profileRoute =
    role === "patient"
      ? "/(patient)/perfil"
      : role === "professional" || role === "psychologist"
        ? "/(psychologist)/perfilP"
        : null;

  const handleTogglePush = async (next: boolean) => {
    setPushBusy(true);
    if (next) {
      const token = await registerForPushNotifications();
      if (token) {
        setPushOn(true);
        showToast("Notificações push ativadas.", "success");
      } else {
        setPushOn(false);
        showToast("Não foi possível ativar. Verifique a permissão do sistema.", "error");
      }
    } else {
      await unregisterDeviceToken();
      setPushOn(false);
      showToast("Notificações push desativadas.", "info");
    }
    setPushBusy(false);
  };

  const handleLogout = () => {
    showConfirm({
      title: "Deseja sair da sua conta?",
      message: "Você será desconectado e precisará fazer login novamente.",
      confirmText: "Sair",
      destructive: true,
      onConfirm: async () => {
        try {
          await logout();
        } finally {
          router.replace("/login");
        }
      },
    });
  };

  const openSupportEmail = () => {
    Linking.openURL(
      `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Suporte - Sistema Clínico")}`,
    ).catch(() => showToast("Não foi possível abrir o app de e-mail.", "error"));
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN} />

      <View style={styles.header}>
        <View style={styles.headerInner}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back-outline" size={22} color={WHITE} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Configurações</Text>
          <View style={styles.iconBtn} />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GREEN} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* ── Conta ── */}
          <Text style={styles.sectionTitle}>Conta</Text>
          <View style={styles.card}>
            {profileRoute && (
              <Row
                icon="person-outline"
                label="Editar perfil"
                onPress={() => router.push(profileRoute as any)}
              />
            )}
            <Row
              icon="lock-closed-outline"
              label="Alterar senha"
              onPress={() => router.push("/(shared)/alterar-senha" as any)}
              last={false}
            />
            <Row
              icon="log-out-outline"
              label="Sair"
              danger
              onPress={handleLogout}
              hideChevron
              last
            />
          </View>

          {/* ── Notificações ── */}
          <Text style={styles.sectionTitle}>Notificações</Text>
          <View style={styles.card}>
            <View style={[styles.row, styles.rowLast]}>
              <View style={[styles.rowIcon, { backgroundColor: GREEN_LIGHT }]}>
                <Ionicons name="notifications-outline" size={19} color={GREEN} />
              </View>
              <View style={styles.rowTextBox}>
                <Text style={styles.rowLabel}>Notificações push</Text>
                {isWeb ? (
                  <Text style={styles.rowHint}>Disponível apenas no app para celular.</Text>
                ) : (
                  <Text style={styles.rowHint}>
                    Avisos de consultas e mensagens neste aparelho.
                  </Text>
                )}
              </View>
              {isWeb ? (
                <Text style={styles.badge}>Mobile</Text>
              ) : pushBusy ? (
                <ActivityIndicator color={GREEN} />
              ) : (
                <Switch
                  value={pushOn}
                  onValueChange={handleTogglePush}
                  trackColor={{ false: "#cfe3d9", true: GREEN }}
                  thumbColor={WHITE}
                />
              )}
            </View>
          </View>

          {/* ── Privacidade e Termos ── */}
          <Text style={styles.sectionTitle}>Privacidade e Termos</Text>
          <View style={styles.card}>
            <Row
              icon="document-text-outline"
              label="Termos de Uso"
              onPress={() => router.push("/(shared)/termos" as any)}
            />
            <Row
              icon="shield-checkmark-outline"
              label="Política de Privacidade"
              onPress={() => router.push("/(shared)/privacidade" as any)}
              last
            />
          </View>

          {/* ── Sobre ── */}
          <Text style={styles.sectionTitle}>Sobre</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: GREEN_LIGHT }]}>
                <Ionicons name="information-circle-outline" size={19} color={GREEN} />
              </View>
              <View style={styles.rowTextBox}>
                <Text style={styles.rowLabel}>Versão do app</Text>
              </View>
              <Text style={styles.rowValue}>{appVersion}</Text>
            </View>
            <Row
              icon="mail-outline"
              label="Contato e suporte"
              onPress={openSupportEmail}
              last
            />
          </View>

          <Text style={styles.footer}>Sistema Clínico • {SUPPORT_EMAIL}</Text>
        </ScrollView>
      )}
    </View>
  );
}

// ─── Linha de opção reutilizável ──────────────────────────────────────────────
const Row = ({
  icon,
  label,
  onPress,
  danger,
  hideChevron,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
  hideChevron?: boolean;
  last?: boolean;
}) => (
  <TouchableOpacity
    style={[styles.row, last && styles.rowLast]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[styles.rowIcon, { backgroundColor: danger ? "#fbeae8" : GREEN_LIGHT }]}>
      <Ionicons name={icon} size={19} color={danger ? DANGER : GREEN} />
    </View>
    <View style={styles.rowTextBox}>
      <Text style={[styles.rowLabel, danger && { color: DANGER }]}>{label}</Text>
    </View>
    {!hideChevron && <Ionicons name="chevron-forward" size={18} color="#b5cabf" />}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PAGE_BG },
  header: { backgroundColor: GREEN, paddingTop: 52, paddingBottom: 20 },
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
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: WHITE, fontSize: 21, fontWeight: "800", letterSpacing: -0.3 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 44,
    maxWidth: MAX_WIDTH,
    alignSelf: "center" as const,
    width: "100%" as const,
  },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 10,
    marginTop: 18,
    marginLeft: 4,
  },
  card: {
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
    ...CARD_SHADOW,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  rowLast: { borderBottomWidth: 0 },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTextBox: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: "700", color: TEXT_DARK },
  rowHint: { fontSize: 12, color: MUTED, marginTop: 2, fontWeight: "500" },
  rowValue: { fontSize: 14, color: MUTED, fontWeight: "700" },
  badge: {
    fontSize: 11,
    fontWeight: "800",
    color: GREEN,
    backgroundColor: GREEN_LIGHT,
    overflow: "hidden",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  footer: {
    textAlign: "center",
    color: "#9db8ac",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 26,
  },
});
