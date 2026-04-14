import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface Conversation {
  id: string;
  patientId: string;
  patientName: string;
  focus: string;
  avatar: string;
  unreadCount: number;
  lastMessage: string;
  lastMessageTime: string;
  online: boolean;
}

interface ChatMessage {
  id: string;
  conversationId: string;
  sender: 'patient' | 'psychologist';
  text: string;
  createdAt: string;
  read: boolean;
}

const GREEN = '#2e8b6e';
const GREEN_DARK = '#1e6b54';
const GREEN_LIGHT = '#e8f7f1';
const BG = '#f0faf5';
const WHITE = '#ffffff';

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-1',
    patientId: '101',
    patientName: 'Ana Beatriz Santos',
    focus: 'Ansiedade e rotina',
    avatar: 'AB',
    unreadCount: 2,
    lastMessage: 'Consegui aplicar o exercicio ontem antes de dormir.',
    lastMessageTime: '18:42',
    online: true,
  },
  {
    id: 'conv-2',
    patientId: '102',
    patientName: 'Carlos Henrique Lima',
    focus: 'Relacionamentos familiares',
    avatar: 'CL',
    unreadCount: 0,
    lastMessage: 'Obrigado, doutora. Vou observar isso durante a semana.',
    lastMessageTime: 'Ontem',
    online: false,
  },
  {
    id: 'conv-3',
    patientId: '103',
    patientName: 'Fernanda Costa',
    focus: 'Regulacao emocional',
    avatar: 'FC',
    unreadCount: 1,
    lastMessage: 'Hoje foi um dia mais leve, depois te atualizo melhor.',
    lastMessageTime: 'Seg',
    online: true,
  },
];

const MOCK_MESSAGES: ChatMessage[] = [
  {
    id: 'm-1',
    conversationId: 'conv-1',
    sender: 'psychologist',
    text: 'Oi, Ana. Como voce ficou depois da nossa ultima consulta?',
    createdAt: '2026-04-08T17:50:00',
    read: true,
  },
  {
    id: 'm-2',
    conversationId: 'conv-1',
    sender: 'patient',
    text: 'Me senti mais tranquila e consegui aplicar o exercicio de respiracao.',
    createdAt: '2026-04-08T18:02:00',
    read: true,
  },
  {
    id: 'm-3',
    conversationId: 'conv-1',
    sender: 'psychologist',
    text: 'Que bom. Se quiser, anote os momentos em que isso ajudou para conversarmos melhor.',
    createdAt: '2026-04-08T18:20:00',
    read: true,
  },
  {
    id: 'm-4',
    conversationId: 'conv-1',
    sender: 'patient',
    text: 'Consegui aplicar o exercicio ontem antes de dormir.',
    createdAt: '2026-04-08T18:42:00',
    read: false,
  },
  {
    id: 'm-5',
    conversationId: 'conv-2',
    sender: 'patient',
    text: 'Obrigado, doutora. Vou observar isso durante a semana.',
    createdAt: '2026-04-07T09:18:00',
    read: true,
  },
  {
    id: 'm-6',
    conversationId: 'conv-3',
    sender: 'patient',
    text: 'Hoje foi um dia mais leve, depois te atualizo melhor.',
    createdAt: '2026-04-06T15:05:00',
    read: false,
  },
];

const DecorativeBackground = () => (
  <>
    <View style={styles.circle1} />
    <View style={styles.circle2} />
  </>
);

const formatMessageHour = (isoDate: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoDate));

const formatDayLabel = (isoDate: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
  }).format(new Date(isoDate));

