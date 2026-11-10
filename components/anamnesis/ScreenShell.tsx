import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ThemeColors } from "../../constants/theme-palettes";
import { useTheme } from "../../contexts/ThemeContext";

// Moldura das telas de anamnese/prontuário: cabeçalho verde com botão de
// voltar (mesmo visual das telas do psicólogo) e conteúdo rolável. Evita
// repetir ~40 linhas de estilo em cada tela nova.

interface ScreenShellProps {
  title: string;
  subtitle?: string;
  // Ação opcional no canto direito do cabeçalho.
  action?: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void };
  children: React.ReactNode;
}

export default function ScreenShell({
  title,
  subtitle,
  action,
  children,
}: ScreenShellProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <View style={styles.header}>
        <View style={styles.headerInner}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.back()}
            accessibilityLabel="Voltar"
          >
            <Ionicons name="arrow-back-outline" size={22} color={colors.white} />
          </TouchableOpacity>
          <View style={styles.headerTextBox}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title}
            </Text>
            {!!subtitle && (
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
          {action && (
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={action.onPress}
              accessibilityLabel={action.label}
            >
              <Ionicons name={action.icon} size={22} color={colors.white} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.pageBg },
    header: { backgroundColor: colors.primary, paddingTop: 52, paddingBottom: 20 },
    headerInner: {
      width: "100%",
      maxWidth: 1120,
      alignSelf: "center",
      paddingHorizontal: 20,
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },
    iconBtn: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: "rgba(255,255,255,0.14)",
      alignItems: "center",
      justifyContent: "center",
    },
    headerTextBox: { flex: 1 },
    headerTitle: { color: colors.white, fontSize: 21, fontWeight: "800", letterSpacing: -0.3 },
    headerSubtitle: { color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 2 },
    scroll: { flex: 1 },
    scrollContent: {
      width: "100%",
      maxWidth: 1120,
      alignSelf: "center",
      padding: 20,
      paddingBottom: 48,
    },
  });
