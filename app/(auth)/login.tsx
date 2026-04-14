import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  StatusBar,
  KeyboardTypeOptions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

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
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  error?: string;
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

  const labelTop = animatedLabel.interpolate({ inputRange: [0, 1], outputRange: [17, 4] });
  const labelSize = animatedLabel.interpolate({ inputRange: [0, 1], outputRange: [15, 11] });
  const labelColor = animatedLabel.interpolate({
    inputRange: [0, 1],
    outputRange: ['#9bbfb0', error ? '#e05c5c' : focused ? '#2e8b6e' : '#5aab8a'],
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
          style={[styles.floatingLabel, { top: labelTop, fontSize: labelSize, color: labelColor }]}
        >
          {label}
        </Animated.Text>
        <TextInput
          style={styles.textInput}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType ?? 'default'}
          autoCapitalize={autoCapitalize ?? 'none'}
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

// ─── Props & Types ────────────────────────────────────────────────────────────
interface FormState {
  email: string;
  senha: string;
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const [form, setForm] = useState<FormState>({ email: '', senha: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const set = (field: keyof FormState) => (val: string) => {
    setForm((prev) => ({ ...prev, [field]: val }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
    setApiError('');
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.email.trim()) {
      newErrors.email = 'E-mail é obrigatório.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Insira um e-mail válido.';
    }
    if (!form.senha) {
      newErrors.senha = 'Senha é obrigatória.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (): Promise<void> => {
    if (!validate()) return;
    setLoading(true);
    setApiError('');
    try {
      const response = await fetch('https://sua-api.com/api/auth/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.senha,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const msg: string =
          data?.message ||
          data?.error ||
          'E-mail ou senha incorretos.';
        setApiError(msg);
      } else {
        const { access_token, refresh_token } = data;
        // TODO: salvar tokens no storage e redirecionar por role
        void access_token;
        void refresh_token;
        router.replace('/homep');
      }
    } catch {
      setApiError('Não foi possível conectar ao servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#f0faf5" />
      <DecorativeBackground />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <Animated.View
            style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          >
            <View style={styles.logoMark}>
              <Ionicons name="leaf-outline" size={26} color="#fff" />
            </View>
            <Text style={styles.appName}>Uni3 Clinic Management</Text>
            <Text style={styles.headerTitle}>Bem-vindo de volta</Text>
            <Text style={styles.headerSubtitle}>
              Entre com sua conta para continuar
            </Text>
          </Animated.View>

          {/* Card */}
          <Animated.View
            style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          >
            <FloatingInput
              label="E-mail"
              value={form.email}
              onChangeText={set('email')}
              keyboardType="email-address"
              error={errors.email}
            />
            <FloatingInput
              label="Senha"
              value={form.senha}
              onChangeText={set('senha')}
              secureTextEntry={!showSenha}
              error={errors.senha}
              rightIcon={showSenha ? 'eye-off-outline' : 'eye-outline'}
              onRightIconPress={() => setShowSenha((v) => !v)}
            />

            {/* Esqueci minha senha */}
            <TouchableOpacity
              style={styles.forgotBtn}
              onPress={() => alert('Fluxo de recuperacao de senha ainda nao foi implementado.')}
            >
              <Text style={styles.forgotText}>Esqueci minha senha</Text>
            </TouchableOpacity>

            {/* API Error */}
            {apiError ? (
              <View style={styles.apiErrorBox}>
                <Ionicons name="alert-circle-outline" size={16} color="#c0392b" style={{ marginRight: 6 }} />
                <Text style={styles.apiErrorText}>{apiError}</Text>
              </View>
            ) : null}

            {/* Submit */}
            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Entrar</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.demoBtn}
              onPress={() => router.replace('/homep')}
              activeOpacity={0.85}
            >
              <Ionicons name="flash-outline" size={18} color={GREEN} />
              <Text style={styles.demoBtnText}>Entrar em modo demo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.adminBtn}
              onPress={() => router.replace('/(admin)')}
              activeOpacity={0.85}
            >
              <Ionicons name="shield-checkmark-outline" size={18} color="#1f684f" />
              <Text style={styles.adminBtnText}>Entrar como admin</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.psychologistBtn}
              onPress={() => router.replace('/dashboardP')}
              activeOpacity={0.85}
            >
              <Ionicons name="medkit-outline" size={18} color="#2d6cdf" />
              <Text style={styles.psychologistBtnText}>Entrar como psicologo</Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Register link */}
            <TouchableOpacity
              style={styles.registerLink}
              onPress={() => router.push('/cadastro')}
            >
              <Text style={styles.registerLinkText}>
                Não tem uma conta?{' '}
                <Text style={styles.registerLinkBold}>Cadastre-se</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const GREEN = '#2e8b6e';
const GREEN_LIGHT = '#5aab8a';
const GREEN_BG = '#f0faf5';
const WHITE = '#ffffff';

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: GREEN_BG,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
    justifyContent: 'center',
  },

  // Decorative
  circle1: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#c8eedd',
    opacity: 0.45,
    top: -80,
    right: -80,
  },
  circle2: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#a8dfc8',
    opacity: 0.3,
    bottom: 120,
    left: -50,
  },
  circle3: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#2e8b6e',
    opacity: 0.08,
    top: 220,
    left: 20,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoMark: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  appName: {
    fontSize: 12,
    fontWeight: '700',
    color: GREEN_LIGHT,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
    textAlign: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a3d31',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b9e8a',
    textAlign: 'center',
  },

  // Card
  card: {
    backgroundColor: WHITE,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#2e8b6e',
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
    borderColor: '#d4ede3',
    borderRadius: 14,
    backgroundColor: '#fafffe',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 8,
    position: 'relative',
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
    borderColor: '#e05c5c',
    backgroundColor: '#fff8f8',
  },
  floatingLabel: {
    position: 'absolute',
    left: 16,
    fontWeight: '500',
  },
  textInput: {
    fontSize: 15,
    color: '#1a3d31',
    fontWeight: '500',
    paddingRight: 36,
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: 16,
    padding: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#e05c5c',
    marginTop: 4,
    marginLeft: 4,
  },

  // Forgot password
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 8,
    marginTop: -4,
  },
  forgotText: {
    fontSize: 13,
    color: GREEN,
    fontWeight: '600',
  },

  // API Error
  apiErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff1f1',
    borderWidth: 1,
    borderColor: '#f5c0c0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  apiErrorText: {
    fontSize: 13,
    color: '#c0392b',
    fontWeight: '500',
    flex: 1,
  },

  // Button
  primaryBtn: {
    backgroundColor: GREEN,
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  demoBtn: {
    marginTop: 12,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#cfe7dc',
    backgroundColor: '#f8fdfb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  demoBtnText: {
    color: GREEN,
    fontSize: 15,
    fontWeight: '700',
  },
  adminBtn: {
    marginTop: 10,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#b9dccd',
    backgroundColor: '#eef8f3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  adminBtnText: {
    color: '#1f684f',
    fontSize: 15,
    fontWeight: '700',
  },
  psychologistBtn: {
    marginTop: 10,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#cddff8',
    backgroundColor: '#f3f8ff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  psychologistBtnText: {
    color: '#2d6cdf',
    fontSize: 15,
    fontWeight: '700',
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0f0e8',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#9bbfb0',
    fontSize: 13,
    fontWeight: '500',
  },

  // Register link
  registerLink: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  registerLinkText: {
    fontSize: 14,
    color: '#6b9e8a',
  },
  registerLinkBold: {
    color: GREEN,
    fontWeight: '700',
  },
});
