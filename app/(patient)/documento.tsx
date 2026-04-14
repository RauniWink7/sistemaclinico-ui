import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  StatusBar,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

// ─── Types ────────────────────────────────────────────────────────────────────
type FileType = 'PDF' | 'Imagem' | 'Laudo' | 'Receita' | 'Outros';

interface Document {
  id: string;
  title: string;
  file_type: FileType;
  uploaded_at: string;
  size: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_DOCUMENTS: Document[] = [
  { id: '1', title: 'Laudo Psicológico 2025',    file_type: 'Laudo',  uploaded_at: '2025-11-10', size: '1.2 MB' },
  { id: '2', title: 'Receita Fluoxetina',         file_type: 'Receita',uploaded_at: '2025-12-03', size: '320 KB' },
  { id: '3', title: 'Relatório de Anamnese',      file_type: 'PDF',    uploaded_at: '2026-01-15', size: '850 KB' },
  { id: '4', title: 'Exame de Sangue Jan/2026',   file_type: 'Imagem', uploaded_at: '2026-01-22', size: '2.4 MB' },
  { id: '5', title: 'Atestado Médico',             file_type: 'Outros', uploaded_at: '2026-02-08', size: '210 KB' },
];

const FILE_TYPE_OPTIONS: FileType[] = ['PDF', 'Imagem', 'Laudo', 'Receita', 'Outros'];

// ─── File type config ─────────────────────────────────────────────────────────
const FILE_CONFIG: Record<FileType, { icon: string; color: string; bg: string }> = {
  PDF:     { icon: 'document-text-outline', color: '#e05c5c', bg: '#fdeaea' },
  Imagem:  { icon: 'image-outline',         color: '#3a7bd5', bg: '#e8f0fc' },
  Laudo:   { icon: 'clipboard-outline',     color: '#8b5cf6', bg: '#f0ebff' },
  Receita: { icon: 'medkit-outline',        color: '#e67e22', bg: '#fef3e8' },
  Outros:  { icon: 'folder-outline',        color: '#7aab96', bg: '#e8f7f1' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (iso: string): string => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

// ─── Document Card ────────────────────────────────────────────────────────────
interface DocCardProps {
  item: Document;
  onDownload: (item: Document) => void;
  onDelete: (id: string) => void;
}

const DocCard = ({ item, onDownload, onDelete }: DocCardProps) => {
  const cfg = FILE_CONFIG[item.file_type];
  return (
    <View style={styles.card}>
      {/* Icon */}
      <View style={[styles.fileIconBox, { backgroundColor: cfg.bg }]}>
        <Ionicons name={cfg.icon as any} size={28} color={cfg.color} />
      </View>

      {/* Info */}
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <View style={styles.cardMeta}>
          <View style={[styles.typeBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.typeText, { color: cfg.color }]}>{item.file_type}</Text>
          </View>
          <Text style={styles.cardDate}>{formatDate(item.uploaded_at)}</Text>
          <Text style={styles.cardSize}>{item.size}</Text>
        </View>

        {/* Actions */}
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.downloadBtn} onPress={() => onDownload(item)} activeOpacity={0.8}>
            <Ionicons name="download-outline" size={13} color={GREEN} />
            <Text style={styles.downloadBtnText}>Download</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(item.id)} activeOpacity={0.8}>
            <Ionicons name="trash-outline" size={13} color="#e05c5c" />
            <Text style={styles.deleteBtnText}>Excluir</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// ─── Upload Modal ─────────────────────────────────────────────────────────────
interface UploadModalProps {
  visible: boolean;
  onClose: () => void;
  onUpload: (title: string, fileType: FileType) => Promise<void>;
}

const UploadModal = ({ visible, onClose, onUpload }: UploadModalProps) => {
  const [title, setTitle] = useState('');
  const [fileType, setFileType] = useState<FileType>('PDF');
  const [loading, setLoading] = useState(false);
  const [titleError, setTitleError] = useState('');

  const handleUpload = async () => {
    if (!title.trim()) {
      setTitleError('O título é obrigatório.');
      return;
    }
    setTitleError('');
    setLoading(true);
    await onUpload(title.trim(), fileType);
    setLoading(false);
    setTitle('');
    setFileType('PDF');
  };

  const handleClose = () => {
    setTitle('');
    setFileType('PDF');
    setTitleError('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          {/* Handle */}
          <View style={styles.modalHandle} />

          <Text style={styles.modalTitle}>Enviar documento</Text>
          <Text style={styles.modalSubtitle}>Preencha os dados e selecione o arquivo</Text>

          {/* Title input */}
          <Text style={styles.modalLabel}>Título do documento</Text>
          <View style={[styles.modalInput, titleError ? styles.modalInputError : null]}>
            <Ionicons name="document-outline" size={16} color="#7aab96" />
            <TextInput
              style={styles.modalInputText}
              value={title}
              onChangeText={(v) => { setTitle(v); setTitleError(''); }}
              placeholder="Ex: Laudo Psicológico 2026"
              placeholderTextColor="#9bbfb0"
            />
          </View>
          {titleError ? <Text style={styles.modalInputErrorText}>{titleError}</Text> : null}

          {/* File type selector */}
          <Text style={[styles.modalLabel, { marginTop: 16 }]}>Tipo de arquivo</Text>
          <View style={styles.typeGrid}>
            {FILE_TYPE_OPTIONS.map((t) => {
              const cfg = FILE_CONFIG[t];
              const active = fileType === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeOption, active && { backgroundColor: cfg.bg, borderColor: cfg.color }]}
                  onPress={() => setFileType(t)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={cfg.icon as any} size={18} color={active ? cfg.color : '#9bbfb0'} />
                  <Text style={[styles.typeOptionText, active && { color: cfg.color }]}>{t}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* File picker (mock) */}
          <TouchableOpacity style={styles.filePicker} activeOpacity={0.8}
            onPress={() => Alert.alert('Selecionar arquivo', 'Integre com expo-document-picker ou expo-image-picker para selecionar arquivos reais.')}>
            <Ionicons name="cloud-upload-outline" size={28} color="#9bbfb0" />
            <Text style={styles.filePickerText}>Toque para selecionar o arquivo</Text>
            <Text style={styles.filePickerSub}>PDF, imagem ou documento</Text>
          </TouchableOpacity>

          {/* Buttons */}
          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.cancelModalBtn} onPress={handleClose} disabled={loading}>
              <Text style={styles.cancelModalBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.uploadConfirmBtn, loading && { opacity: 0.7 }]}
              onPress={handleUpload}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <>
                    <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
                    <Text style={styles.uploadConfirmBtnText}>Enviar</Text>
                  </>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function DocumentsScreen() {
  const [documents, setDocuments] = useState<Document[]>(MOCK_DOCUMENTS);
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FileType | 'Todos'>('Todos');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const filtered = documents.filter((d) => {
    const matchSearch = d.title.toLowerCase().includes(search.toLowerCase());
    const matchFilter = activeFilter === 'Todos' || d.file_type === activeFilter;
    return matchSearch && matchFilter;
  });

  const handleDownload = (item: Document) => {
    // TODO: integrar com URL real do arquivo e usar expo-file-system ou Linking
    Alert.alert('Download', `Baixando "${item.title}"...\n\nIntegre com a URL real do arquivo para download.`);
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Excluir documento',
      'Tem certeza que deseja excluir este documento? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            // TODO: DELETE /api/documents/:id/
            setDocuments((prev) => prev.filter((d) => d.id !== id));
          },
        },
      ]
    );
  };

  const handleUpload = async (title: string, fileType: FileType): Promise<void> => {
    // TODO: substituir por chamada real com multipart/form-data
    // const formData = new FormData();
    // formData.append('title', title);
    // formData.append('file_type', fileType);
    // formData.append('file', { uri, name, type } as any);
    // await fetch('https://sua-api.com/api/documents/', {
    //   method: 'POST',
    //   headers: { Authorization: `Bearer TOKEN` },
    //   body: formData,
    // });

    await new Promise((r) => setTimeout(r, 1200)); // simula delay

    const newDoc: Document = {
      id: Date.now().toString(),
      title,
      file_type: fileType,
      uploaded_at: new Date().toISOString().split('T')[0],
      size: '—',
    };
    setDocuments((prev) => [newDoc, ...prev]);
    setModalVisible(false);
    Alert.alert('Sucesso', 'Documento enviado com sucesso!');
  };

  const filters: (FileType | 'Todos')[] = ['Todos', ...FILE_TYPE_OPTIONS];

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back-outline" size={22} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Meus Documentos</Text>
          <Text style={styles.headerSubtitle}>{documents.length} documento{documents.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity style={styles.uploadHeaderBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ── Search ── */}
      <Animated.View style={[styles.searchSection, { opacity: fadeAnim }]}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={17} color="#7aab96" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar documento..."
            placeholderTextColor="#9bbfb0"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={17} color="#9bbfb0" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
          {filters.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[styles.filterChipText, activeFilter === f && styles.filterChipTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      {/* ── Stats strip ── */}
      <Animated.View style={[styles.statsStrip, { opacity: fadeAnim }]}>
        {FILE_TYPE_OPTIONS.map((t) => {
          const count = documents.filter((d) => d.file_type === t).length;
          const cfg = FILE_CONFIG[t];
          return (
            <TouchableOpacity key={t} style={styles.statItem} onPress={() => setActiveFilter(t)} activeOpacity={0.7}>
              <View style={[styles.statIcon, { backgroundColor: cfg.bg }]}>
                <Ionicons name={cfg.icon as any} size={14} color={cfg.color} />
              </View>
              <Text style={styles.statCount}>{count}</Text>
              <Text style={styles.statLabel}>{t}</Text>
            </TouchableOpacity>
          );
        })}
      </Animated.View>

      {/* ── List ── */}
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {filtered.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="folder-open-outline" size={48} color="#b2dfcf" />
              <Text style={styles.emptyTitle}>Nenhum documento encontrado</Text>
              <Text style={styles.emptySubtitle}>Envie seu primeiro documento tocando no botão abaixo.</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => setModalVisible(true)}>
                <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
                <Text style={styles.emptyBtnText}>Enviar documento</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filtered.map((item) => (
              <DocCard
                key={item.id}
                item={item}
                onDownload={handleDownload}
                onDelete={handleDelete}
              />
            ))
          )}
        </Animated.View>
      </ScrollView>

      {/* ── FAB ── */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)} activeOpacity={0.85}>
        <Ionicons name="cloud-upload-outline" size={24} color="#fff" />
      </TouchableOpacity>

      {/* ── Upload Modal ── */}
      <UploadModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onUpload={handleUpload}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const GREEN = '#2e8b6e';
const WHITE = '#ffffff';
const BG = '#f0faf5';

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  // Header
  header: {
    backgroundColor: GREEN,
    paddingTop: 52,
    paddingBottom: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: WHITE, textAlign: 'center' },
  headerSubtitle: { fontSize: 12, color: '#b2dfcf', textAlign: 'center', marginTop: 2 },
  uploadHeaderBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Search
  searchSection: {
    backgroundColor: WHITE,
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 4,
    shadowColor: GREEN, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f0faf5', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 9,
    borderWidth: 1, borderColor: '#d4ede3', marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1a3d31', fontWeight: '500' },
  filtersRow: { gap: 8, paddingBottom: 12 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#f0faf5', borderWidth: 1, borderColor: '#d4ede3',
  },
  filterChipActive: { backgroundColor: GREEN, borderColor: GREEN },
  filterChipText: { fontSize: 12, color: '#4a7a66', fontWeight: '600' },
  filterChipTextActive: { color: WHITE },

  // Stats
  statsStrip: {
    backgroundColor: WHITE, flexDirection: 'row',
    paddingVertical: 12, paddingHorizontal: 8,
    justifyContent: 'space-around',
    shadowColor: GREEN, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  statItem: { alignItems: 'center', gap: 3 },
  statIcon: {
    width: 30, height: 30, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  statCount: { fontSize: 14, fontWeight: '800', color: '#1a3d31' },
  statLabel: { fontSize: 9, color: '#7aab96', fontWeight: '600' },

  // List
  listContent: { padding: 20, paddingBottom: 100 },

  // Card
  card: {
    backgroundColor: WHITE, borderRadius: 18,
    flexDirection: 'row', alignItems: 'center',
    padding: 14, marginBottom: 12, gap: 14,
    shadowColor: GREEN, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  fileIconBox: {
    width: 54, height: 54, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1a3d31', marginBottom: 5 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  typeBadge: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6,
  },
  typeText: { fontSize: 10, fontWeight: '700' },
  cardDate: { fontSize: 11, color: '#7aab96', fontWeight: '500' },
  cardSize: { fontSize: 11, color: '#b2dfcf', fontWeight: '500' },
  cardActions: { flexDirection: 'row', gap: 8 },
  downloadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#e8f7f1', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  downloadBtnText: { fontSize: 11, fontWeight: '700', color: GREEN },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fdeaea', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  deleteBtnText: { fontSize: 11, fontWeight: '700', color: '#e05c5c' },

  // Empty
  emptyBox: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1a3d31', marginTop: 4 },
  emptySubtitle: { fontSize: 13, color: '#7aab96', textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: GREEN, paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 14, marginTop: 8,
  },
  emptyBtnText: { color: WHITE, fontSize: 14, fontWeight: '700' },

  // FAB
  fab: {
    position: 'absolute', bottom: 28, right: 24,
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center',
    shadowColor: GREEN, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: WHITE, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#d4ede3', alignSelf: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1a3d31', marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: '#7aab96', marginBottom: 20 },
  modalLabel: { fontSize: 12, fontWeight: '700', color: '#1a3d31', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalInput: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: '#d4ede3', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fafffe',
  },
  modalInputError: { borderColor: '#e05c5c' },
  modalInputText: { flex: 1, fontSize: 14, color: '#1a3d31', fontWeight: '500' },
  modalInputErrorText: { fontSize: 12, color: '#e05c5c', marginTop: 4 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  typeOption: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#d4ede3', backgroundColor: '#fafffe',
  },
  typeOptionText: { fontSize: 12, fontWeight: '700', color: '#9bbfb0' },
  filePicker: {
    borderWidth: 1.5, borderColor: '#d4ede3', borderStyle: 'dashed',
    borderRadius: 14, padding: 24, alignItems: 'center', gap: 6,
    backgroundColor: '#fafffe', marginBottom: 24,
  },
  filePickerText: { fontSize: 14, fontWeight: '600', color: '#7aab96' },
  filePickerSub: { fontSize: 11, color: '#b2dfcf' },
  modalButtons: { flexDirection: 'row', gap: 12 },
  cancelModalBtn: {
    flex: 1, height: 50, borderRadius: 14, borderWidth: 1.5,
    borderColor: '#d4ede3', alignItems: 'center', justifyContent: 'center',
  },
  cancelModalBtnText: { fontSize: 15, fontWeight: '700', color: '#7aab96' },
  uploadConfirmBtn: {
    flex: 2, height: 50, borderRadius: 14, backgroundColor: GREEN,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: GREEN, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  uploadConfirmBtnText: { fontSize: 15, fontWeight: '700', color: WHITE },
});