export default function PsychologistChatScreen() {
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);
  const [selectedConversationId, setSelectedConversationId] = useState<string>(
    MOCK_CONVERSATIONS[0].id
  );
  const [draft, setDraft] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedConversationId) ?? conversations[0],
    [conversations, selectedConversationId]
  );

  const selectedMessages = useMemo(
    () =>
      messages
        .filter((item) => item.conversationId === selectedConversation.id)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [messages, selectedConversation.id]
  );

  useEffect(() => {
    if (!selectedConversation) return;

    const pollMessages = async () => {
      try {
        // TODO: GET /api/chat/messages/?with=<id>
        // const response = await fetch(`/api/chat/messages/?with=${selectedConversation.patientId}`);
        // const data = await response.json();
        // atualizar mensagens locais com data.results ou estrutura equivalente

        const unreadIncoming = messages.filter(
          (item) =>
            item.conversationId === selectedConversation.id &&
            item.sender === 'patient' &&
            !item.read
        );

        if (unreadIncoming.length > 0) {
          setMessages((current) =>
            current.map((item) =>
              unreadIncoming.some((unread) => unread.id === item.id)
                ? { ...item, read: true }
                : item
            )
          );

          setConversations((current) =>
            current.map((item) =>
              item.id === selectedConversation.id ? { ...item, unreadCount: 0 } : item
            )
          );

          // TODO: PATCH /api/chat/messages/<id>/read/
          // await Promise.all(
          //   unreadIncoming.map((message) =>
          //     fetch(`/api/chat/messages/${message.id}/read/`, { method: 'PATCH' })
          //   )
          // );
        }
      } catch (error) {
        console.log('Erro no polling do chat', error);
      }
    };

    pollMessages();
    const interval = setInterval(pollMessages, 5000);

    return () => clearInterval(interval);
  }, [messages, selectedConversation]);

  const groupedMessages = useMemo(() => {
    const groups: { label: string; items: ChatMessage[] }[] = [];

    selectedMessages.forEach((message) => {
      const label = formatDayLabel(message.createdAt);
      const lastGroup = groups[groups.length - 1];

      if (lastGroup && lastGroup.label === label) {
        lastGroup.items.push(message);
        return;
      }

      groups.push({ label, items: [message] });
    });

    return groups;
  }, [selectedMessages]);

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setConversations((current) =>
      current.map((item) =>
        item.id === conversationId ? { ...item, unreadCount: 0 } : item
      )
    );
  };

  const handleSendMessage = () => {
    const trimmedDraft = draft.trim();
    if (!trimmedDraft) return;

    const now = new Date().toISOString();
    const newMessage: ChatMessage = {
      id: `local-${Date.now()}`,
      conversationId: selectedConversation.id,
      sender: 'psychologist',
      text: trimmedDraft,
      createdAt: now,
      read: true,
    };

    setMessages((current) => [...current, newMessage]);
    setConversations((current) =>
      current.map((item) =>
        item.id === selectedConversation.id
          ? {
              ...item,
              lastMessage: trimmedDraft,
              lastMessageTime: formatMessageHour(now),
            }
          : item
      )
    );
    setDraft('');

    // TODO: POST /api/chat/messages/
    // enviar { with: selectedConversation.patientId, text: trimmedDraft }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={GREEN} />
      <DecorativeBackground />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back-outline" size={22} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerTextBox}>
          <Text style={styles.headerEyebrow}>Area do psicologo</Text>
          <Text style={styles.headerTitle}>Chat com pacientes</Text>
        </View>

        <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/dashboardP')}>
          <Ionicons name="home-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        style={[
          styles.contentScroll,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inboxCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Conversas</Text>
            <View style={styles.cardBadge}>
              <Text style={styles.cardBadgeText}>
                {conversations.reduce((total, item) => total + item.unreadCount, 0)} nao lidas
              </Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.conversationsRow}
          >
            {conversations.map((conversation) => {
              const isActive = conversation.id === selectedConversation.id;

              return (
                <TouchableOpacity
                  key={conversation.id}
                  style={[styles.conversationCard, isActive && styles.conversationCardActive]}
                  onPress={() => handleSelectConversation(conversation.id)}
                  activeOpacity={0.85}
                >
                  <View style={styles.conversationTop}>
                    <View style={styles.avatarWrap}>
                      <View style={[styles.avatar, isActive && styles.avatarActive]}>
                        <Text style={[styles.avatarText, isActive && styles.avatarTextActive]}>
                          {conversation.avatar}
                        </Text>
                      </View>
                      {conversation.online && <View style={styles.onlineDot} />}
                    </View>

                    {conversation.unreadCount > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeText}>{conversation.unreadCount}</Text>
                      </View>
                    )}
                  </View>

                  <Text
                    numberOfLines={1}
                    style={[styles.conversationName, isActive && styles.conversationNameActive]}
                  >
                    {conversation.patientName}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.conversationSnippet,
                      isActive && styles.conversationSnippetActive,
                    ]}
                  >
                    {conversation.lastMessage}
                  </Text>
                  <Text
                    style={[styles.conversationTime, isActive && styles.conversationTimeActive]}
                  >
                    {conversation.lastMessageTime}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.chatCard}>
          <View style={styles.chatHeader}>
            <View style={styles.chatHeaderLeft}>
              <View style={styles.chatHeaderAvatar}>
                <Text style={styles.chatHeaderAvatarText}>{selectedConversation.avatar}</Text>
              </View>
              <View>
                <Text style={styles.chatHeaderName}>{selectedConversation.patientName}</Text>
                <Text style={styles.chatHeaderSubtitle}>{selectedConversation.focus}</Text>
              </View>
            </View>

            <View
              style={[
                styles.presenceBadge,
                selectedConversation.online
                  ? styles.presenceBadgeOnline
                  : styles.presenceBadgeOffline,
              ]}
            >
              <Text
                style={[
                  styles.presenceText,
                  selectedConversation.online
                    ? styles.presenceTextOnline
                    : styles.presenceTextOffline,
                ]}
              >
                {selectedConversation.online ? 'Online' : 'Ausente'}
              </Text>
            </View>
          </View>

          <ScrollView
            style={styles.messagesScroll}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            {groupedMessages.map((group) => (
              <View key={group.label}>
                <View style={styles.datePill}>
                  <Text style={styles.datePillText}>{group.label}</Text>
                </View>

                {group.items.map((message) => {
                  const fromPsychologist = message.sender === 'psychologist';

                  return (
                    <View
                      key={message.id}
                      style={[
                        styles.messageRow,
                        fromPsychologist
                          ? styles.messageRowOutgoing
                          : styles.messageRowIncoming,
                      ]}
                    >
                      <View
                        style={[
                          styles.messageBubble,
                          fromPsychologist
                            ? styles.messageBubbleOutgoing
                            : styles.messageBubbleIncoming,
                        ]}
                      >
                        <Text
                          style={[
                            styles.messageText,
                            fromPsychologist
                              ? styles.messageTextOutgoing
                              : styles.messageTextIncoming,
                          ]}
                        >
                          {message.text}
                        </Text>
                        <Text
                          style={[
                            styles.messageTime,
                            fromPsychologist
                              ? styles.messageTimeOutgoing
                              : styles.messageTimeIncoming,
                          ]}
                        >
                          {formatMessageHour(message.createdAt)}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
          </ScrollView>

          <View style={styles.composer}>
            <TextInput
              style={styles.input}
              placeholder="Escreva uma nova mensagem..."
              placeholderTextColor="#89a89d"
              value={draft}
              onChangeText={setDraft}
              multiline
            />

            <TouchableOpacity
              style={[styles.sendButton, !draft.trim() && styles.sendButtonDisabled]}
              onPress={handleSendMessage}
              disabled={!draft.trim()}
              activeOpacity={0.85}
            >
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.ScrollView>
    </KeyboardAvoidingView>
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
  contentScroll: {
    flex: 1,
  },
  content: {
    padding: 22,
    paddingBottom: 28,
    gap: 16,
  },
  inboxCard: {
    backgroundColor: WHITE,
    borderRadius: 26,
    padding: 16,
    shadowColor: '#174c3e',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#183d32',
  },
  cardBadge: {
    backgroundColor: GREEN_LIGHT,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  cardBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: GREEN,
  },
  conversationsRow: {
    paddingRight: 6,
    gap: 12,
  },
  conversationCard: {
    width: 164,
    borderRadius: 20,
    padding: 14,
    backgroundColor: '#f7fbf9',
    borderWidth: 1,
    borderColor: '#eef5f1',
  },
  conversationCardActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  conversationTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: GREEN_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarActive: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: GREEN,
  },
  avatarTextActive: {
    color: WHITE,
  },
  onlineDot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#45c486',
    borderWidth: 2,
    borderColor: WHITE,
  },
  unreadBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#df5d5d',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: WHITE,
    fontSize: 12,
    fontWeight: '800',
  },
  conversationName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#183d32',
  },
  conversationNameActive: {
    color: WHITE,
  },
  conversationSnippet: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: '#678176',
    minHeight: 34,
  },
  conversationSnippetActive: {
    color: '#d9efe5',
  },
  conversationTime: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    color: '#7c958b',
  },
  conversationTimeActive: {
    color: '#c8e7da',
  },
  chatCard: {
    minHeight: 700,
    backgroundColor: WHITE,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#174c3e',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  chatHeader: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#edf4f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chatHeaderAvatar: {
    width: 50,
    height: 50,
    borderRadius: 17,
    backgroundColor: GREEN_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  chatHeaderAvatarText: {
    fontSize: 17,
    fontWeight: '800',
    color: GREEN,
  },
  chatHeaderName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#183d32',
  },
  chatHeaderSubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: '#6f877d',
  },
  presenceBadge: {
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  presenceBadgeOnline: {
    backgroundColor: '#e8f8ef',
  },
  presenceBadgeOffline: {
    backgroundColor: '#f3f5f4',
  },
  presenceText: {
    fontSize: 12,
    fontWeight: '700',
  },
  presenceTextOnline: {
    color: '#2d9c67',
  },
  presenceTextOffline: {
    color: '#7b8d85',
  },
  messagesScroll: {
    flex: 1,
    backgroundColor: '#fcfefd',
  },
  messagesContent: {
    paddingHorizontal: 18,
    paddingVertical: 18,
    paddingBottom: 28,
  },
  datePill: {
    alignSelf: 'center',
    backgroundColor: '#eef7f2',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginBottom: 14,
    marginTop: 2,
  },
  datePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5d7c71',
  },
  messageRow: {
    marginBottom: 12,
    flexDirection: 'row',
  },
  messageRowIncoming: {
    justifyContent: 'flex-start',
  },
  messageRowOutgoing: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '82%',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  messageBubbleIncoming: {
    backgroundColor: '#eef4f1',
    borderBottomLeftRadius: 8,
  },
  messageBubbleOutgoing: {
    backgroundColor: GREEN,
    borderBottomRightRadius: 8,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextIncoming: {
    color: '#1f3f35',
  },
  messageTextOutgoing: {
    color: WHITE,
  },
  messageTime: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '700',
    alignSelf: 'flex-end',
  },
  messageTimeIncoming: {
    color: '#71877d',
  },
  messageTimeOutgoing: {
    color: '#d6efe4',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#edf4f0',
    backgroundColor: WHITE,
    gap: 12,
  },
  input: {
    flex: 1,
    minHeight: 50,
    maxHeight: 140,
    borderRadius: 18,
    backgroundColor: '#f4faf7',
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 14,
    color: '#1d4136',
  },
  sendButton: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#8fbbaa',
  },
});
