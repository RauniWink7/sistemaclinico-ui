import React, { useState } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { showAlert } from '../../services/feedback';
import { DateField } from '../../components/DateTimeField';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { createPatientAsAdmin } from '../../services/api';

// ─── Tema (mesmo do profissional) ─────────────────────────────────────────────
const GREEN = '#2e8b6e';
const GREEN_LIGHT = '#e8f7f1';
const PAGE_BG = '#e8f1ec';
const WHITE = '#ffffff';
const BORDER = '#dfece5';
const TEXT_DARK = '#17352b';
const TEXT_MUTED = '#5f7a6f';
const MAX_WIDTH = 1120;

const CARD_SHADOW = {
  shadowColor: '#1f5442',
  shadowOpacity: 0.05,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
} as const;

export default function CadastrarPacienteScreen() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    birthDate: '',
    cpf: '',
    emergencyName: '',
    emergencyPhone: '',
  });

  const patch = (field: keyof typeof form) => (val: string) =>
    setForm((f) => ({ ...f, [field]: val }));

  // Data máxima do calendário: hoje (não faz sentido nascer no futuro).
  const todayStr = new Date().toLocaleDateString('en-CA');

  const handleSubmit = async () => {
    if (!form.fullName || !form.email)
      return showAlert('Campos obrigatórios', 'Preencha nome e e-mail.');

    setLoading(true);
    const result = await createPatientAsAdmin({
      full_name: form.fullName,
      email: form.email,
      phone: form.phone || undefined,
      birth_date: form.birthDate || undefined,
      cpf: form.cpf || undefined,
      emergency_contact_name: form.emergencyName || undefined,
      emergency_contact_phone: form.emergencyPhone || undefined,
      send_invite: true,
    });
    setLoading(false);

    if (!result.ok) return showAlert('Erro', result.error ?? 'Não foi possível cadastrar.');
    showAlert('Sucesso', 'Paciente cadastrado! Um e-mail de convite foi enviado para ele definir a senha.', [{ text: 'OK', onPress: () => router.back() }]);
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN} />

      <View style={styles.header}>
        <View style={styles.headerInner}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back-outline" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTextBox}>
            <Text style={styles.headerTitle}>Novo paciente</Text>
          </View>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.replace('/(admin)')}>
            <Ionicons name="home-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>

          {/* Dados de acesso */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardIcon}>
                <Ionicons name="person-outline" size={16} color={GREEN} />
              </View>
              <Text style={styles.cardTitle}>Dados de acesso</Text>
            </View>

            <Text style={styles.fieldLabel}>Nome completo *</Text>
            <TextInput style={styles.input} placeholder="Nome do paciente" placeholderTextColor="#94b3a6" value={form.fullName} onChangeText={patch('fullName')} />

            <Text style={styles.fieldLabel}>E-mail *</Text>
            <TextInput style={styles.input} placeholder="email@exemplo.com" placeholderTextColor="#94b3a6" value={form.email} onChangeText={patch('email')} keyboardType="email-address" autoCapitalize="none" />

            <Text style={styles.fieldLabel}>Telefone</Text>
            <TextInput style={styles.input} placeholder="(00) 00000-0000" placeholderTextColor="#94b3a6" value={form.phone} onChangeText={patch('phone')} keyboardType="phone-pad" />
          </View>

          {/* Dados clínicos */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardIcon}>
                <Ionicons name="document-text-outline" size={16} color={GREEN} />
              </View>
              <Text style={styles.cardTitle}>Dados clínicos</Text>
            </View>

            <Text style={styles.fieldLabel}>Data de nascimento</Text>
            <DateField value={form.birthDate} onChange={patch('birthDate')} max={todayStr} />

            <Text style={styles.fieldLabel}>CPF</Text>
            <TextInput style={styles.input} placeholder="000.000.000-00" placeholderTextColor="#94b3a6" value={form.cpf} onChangeText={patch('cpf')} keyboardType="numeric" />
          </View>

          {/* Contato de emergência */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardIcon}>
                <Ionicons name="call-outline" size={16} color={GREEN} />
              </View>
              <Text style={styles.cardTitle}>Contato de emergência</Text>
            </View>

            <Text style={styles.fieldLabel}>Nome</Text>
            <TextInput style={styles.input} placeholder="Nome do contato" placeholderTextColor="#94b3a6" value={form.emergencyName} onChangeText={patch('emergencyName')} />

            <Text style={styles.fieldLabel}>Telefone</Text>
            <TextInput style={styles.input} placeholder="(00) 00000-0000" placeholderTextColor="#94b3a6" value={form.emergencyPhone} onChangeText={patch('emergencyPhone')} keyboardType="phone-pad" />
          </View>

          <TouchableOpacity style={[styles.submitButton, loading && styles.submitDisabled]} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="person-add-outline" size={20} color="#fff" />
                <Text style={styles.submitText}>Cadastrar paciente</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()} activeOpacity={0.85}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PAGE_BG },
  header: { backgroundColor: GREEN, paddingTop: 52, paddingBottom: 20 },
  headerInner: {
    width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
  },
  iconBtn: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTextBox: { flex: 1 },
  headerTitle: { color: WHITE, fontSize: 21, fontWeight: '800', letterSpacing: -0.3 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 44 },
  container: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
  card: {
    backgroundColor: WHITE, borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    padding: 18, marginBottom: 16, ...CARD_SHADOW,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  cardIcon: { width: 30, height: 30, borderRadius: 9, backgroundColor: GREEN_LIGHT, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15.5, fontWeight: '800', color: TEXT_DARK, letterSpacing: -0.2 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#6a887d', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 16, marginBottom: 8 },
  input: {
    borderRadius: 12, backgroundColor: '#f6faf8', borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, color: '#1f4036',
    // @ts-ignore — remove o contorno azul no web
    outlineStyle: 'none',
  },
  submitButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: GREEN, borderRadius: 14, paddingVertical: 16, marginBottom: 8,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: WHITE, fontSize: 16, fontWeight: '800' },
  cancelButton: { alignItems: 'center', paddingVertical: 14 },
  cancelText: { fontSize: 15, fontWeight: '600', color: TEXT_MUTED },
});
