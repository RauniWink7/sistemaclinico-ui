import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ScreenShell from "../../../components/anamnesis/ScreenShell";
import { ThemeColors } from "../../../constants/theme-palettes";
import { useTheme } from "../../../contexts/ThemeContext";
import {
  getPsychologists,
  getRecordAccessLog,
  getRecordGrants,
  grantRecordAccess,
  ProfessionalApiItem,
  RecordAccessGrantApiItem,
  RecordAccessLogItem,
  revokeRecordAccess,
} from "../../../services/api";
import { formatDateTime } from "../../../services/anamnesis";
import {
  availableGrantees,
  describeAccessAction,
  describeGrantLevel,
  splitGrants,
} from "../../../services/recordAccess";
import { showAlert, showConfirm } from "../../../services/feedback";

// Tela do psicólogo responsável: quem tem acesso ao prontuário, concessão e
// revogação de autorizações (mesma clínica) e o log de quem acessou.
// `responsibleId` (ProfessionalProfile.id) vem da tela do prontuário.

export default function RecordAccessScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { recordId, responsibleId } = useLocalSearchParams<{
    recordId: string;
    responsibleId?: string;
  }>();

  const [grants, setGrants] = useState<RecordAccessGrantApiItem[]>([]);
  const [professionals, setProfessionals] = useState<ProfessionalApiItem[]>([]);
  const [log, setLog] = useState<RecordAccessLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [canWrite, setCanWrite] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [grantsResult, professionalsResult, logResult] = await Promise.all([
      getRecordGrants(recordId),
      getPsychologists(),
      getRecordAccessLog(recordId),
    ]);
    if (!grantsResult.ok) {
      // Só o responsável acessa esta tela; os demais recebem 404.
      setError(grantsResult.error || "Não foi possível carregar as autorizações.");
    } else {
      setError(null);
      setGrants(grantsResult.data ?? []);
    }
    if (professionalsResult.ok) setProfessionals(professionalsResult.data ?? []);
    if (logResult.ok) setLog(logResult.data ?? []);
    setLoading(false);
  }, [recordId]);

  useEffect(() => {
    void load();
  }, [load]);

  const { active, revoked } = useMemo(() => splitGrants(grants), [grants]);
  const candidates = useMemo(
    () => availableGrantees(professionals, grants, responsibleId),
    [professionals, grants, responsibleId],
  );
  const nameOf = (id: string) =>
    professionals.find((p) => p.id === id)?.user.full_name ?? "Psicólogo";

  const grant = async () => {
    if (!selected) {
      showAlert("Atenção", "Escolha o psicólogo que receberá o acesso.");
      return;
    }
    setBusy(true);
    const result = await grantRecordAccess(recordId, { grantee: selected, can_write: canWrite });
    setBusy(false);
    if (result.ok) {
      setSelected(null);
      setCanWrite(false);
      showAlert("Sucesso", "Acesso autorizado.");
      await load();
    } else {
      showAlert("Erro", result.error || "Não foi possível autorizar.");
    }
  };

  const revoke = (item: RecordAccessGrantApiItem) =>
    showConfirm({
      title: "Revogar acesso",
      message: `${item.grantee_name ?? nameOf(item.grantee)} perde o acesso ao prontuário. O histórico da autorização é mantido.`,
      confirmText: "Revogar",
      destructive: true,
      onConfirm: async () => {
        const result = await revokeRecordAccess(recordId, item.id);
        if (result.ok) await load();
        else showAlert("Erro", result.error || "Não foi possível revogar.");
      },
    });

  return (
    <ScreenShell title="Acessos ao prontuário" subtitle="Autorizações e histórico">
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <Text style={styles.empty}>{error}</Text>
      ) : (
        <>
          <Text style={styles.sectionTitle}>Quem tem acesso</Text>
          <Text style={styles.hint}>
            Você, como responsável, sempre tem acesso. Administração e recepção veem apenas que o
            prontuário existe, nunca o conteúdo.
          </Text>
          {active.length === 0 ? (
            <Text style={styles.empty}>Nenhum outro psicólogo autorizado.</Text>
          ) : (
            active.map((item) => (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{item.grantee_name ?? nameOf(item.grantee)}</Text>
                  <Text style={styles.meta}>
                    {describeGrantLevel(item)} · desde {formatDateTime(item.granted_at)}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => revoke(item)}>
                  <Text style={styles.danger}>Revogar</Text>
                </TouchableOpacity>
              </View>
            ))
          )}

          <Text style={styles.sectionTitle}>Autorizar psicólogo</Text>
          {candidates.length === 0 ? (
            <Text style={styles.empty}>Nenhum psicólogo disponível na clínica.</Text>
          ) : (
            <>
              <View style={styles.chips}>
                {candidates.map((professional) => {
                  const on = selected === professional.id;
                  return (
                    <TouchableOpacity
                      key={professional.id}
                      style={[styles.chip, on && styles.chipActive]}
                      onPress={() => setSelected(on ? null : professional.id)}
                      accessibilityState={{ selected: on }}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextActive]}>
                        {professional.user.full_name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Permitir também escrever no prontuário</Text>
                <Switch
                  value={canWrite}
                  onValueChange={setCanWrite}
                  trackColor={{ true: colors.primary }}
                />
              </View>
              <TouchableOpacity
                style={[styles.primaryBtn, (busy || !selected) && styles.off]}
                onPress={() => void grant()}
                disabled={busy || !selected}
              >
                {busy ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.primaryBtnText}>Autorizar acesso</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {revoked.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Autorizações revogadas</Text>
              {revoked.map((item) => (
                <View key={item.id} style={styles.card}>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle}>
                      {item.grantee_name ?? nameOf(item.grantee)}
                    </Text>
                    <Text style={styles.meta}>
                      {describeGrantLevel(item)} · revogada em {formatDateTime(item.revoked_at)}
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}

          <Text style={styles.sectionTitle}>Quem acessou</Text>
          {log.length === 0 ? (
            <Text style={styles.empty}>Nenhum acesso registrado.</Text>
          ) : (
            log.map((entry) => (
              <View key={entry.id} style={styles.logRow}>
                <Text style={styles.logAction}>{describeAccessAction(entry.action)}</Text>
                <Text style={styles.meta}>
                  {entry.actor_name ?? "—"} · {formatDateTime(entry.created_at)}
                </Text>
              </View>
            ))
          )}
        </>
      )}
    </ScreenShell>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    center: { paddingVertical: 48, alignItems: "center" },
    empty: { color: colors.textMuted, fontSize: 14, textAlign: "center", paddingVertical: 20 },
    sectionTitle: { color: colors.textDark, fontSize: 18, fontWeight: "800", marginTop: 24, marginBottom: 8 },
    hint: { color: colors.textMuted, fontSize: 13, marginBottom: 10 },
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: colors.white,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 10,
    },
    cardBody: { flex: 1 },
    cardTitle: { color: colors.textDark, fontSize: 15, fontWeight: "800" },
    meta: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
    danger: { color: "#b66b37", fontSize: 13, fontWeight: "700" },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: colors.white,
    },
    chipActive: { backgroundColor: colors.primaryTint, borderColor: colors.primary },
    chipText: { color: colors.textDark, fontSize: 14 },
    chipTextActive: { color: colors.primary, fontWeight: "700" },
    switchRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      marginTop: 16,
    },
    switchLabel: { color: colors.textDark, fontSize: 14, fontWeight: "600", flex: 1 },
    primaryBtn: {
      marginTop: 16,
      paddingVertical: 15,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: "center",
    },
    primaryBtnText: { color: colors.white, fontSize: 15, fontWeight: "800" },
    off: { opacity: 0.5 },
    logRow: {
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    logAction: { color: colors.textDark, fontSize: 14, fontWeight: "600" },
  });
