import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ScreenShell from "../../components/anamnesis/ScreenShell";
import { ThemeColors } from "../../constants/theme-palettes";
import { useTheme } from "../../contexts/ThemeContext";
import {
  AnamnesisTemplateApiItem,
  duplicateAnamnesisTemplate,
  getAnamnesisTemplates,
  updateAnamnesisTemplate,
} from "../../services/api";
import { showAlert, showConfirm } from "../../services/feedback";

type Tab = "ativos" | "arquivados";

const openTemplate = (id: string) =>
  router.push({ pathname: "/modelo-anamnese/[id]", params: { id } } as any);

export default function AnamnesisTemplatesScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [tab, setTab] = useState<Tab>("ativos");
  const [templates, setTemplates] = useState<AnamnesisTemplateApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (current: Tab) => {
    setLoading(true);
    const result = await getAnamnesisTemplates({ archived: current === "arquivados" });
    if (result.ok) {
      setTemplates(result.data ?? []);
    } else {
      setTemplates([]);
      showAlert("Erro", result.error || "Não foi possível carregar os modelos.");
    }
    setLoading(false);
  }, []);

  // Recarrega ao voltar do editor, para refletir o que foi criado/alterado.
  useFocusEffect(
    useCallback(() => {
      void load(tab);
    }, [load, tab]),
  );

  const duplicate = async (template: AnamnesisTemplateApiItem) => {
    setBusyId(template.id);
    const result = await duplicateAnamnesisTemplate(template.id);
    setBusyId(null);
    if (result.ok && result.data) {
      showAlert("Sucesso", "Modelo duplicado. Você pode editar a cópia.");
      openTemplate(result.data.id);
    } else {
      showAlert("Erro", result.error || "Não foi possível duplicar o modelo.");
    }
  };

  const setArchived = (template: AnamnesisTemplateApiItem, archived: boolean) => {
    const apply = async () => {
      setBusyId(template.id);
      const result = await updateAnamnesisTemplate(template.id, {
        is_archived: archived,
      });
      setBusyId(null);
      if (result.ok) {
        setTemplates((list) => list.filter((item) => item.id !== template.id));
      } else {
        showAlert("Erro", result.error || "Não foi possível atualizar o modelo.");
      }
    };

    if (!archived) {
      void apply();
      return;
    }
    showConfirm({
      title: "Arquivar modelo",
      message:
        "O modelo deixa de aparecer ao aplicar anamneses. As anamneses já preenchidas não mudam.",
      confirmText: "Arquivar",
      onConfirm: () => void apply(),
    });
  };

  return (
    <ScreenShell
      title="Modelos de anamnese"
      subtitle="Crie e organize os seus modelos"
      action={{
        icon: "add-outline",
        label: "Novo modelo",
        onPress: () => openTemplate("novo"),
      }}
    >
      <View style={styles.tabs}>
        {(["ativos", "arquivados"] as Tab[]).map((item) => (
          <TouchableOpacity
            key={item}
            style={[styles.tab, tab === item && styles.tabActive]}
            onPress={() => setTab(item)}
            accessibilityState={{ selected: tab === item }}
          >
            <Text style={[styles.tabText, tab === item && styles.tabTextActive]}>
              {item === "ativos" ? "Ativos" : "Arquivados"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : templates.length === 0 ? (
        <Text style={styles.empty}>
          {tab === "ativos"
            ? "Nenhum modelo por aqui. Toque em + para criar o primeiro."
            : "Nenhum modelo arquivado."}
        </Text>
      ) : (
        templates.map((template) => {
          const busy = busyId === template.id;
          return (
            <View key={template.id} style={styles.card}>
              <TouchableOpacity
                style={styles.cardMain}
                onPress={() => openTemplate(template.id)}
                activeOpacity={0.85}
              >
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardTitle}>{template.title}</Text>
                  {template.is_system_default && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Padrão</Text>
                    </View>
                  )}
                </View>
                {!!template.description && (
                  <Text style={styles.cardDescription} numberOfLines={2}>
                    {template.description}
                  </Text>
                )}
                <Text style={styles.cardMeta}>
                  {template.questions.length}{" "}
                  {template.questions.length === 1 ? "pergunta" : "perguntas"}
                </Text>
              </TouchableOpacity>

              <View style={styles.actions}>
                {busy ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => void duplicate(template)}
                      accessibilityLabel="Duplicar modelo"
                    >
                      <Ionicons name="copy-outline" size={18} color={colors.primary} />
                      <Text style={styles.actionText}>Duplicar</Text>
                    </TouchableOpacity>
                    {/* O modelo padrão é somente leitura: só duplica. */}
                    {!template.is_system_default && (
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => setArchived(template, !template.is_archived)}
                        accessibilityLabel={
                          template.is_archived ? "Restaurar modelo" : "Arquivar modelo"
                        }
                      >
                        <Ionicons
                          name={
                            template.is_archived
                              ? "arrow-undo-outline"
                              : "archive-outline"
                          }
                          size={18}
                          color={colors.primary}
                        />
                        <Text style={styles.actionText}>
                          {template.is_archived ? "Restaurar" : "Arquivar"}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            </View>
          );
        })
      )}
    </ScreenShell>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    tabs: { flexDirection: "row", gap: 8, marginBottom: 14 },
    tab: {
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.white,
    },
    tabActive: { backgroundColor: colors.primaryTint, borderColor: colors.primary },
    tabText: { color: colors.textDark, fontSize: 14 },
    tabTextActive: { color: colors.primary, fontWeight: "700" },
    center: { paddingVertical: 48, alignItems: "center" },
    empty: { color: colors.textMuted, fontSize: 14, textAlign: "center", paddingVertical: 32 },
    card: {
      backgroundColor: colors.white,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
      overflow: "hidden",
    },
    cardMain: { padding: 16 },
    cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
    cardTitle: { color: colors.textDark, fontSize: 16, fontWeight: "800", flexShrink: 1 },
    badge: {
      backgroundColor: colors.primaryTint,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    badgeText: { color: colors.primary, fontSize: 11, fontWeight: "700" },
    cardDescription: { color: colors.textMuted, fontSize: 13, marginTop: 6 },
    cardMeta: { color: colors.textMuted, fontSize: 12, marginTop: 8, fontWeight: "600" },
    actions: {
      flexDirection: "row",
      gap: 18,
      paddingHorizontal: 16,
      paddingVertical: 11,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      minHeight: 46,
      alignItems: "center",
    },
    actionBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
    actionText: { color: colors.primary, fontSize: 13, fontWeight: "700" },
  });
