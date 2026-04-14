import React, { useRef, useState } from 'react';
import {
  Alert,
  Animated,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface ClinicForm {
  name: string;
  address: string;
  phone: string;
  email: string;
  openingTime: string;
  closingTime: string;
}

const GREEN = '#2e8b6e';
const GREEN_DARK = '#1f684f';
const BG = '#f0faf5';
const WHITE = '#ffffff';

const INITIAL_FORM: ClinicForm = {
  name: 'Clinica Equilibrio Mental',
  address: 'Rua das Acacias, 145 - Vila Mariana, Sao Paulo - SP',
  phone: '(11) 4002-8922',
  email: 'contato@equilibriomental.com.br',
  openingTime: '08:00',
  closingTime: '19:00',
};

const DecorativeBackground = () => (
  <>
    <View style={styles.circle1} />
    <View style={styles.circle2} />
  </>
);

const InputField = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
}) => (
  <View style={styles.inputGroup}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#94b3a6"
      keyboardType={keyboardType ?? 'default'}
    />
  </View>
);

export default function AdminClinicManagementScreen() {
  const [form, setForm] = useState<ClinicForm>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const setField = (field: keyof ClinicForm) => (value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 900));
      Alert.alert('Dados atualizados', 'As informacoes da clinica foram salvas com sucesso.');
    } finally {
      setLoading(false);
    }
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
          <Text style={styles.headerEyebrow}>Area administrativa</Text>
          <Text style={styles.headerTitle}>Gerenciamento da clinica</Text>
        </View>

        <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/(admin)')}>
          <Ionicons name="grid-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>Edicao</Text>
            <Text style={styles.heroTitle}>Dados institucionais</Text>
            <Text style={styles.heroSubtitle}>
              Atualize as informacoes principais da clinica e o horario de funcionamento do painel.
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Informacoes da clinica</Text>

            <InputField
              label="Nome da clinica"
              value={form.name}
              onChangeText={setField('name')}
              placeholder="Digite o nome da clinica"
            />

            <InputField
              label="Endereco"
              value={form.address}
              onChangeText={setField('address')}
              placeholder="Digite o endereco"
            />

            <InputField
              label="Telefone"
              value={form.phone}
              onChangeText={setField('phone')}
              placeholder="Digite o telefone"
              keyboardType="phone-pad"
            />

            <InputField
              label="E-mail"
              value={form.email}
              onChangeText={setField('email')}
              placeholder="Digite o e-mail"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Horario de funcionamento</Text>
            <Text style={styles.sectionSubtitle}>
              Defina os horarios padrao de abertura e fechamento da clinica.
            </Text>

            <View style={styles.timeRow}>
              <View style={styles.timeCard}>
                <Text style={styles.inputLabel}>Abertura</Text>
                <TextInput
                  style={styles.input}
                  value={form.openingTime}
                  onChangeText={setField('openingTime')}
                  placeholder="08:00"
                  placeholderTextColor="#94b3a6"
                />
              </View>

              <View style={styles.timeCard}>
                <Text style={styles.inputLabel}>Fechamento</Text>
                <TextInput
                  style={styles.input}
                  value={form.closingTime}
                  onChangeText={setField('closingTime')}
                  placeholder="19:00"
                  placeholderTextColor="#94b3a6"
                />
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            activeOpacity={0.85}
            disabled={loading}
          >
            <Ionicons name="save-outline" size={18} color="#fff" />
            <Text style={styles.saveButtonText}>
              {loading ? 'Salvando...' : 'Salvar alteracoes'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
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
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#27795f',
    top: -110,
    right: -70,
    opacity: 0.45,
  },
  circle2: {
    position: 'absolute',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextBox: {
    flex: 1,
    marginHorizontal: 14,
  },
  headerEyebrow: {
    color: '#bce3d5',
    fontSize: 13,
    fontWeight: '600',
  },
  headerTitle: {
    color: WHITE,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: -0.4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 22,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: WHITE,
    borderRadius: 28,
    padding: 22,
    marginTop: -18,
    marginBottom: 20,
    shadowColor: '#174c3e',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: GREEN,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroTitle: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: '800',
    color: '#173d31',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: '#5e7b70',
  },
  formCard: {
    backgroundColor: WHITE,
    borderRadius: 26,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#174c3e',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#173d31',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: '#6c877c',
    marginBottom: 14,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5f7d70',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#d7ebe2',
    backgroundColor: '#fbfefd',
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#173d31',
    fontWeight: '500',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeCard: {
    flex: 1,
  },
  saveButton: {
    height: 54,
    borderRadius: 16,
    backgroundColor: GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  saveButtonDisabled: {
    opacity: 0.75,
  },
  saveButtonText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '700',
  },
});
