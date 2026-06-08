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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { createProfessionalAsAdmin } from '../../services/api';

const GREEN = '#2e8b6e';
const GREEN_DARK = '#1f684f';
const GREEN_LIGHT = '#e8f7f1';
const BLUE_LIGHT = '#eaf1ff';
const BG = '#f0faf5';
const WHITE = '#ffffff';

const DURATIONS = ['30', '45', '50', '60', '90'];

const DecorativeBackground = () => (
  <>
    <View style={styles.circle1} />
    <View style={styles.circle2} />
  </>
);

export default function CadastrarPsicologoScreen() {
  const [loading, setLoading] = useState(false);
  const [sessionDuration, setSessionDuration] = useState('50');
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    crp: '',
    specialty: '',
    bio: '',
  });

  const patch = (field: keyof typeof form) => (val: string) =>
    setForm((f) => ({ ...f, [field]: val }));

  const handleSubmit = async () => {
    if (!form.fullName || !form.email)
      return Alert.alert('Campos obrigatórios', 'Preencha nome e e-mail.');
    if (!form.crp)
      return Alert.alert('CRP obrigatório', 'Informe o CRP do psicólogo.');

    setLoading(true);
    const result = await createProfessionalAsAdmin({
      full_name: form.fullName,
      email: form.email,
      phone: form.phone || undefined,
      crp: form.crp,
      specialty: form.specialty || undefined,
      send_invite: true,
    });
    setLoading(false);

    if (!result.ok) return Alert.alert('Erro', result.error ?? 'Não foi possível cadastrar.');
    Alert.alert('Sucesso', 'Psicólogo cadastrado! Um e-mail de convite foi enviado para ele definir a senha.', [{ text: 'OK', onPress: () => router.back() }]);
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
          <Text style={styles.headerTitle}>Novo psicólogo</Text>
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
          <TextInput style={styles.input} placeholder="Nome do psicólogo" placeholderTextColor="#94b3a6" value={form.fullName} onChangeText={patch('fullName')} />

          <Text style={styles.fieldLabel}>E-mail *</Text>
          <TextInput style={styles.input} placeholder="email@clinica.com" placeholderTextColor="#94b3a6" value={form.email} onChangeText={patch('email')} keyboardType="email-address" autoCapitalize="none" />

          <Text style={styles.fieldLabel}>Telefone</Text>
          <TextInput style={styles.input} placeholder="(00) 00000-0000" placeholderTextColor="#94b3a6" value={form.phone} onChangeText={patch('phone')} keyboardType="phone-pad" />
        </View>

        {/* Dados profissionais */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardIcon}>
              <Ionicons name="medkit-outline" size={18} color={GREEN} />
            </View>
            <Text style={styles.cardTitle}>Dados profissionais</Text>
          </View>

          <Text style={styles.fieldLabel}>CRP</Text>
          <TextInput style={styles.input} placeholder="Ex: CRP 06/123456" placeholderTextColor="#94b3a6" value={form.crp} onChangeText={patch('crp')} />

          <Text style={styles.fieldLabel}>Especialidade</Text>
          <TextInput style={styles.input} placeholder="Ex: Ansiedade e Depressão" placeholderTextColor="#94b3a6" value={form.specialty} onChangeText={patch('specialty')} />

          <Text style={styles.fieldLabel}>Bio / Apresentação</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="Descreva brevemente a atuação do psicólogo..."
            placeholderTextColor="#94b3a6"
            value={form.bio}
            onChangeText={patch('bio')}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Duração da sessão */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardIcon}>
              <Ionicons name="time-outline" size={18} color={GREEN} />
            </View>
            <Text style={styles.cardTitle}>Duração da sessão</Text>
          </View>
          <Text style={styles.cardSubtitle}>Selecione a duração padrão das consultas deste psicólogo.</Text>

          <View style={styles.durationRow}>
            {DURATIONS.map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.durationChip, sessionDuration === d && styles.durationChipActive]}
                onPress={() => setSessionDuration(d)}
                activeOpacity={0.85}
              >
                <Text style={[styles.durationText, sessionDuration === d && styles.durationTextActive]}>
                  {d} min
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={[styles.submitButton, loading && styles.submitDisabled]} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="person-add-outline" size={20} color="#fff" />
              <Text style={styles.submitText}>Cadastrar psicólogo</Text>
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
  cardSubtitle: { marginTop: 6, fontSize: 13, color: '#5d7c71', lineHeight: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#6a887d', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 18, marginBottom: 8 },
  input: { borderRadius: 14, backgroundColor: '#f8fcfa', borderWidth: 1, borderColor: '#e3efe8', paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, color: '#1f4036' },
  inputMultiline: { minHeight: 100, paddingTop: 13 },
  durationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  durationChip: { borderRadius: 14, borderWidth: 1.5, borderColor: '#e3efe8', backgroundColor: BLUE_LIGHT, paddingVertical: 12, paddingHorizontal: 20 },
  durationChipActive: { borderColor: GREEN, backgroundColor: GREEN_LIGHT },
  durationText: { fontSize: 14, fontWeight: '700', color: '#5f7e73' },
  durationTextActive: { color: GREEN },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: GREEN, borderRadius: 18, paddingVertical: 17, marginBottom: 12 },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: WHITE, fontSize: 16, fontWeight: '700' },
  cancelButton: { alignItems: 'center', paddingVertical: 14 },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#6a887d' },
});