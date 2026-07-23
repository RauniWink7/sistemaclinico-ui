import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const GREEN = "#2e8b6e";
const GREEN_LIGHT = "#e8f7f1";
const PAGE_BG = "#e8f1ec";
const WHITE = "#ffffff";
const BORDER = "#dfece5";
const TEXT_DARK = "#173d31";
const MUTED = "#6c8c80";
const MAX_WIDTH = 760;

export default function TermsScreen() {
  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN} />

      <View style={styles.header}>
        <View style={styles.headerInner}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back-outline" size={22} color={WHITE} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Termos de Uso</Text>
          <View style={styles.iconBtn} />
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.docIcon}>
            <Ionicons name="document-text-outline" size={24} color={GREEN} />
          </View>
          <Text style={styles.title}>Termos de Uso</Text>
          <Text style={styles.notice}>
            Conteúdo em elaboração. Esta seção receberá os Termos de Uso oficiais
            do sistema.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

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
    paddingTop: 24,
    paddingBottom: 44,
    maxWidth: MAX_WIDTH,
    alignSelf: "center" as const,
    width: "100%" as const,
  },
  card: {
    backgroundColor: WHITE,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 24,
  },
  docIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: GREEN_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: { fontSize: 22, fontWeight: "800", color: TEXT_DARK, marginBottom: 10 },
  notice: { fontSize: 14, lineHeight: 21, color: MUTED, fontWeight: "500" },
});
