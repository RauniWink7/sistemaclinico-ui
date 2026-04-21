import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  TextInput as RNTextInput,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  getConversations,
  getMessagesWithPsychologist,
  getPsychologists,
  markMessageRead,
  sendChatMessage,
} from "../../services/api";

// Alias para evitar conflitos
const TextInput = RNTextInput;

interface Conversation {
  id: string;
  psychologistId: string;
  psychologistName: string;
  specialty: string;
  avatar: string;
  unreadCount: number;
  lastMessage: string;
  lastMessageTime: string;
  online: boolean;
}

interface ChatMessage {
  id: string;
  conversationId: string;
  sender: "patient" | "psychologist" | string;
  text: string;
  createdAt: string;
  read: boolean;
}

const GREEN = "#2e8b6e";
const GREEN_DARK = "#1e6b54";
const GREEN_LIGHT = "#e8f7f1";
const BG = "#f0faf5";
const WHITE = "#ffffff";

const DecorativeBackground = () => (
  <>
    <View style={styles.circle1} />
    <View style={styles.circle2} />
  </>
);

const formatMessageHour = (isoDate: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoDate));

const formatDayLabel = (isoDate: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
  }).format(new Date(isoDate));

export default function ChatScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedConversationId, setSelectedConversationId] =
    useState<string>("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    const loadConversations = async () => {
      setLoading(true);
      const [conversationsResult, psychologistsResult] = await Promise.all([
        getConversations(),
        getPsychologists(),
      ]);
      if (conversationsResult.ok && Array.isArray(conversationsResult.data)) {
        const psychologistsMap = new Map(
          psychologistsResult.ok && Array.isArray(psychologistsResult.data)
            ? psychologistsResult.data.map((p) => [p.id, p.user.id])
            : [],
        );
        const normalized = conversationsResult.data.map((item) => ({
          id: item.id,
          psychologistId:
            psychologistsMap.get(item.psychologist_id ?? "") ||
            item.psychologist_id ||
            "",
          psychologistName:
            item.psychologistName || item.psychologistNameAlt || "Psicólogo",
          specialty: item.specialty || "Psicologia",
          avatar:
            item.avatar ||
            item.psychologistName
              ?.split(" ")
              .map((part) => part[0])
              .slice(0, 2)
              .join("") ||
            "P",
          unreadCount: item.unread_count ?? 0,
          lastMessage: item.last_message || "",
          lastMessageTime: item.last_message_time || "",
          online: item.online ?? false,
        }));

        setConversations(normalized);
        setSelectedConversationId(normalized[0]?.id || "");
      } else {
        Alert.alert(
          "Erro",
          conversationsResult.error ||
            "Não foi possível carregar as conversas.",
        );
      }
      setLoading(false);
    };

    void loadConversations();
  }, []);

  const selectedConversation = useMemo(
    () =>
      conversations.find((item) => item.id === selectedConversationId) ??
      conversations[0] ?? {
        id: "",
        psychologistId: "",
        psychologistName: "",
        specialty: "",
        avatar: "",
        unreadCount: 0,
        lastMessage: "",
        lastMessageTime: "",
        online: false,
      },
    [conversations, selectedConversationId],
  );

  const selectedMessages = useMemo(
    () =>
      messages
        .filter((item) => item.conversationId === selectedConversation.id)
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        ),
    [messages, selectedConversation.id],
  );

  useEffect(() => {
    if (!selectedConversation?.id) return;

    const loadMessages = async () => {
      try {
        const result = await getMessagesWithPsychologist(
          selectedConversation.psychologistId,
        );
        if (result.ok && Array.isArray(result.data)) {
          const normalized = result.data.map((item) => ({
            id: item.id,
            conversationId:
              item.conversation_id ||
              item.conversation ||
              selectedConversation.id,
            sender: item.sender === "psychologist" ? "psychologist" : "patient",
            text: item.text || item.content_encrypted || "",
            createdAt: item.created_at,
            read: item.read ?? true,
          }));

          setMessages(normalized);
          setConversations((current) =>
            current.map((item) =>
              item.id === selectedConversation.id
                ? { ...item, unreadCount: 0 }
                : item,
            ),
          );

          const unreadIncoming = normalized.filter(
            (item) =>
              item.conversationId === selectedConversation.id &&
              item.sender === "psychologist" &&
              !item.read,
          );

          await Promise.all(
            unreadIncoming.map((message) => markMessageRead(message.id)),
          );
        }
      } catch (error) {
        console.log("Erro no carregamento do chat", error);
      }
    };

    void loadMessages();
  }, [selectedConversation]);

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
        item.id === conversationId ? { ...item, unreadCount: 0 } : item,
      ),
    );
  };

  const handleSendMessage = async () => {
    const trimmedDraft = draft.trim();
    if (!trimmedDraft || !selectedConversation?.id) return;

    const now = new Date().toISOString();
    const outgoing: ChatMessage = {
      id: `local-${Date.now()}`,
      conversationId: selectedConversation.id,
      sender: "patient",
      text: trimmedDraft,
      createdAt: now,
      read: true,
    };

    setMessages((current) => [...current, outgoing]);
    setConversations((current) =>
      current.map((item) =>
        item.id === selectedConversation.id
          ? {
              ...item,
              lastMessage: trimmedDraft,
              lastMessageTime: formatMessageHour(now),
            }
          : item,
      ),
    );
    setDraft("");

    const result = await sendChatMessage(
      selectedConversation.psychologistId,
      trimmedDraft,
    );
    if (!result.ok) {
      Alert.alert(
        "Erro",
        result.error || "Não foi possível enviar a mensagem.",
      );
      return;
    }

    if (result.data) {
      setMessages((current) =>
        current.map((message) =>
          message.id === outgoing.id
            ? {
                ...message,
                id: result.data?.id || message.id,
              }
            : message,
        ),
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={GREEN} />
      <DecorativeBackground />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back-outline" size={22} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerTextBox}>
          <Text style={styles.headerEyebrow}>Area do paciente</Text>
          <Text style={styles.headerTitle}>Chat com o psicologo</Text>
        </View>

        <View style={styles.headerSpacer} />
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
                {conversations.reduce(
                  (total, item) => total + item.unreadCount,
                  0,
                )}{" "}
                nao lidas
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
                  style={[
                    styles.conversationCard,
                    isActive && styles.conversationCardActive,
                  ]}
                  onPress={() => handleSelectConversation(conversation.id)}
                  activeOpacity={0.85}
                >
                  <View style={styles.conversationTop}>
                    <View style={styles.avatarWrap}>
                      <View
                        style={[styles.avatar, isActive && styles.avatarActive]}
                      >
                        <Text
                          style={[
                            styles.avatarText,
                            isActive && styles.avatarTextActive,
                          ]}
                        >
                          {conversation.avatar}
                        </Text>
                      </View>
                      {conversation.online && <View style={styles.onlineDot} />}
                    </View>

                    {conversation.unreadCount > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeText}>
                          {conversation.unreadCount}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text
                    numberOfLines={1}
                    style={[
                      styles.conversationName,
                      isActive && styles.conversationNameActive,
                    ]}
                  >
                    {conversation.psychologistName}
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
                    style={[
                      styles.conversationTime,
                      isActive && styles.conversationTimeActive,
                    ]}
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
                <Text style={styles.chatHeaderAvatarText}>
                  {selectedConversation.avatar}
                </Text>
              </View>
              <View>
                <Text style={styles.chatHeaderName}>
                  {selectedConversation.psychologistName}
                </Text>
                <Text style={styles.chatHeaderSubtitle}>
                  {selectedConversation.specialty}
                </Text>
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
                {selectedConversation.online ? "Online" : "Ausente"}
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
                  const fromPatient = message.sender === "patient";

                  return (
                    <View
                      key={message.id}
                      style={[
                        styles.messageRow,
                        fromPatient
                          ? styles.messageRowOutgoing
                          : styles.messageRowIncoming,
                      ]}
                    >
                      <View
                        style={[
                          styles.messageBubble,
                          fromPatient
                            ? styles.messageBubbleOutgoing
                            : styles.messageBubbleIncoming,
                        ]}
                      >
                        <Text
                          style={[
                            styles.messageText,
                            fromPatient
                              ? styles.messageTextOutgoing
                              : styles.messageTextIncoming,
                          ]}
                        >
                          {message.text}
                        </Text>
                        <Text
                          style={[
                            styles.messageTime,
                            fromPatient
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
              style={[
                styles.sendButton,
                !draft.trim() && styles.sendButtonDisabled,
              ]}
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
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "#27795f",
    top: -110,
    right: -70,
    opacity: 0.45,
  },
  circle2: {
    position: "absolute",
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextBox: {
    flex: 1,
    marginHorizontal: 14,
  },
  headerEyebrow: {
    color: "#bce3d5",
    fontSize: 13,
    fontWeight: "600",
  },
  headerTitle: {
    color: WHITE,
    fontSize: 24,
    fontWeight: "800",
    marginTop: 2,
    letterSpacing: -0.4,
  },
  headerSpacer: {
    width: 42,
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
    shadowColor: "#174c3e",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#183d32",
  },
  cardBadge: {
    backgroundColor: GREEN_LIGHT,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  cardBadgeText: {
    fontSize: 12,
    fontWeight: "700",
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
    backgroundColor: "#f7fbf9",
    borderWidth: 1,
    borderColor: "#eef5f1",
  },
  conversationCardActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  conversationTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  avatarWrap: {
    position: "relative",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: GREEN_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarActive: {
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "800",
    color: GREEN,
  },
  avatarTextActive: {
    color: WHITE,
  },
  onlineDot: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#45c486",
    borderWidth: 2,
    borderColor: WHITE,
  },
  unreadBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#df5d5d",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: WHITE,
    fontSize: 12,
    fontWeight: "800",
  },
  conversationName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#183d32",
  },
  conversationNameActive: {
    color: WHITE,
  },
  conversationSnippet: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: "#678176",
    minHeight: 34,
  },
  conversationSnippetActive: {
    color: "#d9efe5",
  },
  conversationTime: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "700",
    color: "#7c958b",
  },
  conversationTimeActive: {
    color: "#c8e7da",
  },
  chatCard: {
    minHeight: 700,
    backgroundColor: WHITE,
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#174c3e",
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
    borderBottomColor: "#edf4f0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chatHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  chatHeaderAvatar: {
    width: 50,
    height: 50,
    borderRadius: 17,
    backgroundColor: GREEN_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  chatHeaderAvatarText: {
    fontSize: 17,
    fontWeight: "800",
    color: GREEN,
  },
  chatHeaderName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#183d32",
  },
  chatHeaderSubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: "#6f877d",
  },
  presenceBadge: {
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  presenceBadgeOnline: {
    backgroundColor: "#e8f8ef",
  },
  presenceBadgeOffline: {
    backgroundColor: "#f3f5f4",
  },
  presenceText: {
    fontSize: 12,
    fontWeight: "700",
  },
  presenceTextOnline: {
    color: "#2d9c67",
  },
  presenceTextOffline: {
    color: "#7b8d85",
  },
  messagesScroll: {
    flex: 1,
    backgroundColor: "#fcfefd",
  },
  messagesContent: {
    paddingHorizontal: 18,
    paddingVertical: 18,
    paddingBottom: 28,
  },
  datePill: {
    alignSelf: "center",
    backgroundColor: "#eef7f2",
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginBottom: 14,
    marginTop: 2,
  },
  datePillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#5d7c71",
  },
  messageRow: {
    marginBottom: 12,
    flexDirection: "row",
  },
  messageRowIncoming: {
    justifyContent: "flex-start",
  },
  messageRowOutgoing: {
    justifyContent: "flex-end",
  },
  messageBubble: {
    maxWidth: "82%",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  messageBubbleIncoming: {
    backgroundColor: "#eef4f1",
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
    color: "#1f3f35",
  },
  messageTextOutgoing: {
    color: WHITE,
  },
  messageTime: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: "700",
    alignSelf: "flex-end",
  },
  messageTimeIncoming: {
    color: "#71877d",
  },
  messageTimeOutgoing: {
    color: "#d6efe4",
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#edf4f0",
    backgroundColor: WHITE,
    gap: 12,
  },
  input: {
    flex: 1,
    minHeight: 50,
    maxHeight: 140,
    borderRadius: 18,
    backgroundColor: "#f4faf7",
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 14,
    color: "#1d4136",
  },
  sendButton: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#8fbbaa",
  },
});
