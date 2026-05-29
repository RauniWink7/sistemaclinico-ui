import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    KeyboardAvoidingView,
    KeyboardTypeOptions,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { getClinics, register } from "../../services/api";

// ─── Decorative Background ───────────────────────────────────────────────────
const DecorativeBackground = () => (
  <>
    <View style={styles.circle1} />
    <View style={styles.circle2} />
    <View style={styles.circle3} />
  </>
);

// ─── FloatingInput Types ─────────────────────────────────────────────────────
interface FloatingInputProps {
  label: string;
  value: string;
  onChangeText: (val: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  error?: string;
  optional?: boolean;
  rightIcon?: string;
  onRightIconPress?: () => void;
}

// ─── Floating Label Input ────────────────────────────────────────────────────
const FloatingInput = ({
  label,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  error,
  optional,
  rightIcon,
  onRightIconPress,
}: FloatingInputProps) => {
  const [focused, setFocused] = useState(false);
  const animatedLabel = useRef(new Animated.Value(value ? 1 : 0)).current;

  const handleFocus = () => {
    setFocused(true);
    Animated.timing(animatedLabel, {
      toValue: 1,
      duration: 180,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    setFocused(false);
    if (!value) {
      Animated.timing(animatedLabel, {
        toValue: 0,
        duration: 180,
        useNativeDriver: false,
      }).start();
    }
  };

  const labelTop = animatedLabel.interpolate({
    inputRange: [0, 1],
    outputRange: [17, 4],
  });
  const labelSize = animatedLabel.interpolate({
    inputRange: [0, 1],
    outputRange: [15, 11],
  });
  const labelColor = animatedLabel.interpolate({
    inputRange: [0, 1],
    outputRange: [
      "#9bbfb0",
      error ? "#e05c5c" : focused ? "#2e8b6e" : "#5aab8a",
    ],
  });

  return (
    <View style={styles.inputWrapper}>
      <View
        style={[
          styles.inputContainer,
          focused && styles.inputContainerFocused,
          !!error && styles.inputContainerError,
        ]}
      >
        <Animated.Text
          style={[
            styles.floatingLabel,
            { top: labelTop, fontSize: labelSize, color: labelColor },
          ]}
        >
          {label}
          {optional && <Text style={styles.optionalTag}> (opcional)</Text>}
        </Animated.Text>
        <TextInput
          style={styles.textInput}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType ?? "default"}
          autoCapitalize={autoCapitalize ?? "none"}
          placeholderTextColor="transparent"
        />
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} style={styles.eyeBtn}>
            <Ionicons name={rightIcon as any} size={20} color="#6b9e8a" />
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

// ─── Form & Error Types ───────────────────────────────────────────────────────
interface FormState {
  nome: string;
  email: string;
  senha: string;
  confirmarSenha: string;
  telefone: string;
}

interface ClinicItem {
  id: string;
  name: string;
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function RegisterScreen() {
  const [form, setForm] = useState<FormState>({
    nome: "",
    email: "",
    senha: "",
    confirmarSenha: "",
    telefone: "",
  });
  const [clinics, setClinics] = useState<ClinicItem[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState("");
  const [clinicsLoading, setClinicsLoading] = useState(true);
  const [clinicModalVisible, setClinicModalVisible] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [success, setSuccess] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const set = (field: keyof FormState) => (val: string) => {
    setForm((prev) => ({ ...prev, [field]: val }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
    setApiError("");
  };

  const selectedClinic = clinics.find(
    (clinic) => clinic.id === selectedClinicId,
  );

  useEffect(() => {
    const loadClinics = async () => {
      setClinicsLoading(true);
      try {
        const result = await getClinics();
        console.log("getClinics result:", result);
        if (result.ok && Array.isArray(result.data)) {
          setClinics(result.data);
        } else {
          Alert.alert(
            "Erro ao carregar clínicas",
            result.error || "Não foi possível carregar as clínicas.",
          );
        }
      } catch (error) {
        console.error("Error loading clinics:", error);
        Alert.alert("Erro", "Erro ao conectar com o servidor.");
      }
      setClinicsLoading(false);
    };

    void loadClinics();
  }, []);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!selectedClinicId) newErrors.clinic = "Selecione a clínica.";
    if (!form.nome.trim()) newErrors.nome = "Nome completo é obrigatório.";
    if (!form.email.trim()) {
      newErrors.email = "E-mail é obrigatório.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Insira um e-mail válido.";
    }
    if (!form.senha) {
      newErrors.senha = "Senha é obrigatória.";
    } else if (form.senha.length < 8) {
      newErrors.senha = "A senha deve ter no mínimo 8 caracteres.";
    }
    if (!form.confirmarSenha) {
      newErrors.confirmarSenha = "Confirmação de senha é obrigatória.";
    } else if (form.senha !== form.confirmarSenha) {
      newErrors.confirmarSenha = "As senhas não coincidem.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCadastrar = async (): Promise<void> => {
    if (!validate()) return;
    setLoading(true);
    setApiError("");
    try {
      // ⚠️ IMPORTANTE: Este é um cadastro PÚBLICO para pacientes
      // O backend valida que a clínica selecionada é válida
      const result = await register({
        full_name: form.nome.trim(),
        email: form.email.trim(),
        password: form.senha,
        phone: form.telefone.trim() || undefined,
        clinic: selectedClinicId, // UUID obrigatório
        role: "patient", // Opcional — define a role como paciente
      });

      if (!result.ok) {
        setApiError(result.error || "Erro ao realizar cadastro.");
      } else {
        setSuccess(true);
      }
    } catch {
      setApiError("Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={styles.successContainer}>
        <DecorativeBackground />
        <View style={styles.successCard}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={36} color={GREEN} />
          </View>
          <Text style={styles.successTitle}>Cadastro realizado!</Text>
          <Text style={styles.successSubtitle}>
            Sua conta foi criada com sucesso. Faça login para continuar.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.replace("/login")}
          >
            <Text style={styles.primaryBtnText}>Ir para o Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#f0faf5" />
      <DecorativeBackground />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <Animated.View
            style={[
              styles.header,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.logoMark}>
              <Ionicons name="leaf-outline" size={26} color="#fff" />
            </View>
            <Text style={styles.appName}>Uni3 Clinic Management</Text>
            <Text style={styles.headerTitle}>Criar conta</Text>
            <Text style={styles.headerSubtitle}>
              Preencha os dados abaixo para se cadastrar
            </Text>
          </Animated.View>

          {/* Card */}
          <Animated.View
            style={[
              styles.card,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <FloatingInput
              label="Nome completo"
              value={form.nome}
              onChangeText={set("nome")}
              autoCapitalize="words"
              error={errors.nome}
            />
            <FloatingInput
              label="E-mail"
              value={form.email}
              onChangeText={set("email")}
              keyboardType="email-address"
              error={errors.email}
            />
            <TouchableOpacity
              style={[
                styles.clinicPicker,
                errors.clinic && styles.inputContainerError,
                clinics.length === 0 &&
                  !clinicsLoading &&
                  styles.clinicPickerDisabled,
              ]}
              onPress={() => clinics.length > 0 && setClinicModalVisible(true)}
              activeOpacity={0.8}
              disabled={clinics.length === 0 && !clinicsLoading}
            >
              <Text
                style={[
                  styles.clinicPickerText,
                  !selectedClinic && styles.clinicPickerPlaceholder,
                ]}
              >
                {selectedClinic
                  ? selectedClinic.name
                  : clinicsLoading
                    ? "Carregando clínicas..."
                    : clinics.length === 0
                      ? "Nenhuma clínica disponível"
                      : "Selecione a clínica"}
              </Text>
              <Ionicons name="chevron-down-outline" size={20} color="#5aab8a" />
            </TouchableOpacity>
            {errors.clinic ? (
              <Text style={styles.errorText}>{errors.clinic}</Text>
            ) : null}
            <FloatingInput
              label="Senha"
              value={form.senha}
              onChangeText={set("senha")}
              secureTextEntry={!showSenha}
              error={errors.senha}
              rightIcon={showSenha ? "eye-off-outline" : "eye-outline"}
              onRightIconPress={() => setShowSenha((v) => !v)}
            />
            <FloatingInput
              label="Confirmação de senha"
              value={form.confirmarSenha}
              onChangeText={set("confirmarSenha")}
              secureTextEntry={!showConfirmar}
              error={errors.confirmarSenha}
              rightIcon={showConfirmar ? "eye-off-outline" : "eye-outline"}
              onRightIconPress={() => setShowConfirmar((v) => !v)}
            />
            <FloatingInput
              label="Telefone"
              value={form.telefone}
              onChangeText={set("telefone")}
              keyboardType="phone-pad"
              optional
            />

            {/* Strength indicator */}
            {form.senha.length > 0 && (
              <View style={styles.strengthRow}>
                {[1, 2, 3, 4].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.strengthBar,
                      {
                        backgroundColor:
                          form.senha.length >= i * 2
                            ? i <= 1
                              ? "#e07b5c"
                              : i === 2
                                ? "#e0c05c"
                                : "#5aab8a"
                            : "#ddeee8",
                      },
                    ]}
                  />
                ))}
                <Text style={styles.strengthLabel}>
                  {form.senha.length < 4
                    ? "Fraca"
                    : form.senha.length < 6
                      ? "Razoável"
                      : form.senha.length < 8
                        ? "Boa"
                        : "Forte"}
                </Text>
              </View>
            )}

            {/* API Error */}
            {apiError ? (
              <View style={styles.apiErrorBox}>
                <Text style={styles.apiErrorText}>⚠️ {apiError}</Text>
              </View>
            ) : null}

            {/* Submit */}
            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
              onPress={handleCadastrar}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Cadastrar</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Login link */}
            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => router.push("/login")}
            >
              <Text style={styles.loginLinkText}>
                Já tem uma conta?{" "}
                <Text style={styles.loginLinkBold}>Entrar</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>

          <Text style={styles.footer}>
            Ao se cadastrar, você concorda com nossos{" "}
            <Text style={styles.footerLink}>Termos de Uso</Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={clinicModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setClinicModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Selecione a clínica</Text>
            <ScrollView style={styles.modalList}>
              {clinicsLoading ? (
                <Text style={styles.modalLoadingText}>
                  Carregando clínicas...
                </Text>
              ) : clinics.length === 0 ? (
                <Text style={styles.modalNoDataText}>
                  Nenhuma clínica disponível
                </Text>
              ) : (
                clinics.map((clinic) => (
                  <TouchableOpacity
                    key={clinic.id}
                    style={styles.modalItem}
                    onPress={() => {
                      setSelectedClinicId(clinic.id);
                      setClinicModalVisible(false);
                      setErrors((prev) => ({ ...prev, clinic: "" }));
                    }}
                  >
                    <Text style={styles.modalItemText}>{clinic.name}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setClinicModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const GREEN = "#2e8b6e";
const GREEN_LIGHT = "#5aab8a";
const GREEN_PALE = "#e8f7f1";
const GREEN_BG = "#f0faf5";
const WHITE = "#ffffff";

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: GREEN_BG,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },

  // Decorative
  circle1: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "#c8eedd",
    opacity: 0.45,
    top: -80,
    right: -80,
  },
  circle2: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#a8dfc8",
    opacity: 0.3,
    bottom: 80,
    left: -50,
  },
  circle3: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#2e8b6e",
    opacity: 0.08,
    top: 200,
    left: 20,
  },

  // Header
  header: {
    alignItems: "center",
    marginBottom: 28,
  },
  logoMark: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  appName: {
    fontSize: 12,
    fontWeight: "700",
    color: GREEN_LIGHT,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 8,
    textAlign: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1a3d31",
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6b9e8a",
    textAlign: "center",
  },

  // Card
  card: {
    backgroundColor: WHITE,
    borderRadius: 24,
    padding: 24,
    maxWidth: 480,
    alignSelf: 'center' as const,
    width: '100%' as const,
    shadowColor: "#2e8b6e",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 6,
  },

  // Input
  inputWrapper: {
    marginBottom: 14,
  },
  inputContainer: {
    height: 58,
    borderWidth: 1.5,
    borderColor: "#d4ede3",
    borderRadius: 14,
    backgroundColor: "#fafffe",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 8,
    position: "relative",
  },
  inputContainerFocused: {
    borderColor: GREEN,
    backgroundColor: WHITE,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  inputContainerError: {
    borderColor: "#e05c5c",
    backgroundColor: "#fff8f8",
  },
  clinicPicker: {
    height: 58,
    borderWidth: 1.5,
    borderColor: "#d4ede3",
    borderRadius: 14,
    backgroundColor: "#fafffe",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  clinicPickerText: {
    fontSize: 15,
    color: "#1a3d31",
    fontWeight: "500",
  },
  clinicPickerPlaceholder: {
    color: "#9bbfb0",
  },
  clinicPickerDisabled: {
    opacity: 0.6,
  },
  floatingLabel: {
    position: "absolute",
    left: 16,
    fontWeight: "500",
  },
  optionalTag: {
    fontSize: 10,
    color: "#b0cfc4",
  },
  textInput: {
    fontSize: 15,
    color: "#1a3d31",
    fontWeight: "500",
    paddingRight: 36,
  },
  eyeBtn: {
    position: "absolute",
    right: 12,
    top: 16,
    padding: 4,
  },
  errorText: {
    fontSize: 12,
    color: "#e05c5c",
    marginTop: 4,
    marginLeft: 4,
  },

  // Password strength
  strengthRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    marginTop: -4,
    gap: 4,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 11,
    color: "#6b9e8a",
    marginLeft: 6,
    width: 46,
    fontWeight: "600",
  },

  // API Error
  apiErrorBox: {
    backgroundColor: "#fff1f1",
    borderWidth: 1,
    borderColor: "#f5c0c0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  apiErrorText: {
    fontSize: 13,
    color: "#c0392b",
    fontWeight: "500",
  },

  // Button
  primaryBtn: {
    backgroundColor: GREEN,
    borderRadius: 14,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryBtnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // Divider
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e0f0e8",
  },
  dividerText: {
    marginHorizontal: 12,
    color: "#9bbfb0",
    fontSize: 13,
    fontWeight: "500",
  },

  // Login link
  loginLink: {
    alignItems: "center",
    paddingVertical: 4,
  },
  loginLinkText: {
    fontSize: 14,
    color: "#6b9e8a",
  },
  loginLinkBold: {
    color: GREEN,
    fontWeight: "700",
  },

  // Footer
  footer: {
    textAlign: "center",
    fontSize: 12,
    color: "#9bbfb0",
    marginTop: 24,
    lineHeight: 18,
  },
  footerLink: {
    color: GREEN_LIGHT,
    fontWeight: "600",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: "60%",
  },
  modalTitle: {
    fontSize: 18,
    color: "#1a3d31",
    fontWeight: "700",
    marginBottom: 16,
  },
  modalList: {
    marginBottom: 24,
  },
  modalItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e9f2ef",
  },
  modalItemText: {
    fontSize: 16,
    color: "#1a3d31",
  },
  modalLoadingText: {
    fontSize: 14,
    color: "#9bbfb0",
    textAlign: "center",
    paddingVertical: 20,
  },
  modalNoDataText: {
    fontSize: 14,
    color: "#e05c5c",
    textAlign: "center",
    paddingVertical: 20,
  },
  modalCloseBtn: {
    height: 52,
    backgroundColor: GREEN,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseText: {
    color: WHITE,
    fontWeight: "700",
    fontSize: 15,
  },

  // Success
  successContainer: {
    flex: 1,
    backgroundColor: GREEN_BG,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  successCard: {
    backgroundColor: WHITE,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
    width: "100%",
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: GREEN_PALE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1a3d31",
    marginBottom: 10,
  },
  successSubtitle: {
    fontSize: 14,
    color: "#6b9e8a",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
});
