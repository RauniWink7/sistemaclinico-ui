import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { ThemeColors } from "../../constants/theme-palettes";
import { useTheme } from "../../contexts/ThemeContext";
import type { RecordEntryApiItem } from "../../services/api";
import {
  canAddAddendum,
  ENTRY_KIND_LABELS,
  formatDateTime,
  TimelineItem,
} from "../../services/anamnesis";

// Cartão de um item da linha do tempo do prontuário: o registro original, seus
// adendos em ordem cronológica e as ações que cabem ao estado dele —
// rascunho (editar / finalizar / descartar) ou finalizado (só adendo).

interface TimelineCardProps {
  item: TimelineItem;
  canWrite: boolean;
  onEdit: (entry: RecordEntryApiItem) => void;
  onFinalize: (entry: RecordEntryApiItem) => void;
  onDiscard: (entry: RecordEntryApiItem) => void;
  onOpenAnamnesis: (anamnesisId: string) => void;
  // Devolve true quando o adendo foi gravado (o cartão então limpa o campo).
  onAddendum: (item: TimelineItem, content: string) => Promise<boolean>;
}

export default function TimelineCard({
  item,
  canWrite,
  onEdit,
  onFinalize,
  onDiscard,
  onOpenAnamnesis,
  onAddendum,
}: TimelineCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [writing, setWriting] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const isAnamnesis = item.type === "anamnesis";
  const status = isAnamnesis ? item.anamnesis.status : item.entry.status;
  const isDraft = status === "draft";
  const kind = isAnamnesis ? undefined : item.entry.kind;

  const title = isAnamnesis
    ? `Anamnese — ${item.anamnesis.template_snapshot.title}`
    : ENTRY_KIND_LABELS[item.entry.kind];
  const author = isAnamnesis ? item.anamnesis.author_name : item.entry.author_name;

  const submitAddendum = async () => {
    const content = text.trim();
    if (!content) return;
    setSending(true);
    const ok = await onAddendum(item, content);
    setSending(false);
    if (ok) {
      setText("");
      setWriting(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{title}</Text>
        <View style={[styles.badge, isDraft && styles.badgeDraft]}>
          <Text style={[styles.badgeText, isDraft && styles.badgeTextDraft]}>
            {isDraft ? "Rascunho" : "Finalizado"}
          </Text>
        </View>
      </View>
      <Text style={styles.meta}>
        {formatDateTime(item.date)}
        {author ? ` · ${author}` : ""}
      </Text>

      {item.type === "entry" && (
        <>
          {!!item.entry.referral_to && (
            <Text style={styles.meta}>Destino: {item.entry.referral_to}</Text>
          )}
          <Text style={styles.content}>{item.entry.content}</Text>
        </>
      )}

      {item.addenda.map((addendum) => (
        <View key={addendum.id} style={styles.addendum}>
          <Text style={styles.addendumHead}>
            Adendo · {formatDateTime(addendum.occurred_at)}
            {addendum.author_name ? ` · ${addendum.author_name}` : ""}
          </Text>
          <Text style={styles.content}>{addendum.content}</Text>
        </View>
      ))}

      <View style={styles.actions}>
        {isAnamnesis && (
          <TouchableOpacity onPress={() => onOpenAnamnesis(item.anamnesis.id)}>
            <Text style={styles.action}>{isDraft ? "Continuar" : "Abrir"}</Text>
          </TouchableOpacity>
        )}

        {item.type === "entry" && isDraft && canWrite && (
          <>
            <TouchableOpacity onPress={() => onEdit(item.entry)}>
              <Text style={styles.action}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onFinalize(item.entry)}>
              <Text style={styles.action}>Finalizar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDiscard(item.entry)}>
              <Text style={styles.danger}>Descartar</Text>
            </TouchableOpacity>
          </>
        )}

        {canAddAddendum({ status, kind }, canWrite) && !writing && (
          <TouchableOpacity onPress={() => setWriting(true)}>
            <Text style={styles.action}>Adendo</Text>
          </TouchableOpacity>
        )}
      </View>

      {writing && (
        <View style={styles.addendumForm}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            editable={!sending}
            multiline
            textAlignVertical="top"
            placeholder="Escreva o adendo"
            placeholderTextColor={colors.placeholder}
          />
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => void submitAddendum()} disabled={sending}>
              <Text style={styles.action}>{sending ? "Enviando..." : "Registrar"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setWriting(false);
                setText("");
              }}
              disabled={sending}
            >
              <Text style={styles.danger}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.white,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 12,
    },
    titleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
    title: { color: colors.textDark, fontSize: 15, fontWeight: "800", flexShrink: 1 },
    badge: {
      backgroundColor: colors.primaryTint,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    badgeDraft: { backgroundColor: "#f6e7d8" },
    badgeText: { color: colors.primary, fontSize: 11, fontWeight: "700" },
    badgeTextDraft: { color: "#b66b37" },
    meta: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
    content: { color: colors.textDark, fontSize: 14, marginTop: 10, lineHeight: 20 },
    addendum: {
      marginTop: 12,
      paddingLeft: 12,
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
    },
    addendumHead: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
    actions: { flexDirection: "row", gap: 18, marginTop: 14, flexWrap: "wrap" },
    action: { color: colors.primary, fontSize: 13, fontWeight: "700" },
    danger: { color: "#b66b37", fontSize: 13, fontWeight: "700" },
    addendumForm: { marginTop: 4 },
    input: {
      minHeight: 80,
      marginTop: 10,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.white,
      padding: 12,
      fontSize: 14,
      color: colors.textDark,
    },
  });
