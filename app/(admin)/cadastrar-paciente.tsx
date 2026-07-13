import React, { useState, useEffect } from 'react';
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

const GREEN = '#2e8b6e';
const GREEN_DARK = '#1f684f';
const GREEN_LIGHT = '#e8f7f1';
const BG = '#f0faf5';
const WHITE = '#ffffff';

const DecorativeBackground = () => (
  <>
    <View style={styles.circle1} />
    <View style={styles.circle2} />
  </>
);

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
      <DecorativeBackground />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back-outline" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTextBox}>
          <Text style={styles.headerEyebrow}>Área administrativa</Text>
          <Text style={styles.headerTitle}>Novo paciente</Text>
        </View>
        <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/(admin)')}>
          <Ionicons name="grid-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Dados de acesso */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardIcon}>
              <Ionicons name="person-outline" size={18} color={GREEN} />
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
              <Ionicons name="document-text-outline" size={18} color={GREEN} />
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
              <Ionicons name="call-outline" size={18} color={GREEN} />
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  circle1: { position: 'absolute', width: 280, height: 280, borderRadius: 140, backgroundColor: '#27795f', top: -110, right: -70, opacity: 0.45 },
  circle2: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: GREEN_DARK, top: -55, left: -70, opacity: 0.28 },
  header: { paddingTop: 56, paddingBottom: 24, paddingHorizontal: 24, backgroundColor: GREEN, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  homeBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTextBox: { flex: 1, marginHorizontal: 14 },
  headerEyebrow: { color: '#bce3d5', fontSize: 13, fontWeight: '600' },
  headerTitle: { color: WHITE, fontSize: 24, fontWeight: '800', marginTop: 2, letterSpacing: -0.4 },
  scroll: { flex: 1 },
  scrollContent: { padding: 22, paddingBottom: 40 },
  card: { backgroundColor: WHITE, borderRadius: 24, padding: 20, marginBottom: 16, shadowColor: '#174c3e', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  cardIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: GREEN_LIGHT, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 17, fontWeight: '800', color: '#163c31' },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#6a887d', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 18, marginBottom: 8 },
  input: { borderRadius: 14, backgroundColor: '#f8fcfa', borderWidth: 1, borderColor: '#e3efe8', paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, color: '#1f4036' },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: GREEN, borderRadius: 18, paddingVertical: 17, marginBottom: 12 },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: WHITE, fontSize: 16, fontWeight: '700' },
  cancelButton: { alignItems: 'center', paddingVertical: 14 },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#6a887d' },
});