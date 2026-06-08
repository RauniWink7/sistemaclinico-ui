/**
 * app/(shared)/chat.tsx
 *
 * Tela de chat unificada — funciona para paciente, profissional e admin.
 * Cada usuário vê apenas suas próprias conversas (filtrado pelo backend).
 *
 * Conexão: WebSocket (tempo real) com fallback para REST na carga inicial.
 * - ws://localhost:8000/ws/chat/<contact_id>/?token=<access_token>
 * - Eventos suportados: message.new, message.read, typing, presence
 *
 * Roteamento de volta: usa a role do token JWT para voltar ao dashboard correto.
 */

import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    KeyboardAvoidingView,
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
import {
    getAccessToken,
    getChatContacts,
    getConversations,
    getMe,
    getMessagesWithPsychologist,
    markMessagesRead,
    sendChatMessage,
} from "../../services/api";

// ─── Paleta ───────────────────────────────────────────────────────────────────
const GREEN = "#2e8b6e";
const GREEN_DARK = "#1e6b54";
const GREEN_LIGHT = "#e8f7f1";
const BG = "#f0faf5";
const WHITE = "#ffffff";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatHour = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

const formatDayLabel = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
  }).format(new Date(iso));

const getInitials = (name: string): string => {
  const parts = (name || "").trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Role → rota do dashboard
const dashboardForRole = (role: string): string => {
  switch (role?.toLowerCase()) {
    case "admin":
      return "/(admin)";
    case "professional":
    case "psychologist":
      return "/(psychologist)/dashboardP";
    default:
      return "/(patient)/homep";
  }
};

// ─── WS_BASE_URL ──────────────────────────────────────────────────────────────
// TODO: definir EXPO_PUBLIC_WS_URL no .env de produção
const WS_BASE_URL =
  process.env.EXPO_PUBLIC_WS_URL ??
  (Platform.select({
    android: "ws://10.0.2.2:8000/ws/chat",
    default: "ws://127.0.0.1:8000/ws/chat",
  }) as string);

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Conversation {
  contactUserId: string; // user.id do outro lado — usado no WS e no envio REST
  contactName: string;
  contactRole: string;
  initials: string;
  unread: number;
  lastText: string;
  lastAt: string;
  online: boolean;
}

interface Message {
  id: string;
  senderId: string; // user.id de quem enviou
  text: string;
  createdAt: string;
  read: boolean;
  pending?: boolean; // mensagem otimista ainda não confirmada pelo backend
}

interface Contact {
  id: string;
  full_name: string;
  role: string;
  initials: string;
}

// ─── Componente de fundo decorativo ──────────────────────────────────────────
const DecorativeBackground = () => (
  <>
    <View style={styles.circle1} />
    <View style={styles.circle2} />
  </>
);

// ─── Tela principal ───────────────────────────────────────────────────────────
export default function ChatScreen() {
  // Auth
  const [myUserId, setMyUserId] = useState<string>("");
  const [myRole, setMyRole] = useState<string>("");

  // Dados
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeContactId, setActiveContactId] = useState<string>("");

  // UI
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [isTyping, setIsTyping] = useState(false); // o outro lado está digitando
  const [contactOnline, setContactOnline] = useState(false);

  // Modal novo contato
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactSearch, setContactSearch] = useState("");

  // WebSocket
  const wsRef = useRef<WebSocket | null>(null);
  const wsContactRef = useRef<string>(""); // contactId da conexão WS ativa

  // Animação de entrada
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const scrollRef = useRef<ScrollView>(null);

  // ─── Carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    const boot = async () => {
      setLoading(true);
      try {
        // Identificar quem está logado
        const meResult = await getMe();
        if (!meResult.ok || !meResult.data) {
          Alert.alert("Erro", "Sessão expirada. Faça login novamente.");
          router.replace("/login");
          return;
        }
        const me = meResult.data;
        setMyUserId(me.id);
        setMyRole(me.role || "patient");

        // Carregar conversas existentes
        const convResult = await getConversations();
        if (convResult.ok && Array.isArray(convResult.data)) {
          const mapped: Conversation[] = convResult.data.map((item: any) => {
            const contact = item.contact || {};
            // last_message é um objeto { content_encrypted, sent_at, ... }
            const lastMsg =
              typeof item.last_message === "object" &&
              item.last_message !== null
                ? item.last_message
                : {};
            return {
              contactUserId: contact.id || item.user_id || "",
              contactName: contact.full_name || item.user_name || "Contato",
              contactRole: contact.role || "",
              initials:
                contact.initials ||
                getInitials(contact.full_name || item.user_name || ""),
              unread: item.unread_count ?? item.unread ?? 0,
              lastText:
                item.last_message_text || lastMsg.content_encrypted || "",
              lastAt: item.last_message_at
                ? String(item.last_message_at)
                : lastMsg.sent_at
                  ? String(lastMsg.sent_at)
                  : "",
              online: false,
            };
          });

          setConversations(mapped);

          // Abre a primeira conversa automaticamente
          if (mapped.length > 0) {
            setActiveContactId(mapped[0].contactUserId);
          }
        }
      } catch {
        Alert.alert("Erro", "Não foi possível carregar as conversas.");
      } finally {
        setLoading(false);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 450,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 450,
            useNativeDriver: true,
          }),
        ]).start();
      }
    };

    void boot();

    return () => {
      disconnectWs();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Carregar mensagens REST + abrir WS quando activeContactId muda ─────────
  useEffect(() => {
    if (!activeContactId || !myUserId) return;

    const loadAndConnect = async () => {
      // 1. Busca histórico via REST
      try {
        const result = await getMessagesWithPsychologist(activeContactId);
        if (result.ok && Array.isArray(result.data)) {
          const mapped: Message[] = result.data.map((msg: any) => ({
            id: msg.id,
            senderId: msg.sender_id || msg.sender || "",
            text: msg.content_encrypted || msg.text || "",
            createdAt: msg.created_at || msg.sent_at || "",
            read: msg.read ?? true,
          }));
          setMessages(mapped);
          scrollToBottom(false);
        }
      } catch {
        // silencioso — WS vai cobrir
      }

      // 2. Marca como lidas
      await markMessagesRead(activeContactId).catch(() => null);
      setConversations((prev) =>
        prev.map((c) =>
          c.contactUserId === activeContactId ? { ...c, unread: 0 } : c,
        ),
      );

      // 3. Conecta WebSocket
      connectWs(activeContactId);
    };

    void loadAndConnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeContactId, myUserId]);

  // ─── WebSocket ──────────────────────────────────────────────────────────────
  const disconnectWs = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    wsContactRef.current = "";
    setIsTyping(false);
    setContactOnline(false);
  }, []);

  const connectWs = useCallback(
    async (contactId: string) => {
      // Fecha conexão anterior se for para outro contato
      if (wsRef.current && wsContactRef.current !== contactId) {
        disconnectWs();
      }

      // Já conectado para este contato
      if (wsRef.current && wsContactRef.current === contactId) return;

      const token = await getAccessToken();
      if (!token) return;

      const url = `${WS_BASE_URL}/${contactId}/?token=${token}`;
      wsContactRef.current = contactId;

      let ws: WebSocket;
      try {
        ws = new WebSocket(url);
      } catch {
        return;
      }

      wsRef.current = ws;

      ws.onopen = () => {
        // Conexão estabelecida
      };

      ws.onmessage = (event) => {
        try {
          const frame = JSON.parse(event.data as string);
          handleWsFrame(frame, contactId);
        } catch {
          // ignora frames inválidos
        }
      };

      ws.onerror = () => {
        // Silencioso — o app ainda funciona via REST
      };

      ws.onclose = (e) => {
        if (e.code === 4401) {
          Alert.alert("Sessão expirada", "Faça login novamente.");
          router.replace("/login");
          return;
        }
        // Reconecta após 3s se o contato ativo não mudou
        setTimeout(() => {
          if (wsContactRef.current === contactId && wsRef.current === ws) {
            wsRef.current = null;
            connectWs(contactId);
          }
        }, 3000);
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [disconnectWs],
  );

  const handleWsFrame = useCallback(
    (frame: any, contactId: string) => {
      const { type, payload } = frame;

      if (type === "message.new") {
        const incoming: Message = {
          id: payload.id,
          senderId: payload.sender,
          text: payload.content_encrypted || "",
          createdAt: payload.sent_at || new Date().toISOString(),
          read: payload.read ?? false,
        };

        setMessages((prev) => {
          // Substitui mensagem pendente se tiver o mesmo conteúdo enviado agora
          const replaced = prev.map((m) =>
            m.pending &&
            m.text === incoming.text &&
            m.senderId === incoming.senderId
              ? { ...incoming }
              : m,
          );
          // Se não substituiu, adiciona nova
          const alreadyExists = replaced.some((m) => m.id === incoming.id);
          return alreadyExists ? replaced : [...replaced, incoming];
        });

        // Atualiza snippet da conversa
        setConversations((prev) =>
          prev.map((c) =>
            c.contactUserId === contactId
              ? {
                  ...c,
                  lastText: incoming.text,
                  lastAt: incoming.createdAt,
                  // Se é mensagem do outro lado, incrementa unread (a menos que esteja ativo)
                  unread:
                    incoming.senderId !== myUserId ? c.unread + 1 : c.unread,
                }
              : c,
          ),
        );

        // Marca como lida se a conversa está ativa
        if (incoming.senderId !== myUserId) {
          wsRef.current?.send(
            JSON.stringify({
              type: "message.read",
              payload: { message_id: incoming.id },
            }),
          );
          setConversations((prev) =>
            prev.map((c) =>
              c.contactUserId === contactId ? { ...c, unread: 0 } : c,
            ),
          );
        }

        scrollToBottom(true);
        return;
      }

      if (type === "message.read") {
        setMessages((prev) =>
          prev.map((m) => (m.id === payload.id ? { ...m, read: true } : m)),
        );
        return;
      }

      if (type === "typing") {
        if (payload.user !== myUserId) {
          setIsTyping(payload.is_typing ?? true);
          // Limpa o indicador de typing após 3s
          setTimeout(() => setIsTyping(false), 3000);
        }
        return;
      }

      if (type === "presence") {
        if (payload.user !== myUserId) {
          setContactOnline(payload.online ?? false);
          setConversations((prev) =>
            prev.map((c) =>
              c.contactUserId === contactId
                ? { ...c, online: payload.online ?? false }
                : c,
            ),
          );
        }
        return;
      }
    },
    [myUserId],
  );

  // ─── Enviar mensagem ────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text || !activeContactId) return;

    setDraft("");

    const now = new Date().toISOString();
    const tempId = `pending-${Date.now()}`;

    // Mensagem otimista
    const optimistic: Message = {
      id: tempId,
      senderId: myUserId,
      text,
      createdAt: now,
      read: true,
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setConversations((prev) =>
      prev.map((c) =>
        c.contactUserId === activeContactId
          ? { ...c, lastText: text, lastAt: now }
          : c,
      ),
    );
    scrollToBottom(true);

    // Tenta via WebSocket primeiro (mais rápido)
    const wsSent =
      wsRef.current?.readyState === WebSocket.OPEN &&
      (() => {
        wsRef.current!.send(
          JSON.stringify({
            type: "message.new",
            payload: { content_encrypted: text, message_type: "text" },
          }),
        );
        return true;
      })();

    if (!wsSent) {
      // Fallback REST
      const result = await sendChatMessage(activeContactId, text);
      if (!result.ok) {
        Alert.alert("Erro", result.error || "Não foi possível enviar.");
        // Remove mensagem otimista em caso de falha
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        return;
      }
      if (result.data) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? { ...optimistic, id: result.data?.id || tempId, pending: false }
              : m,
          ),
        );
      }
    }
  }, [draft, activeContactId, myUserId]);

  // ─── Enviar indicador de typing ─────────────────────────────────────────────
  const handleDraftChange = useCallback((text: string) => {
    setDraft(text);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "typing",
          payload: { is_typing: text.length > 0 },
        }),
      );
    }
  }, []);

  // ─── Abrir modal de novo contato ────────────────────────────────────────────
  const handleOpenNewContact = useCallback(async () => {
    setContactSearch("");
    setContactModalVisible(true);
    setContactsLoading(true);
    try {
      const result = await getChatContacts();
      if (result.ok && Array.isArray(result.data)) {
        setContacts(result.data);
      } else {
        Alert.alert(
          "Erro",
          result.error || "Não foi possível carregar contatos.",
        );
        setContactModalVisible(false);
      }
    } catch {
      Alert.alert("Erro", "Não foi possível carregar contatos.");
      setContactModalVisible(false);
    } finally {
      setContactsLoading(false);
    }
  }, []);
  // ─── Selecionar conversa ────────────────────────────────────────────────────
  const handleSelectConversation = useCallback(
    (contactId: string) => {
      if (contactId === activeContactId) return;
      setMessages([]);
      setIsTyping(false);
      setContactOnline(false);
      setActiveContactId(contactId);
    },
    [activeContactId],
  );

  // ─── Scroll automático ───────────────────────────────────────────────────────
  const scrollToBottom = (animated: boolean) => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated }), 100);
  };
  // ─── Iniciar conversa com contato selecionado ────────────────────────────────
  const handleStartConversation = useCallback(
    (contact: Contact) => {
      setContactModalVisible(false);
      setContactSearch("");

      // Se já existe conversa com esse contato, só seleciona
      const existing = conversations.find(
        (c) => c.contactUserId === contact.id,
      );
      if (existing) {
        handleSelectConversation(contact.id);
        return;
      }

      // Cria entrada local da conversa (sem mensagens ainda)
      const newConv: Conversation = {
        contactUserId: contact.id,
        contactName: contact.full_name,
        contactRole: contact.role,
        initials: contact.initials || getInitials(contact.full_name),
        unread: 0,
        lastText: "",
        lastAt: "",
        online: false,
      };
      setConversations((prev) => [newConv, ...prev]);
      setActiveContactId(contact.id);
    },
    [conversations, handleSelectConversation],
  );

  // ─── Derived state ───────────────────────────────────────────────────────────
  const activeConversation = useMemo(
    () => conversations.find((c) => c.contactUserId === activeContactId),
    [conversations, activeContactId],
  );

  const activeMessages = useMemo(
    () =>
      [...messages].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
    [messages],
  );

  const groupedMessages = useMemo(() => {
    const groups: { label: string; items: Message[] }[] = [];
    activeMessages.forEach((m) => {
      const label = formatDayLabel(m.createdAt);
      const last = groups[groups.length - 1];
      if (last?.label === label) {
        last.items.push(m);
      } else {
        groups.push({ label, items: [m] });
      }
    });
    return groups;
  }, [activeMessages]);

  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + c.unread, 0),
    [conversations],
  );

  const filteredContacts = useMemo(() => {
    const q = contactSearch.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => c.full_name.toLowerCase().includes(q));
  }, [contacts, contactSearch]);

  const backRoute = dashboardForRole(myRole);

  // ─── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.loadingText}>Carregando conversas…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={GREEN} />
      <DecorativeBackground />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace(backRoute as any)}
        >
          <Ionicons name="arrow-back-outline" size={22} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerTextBox}>
          <Text style={styles.headerEyebrow}>Mensagens</Text>
          <Text style={styles.headerTitle}>Chat</Text>
        </View>

        <View style={styles.wsIndicator}>
          <View
            style={[
              styles.wsDot,
              wsRef.current?.readyState === WebSocket.OPEN
                ? styles.wsDotConnected
                : styles.wsDotDisconnected,
            ]}
          />
        </View>
      </View>

      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* ── Painel de conversas ──────────────────────────────────────────── */}
        <View style={styles.inboxCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Conversas</Text>
            <View style={styles.cardHeaderRight}>
              {totalUnread > 0 && (
                <View style={styles.cardBadge}>
                  <Text style={styles.cardBadgeText}>
                    {totalUnread} não {totalUnread === 1 ? "lida" : "lidas"}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.newChatBtn}
                onPress={handleOpenNewContact}
                activeOpacity={0.8}
              >
                <Ionicons name="create-outline" size={18} color={GREEN} />
              </TouchableOpacity>
            </View>
          </View>

          {conversations.length === 0 ? (
            <View style={styles.emptyConvWrap}>
              <Ionicons name="chatbubbles-outline" size={36} color="#a8c5bb" />
              <Text style={styles.emptyConvText}>Nenhuma conversa ainda.</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.conversationsRow}
            >
              {conversations.map((conv) => {
                const isActive = conv.contactUserId === activeContactId;
                return (
                  <TouchableOpacity
                    key={conv.contactUserId}
                    style={[styles.convCard, isActive && styles.convCardActive]}
                    onPress={() => handleSelectConversation(conv.contactUserId)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.convTop}>
                      <View style={styles.avatarWrap}>
                        <View
                          style={[
                            styles.avatar,
                            isActive && styles.avatarActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.avatarText,
                              isActive && styles.avatarTextActive,
                            ]}
                          >
                            {conv.initials}
                          </Text>
                        </View>
                        {conv.online && <View style={styles.onlineDot} />}
                      </View>

                      {conv.unread > 0 && (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadBadgeText}>
                            {conv.unread}
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text
                      numberOfLines={1}
                      style={[
                        styles.convName,
                        isActive && styles.convNameActive,
                      ]}
                    >
                      {conv.contactName}
                    </Text>
                    <Text
                      numberOfLines={2}
                      style={[
                        styles.convSnippet,
                        isActive && styles.convSnippetActive,
                      ]}
                    >
                      {conv.lastText || "Iniciar conversa"}
                    </Text>
                    {!!conv.lastAt && (
                      <Text
                        style={[
                          styles.convTime,
                          isActive && styles.convTimeActive,
                        ]}
                      >
                        {formatHour(conv.lastAt)}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* ── Área de mensagens ────────────────────────────────────────────── */}
        {activeConversation ? (
          <View style={styles.chatCard}>
            {/* Chat header */}
            <View style={styles.chatHeader}>
              <View style={styles.chatHeaderLeft}>
                <View style={styles.chatAvatarBox}>
                  <Text style={styles.chatAvatarText}>
                    {activeConversation.initials}
                  </Text>
                </View>
                <View>
                  <Text style={styles.chatName}>
                    {activeConversation.contactName}
                  </Text>
                  <Text style={styles.chatSub}>
                    {isTyping
                      ? "digitando…"
                      : contactOnline
                        ? "Online"
                        : activeConversation.contactRole === "professional"
                          ? "Profissional"
                          : activeConversation.contactRole === "patient"
                            ? "Paciente"
                            : "Admin"}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.presencePill,
                  contactOnline
                    ? styles.presencePillOnline
                    : styles.presencePillOffline,
                ]}
              >
                <View
                  style={[
                    styles.presenceDot,
                    contactOnline
                      ? styles.presenceDotOnline
                      : styles.presenceDotOffline,
                  ]}
                />
                <Text
                  style={[
                    styles.presenceText,
                    contactOnline
                      ? styles.presenceTextOnline
                      : styles.presenceTextOffline,
                  ]}
                >
                  {contactOnline ? "Online" : "Ausente"}
                </Text>
              </View>
            </View>

            {/* Mensagens */}
            <ScrollView
              ref={scrollRef}
              style={styles.msgScroll}
              contentContainerStyle={styles.msgContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              onContentSizeChange={() => scrollToBottom(false)}
            >
              {groupedMessages.length === 0 ? (
                <View style={styles.emptyMsgWrap}>
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={40}
                    color="#bdd9ce"
                  />
                  <Text style={styles.emptyMsgText}>
                    Nenhuma mensagem ainda.{"\n"}Diga olá!
                  </Text>
                </View>
              ) : (
                groupedMessages.map((group) => (
                  <View key={group.label}>
                    <View style={styles.datePill}>
                      <Text style={styles.datePillText}>{group.label}</Text>
                    </View>

                    {group.items.map((msg) => {
                      const isMine = msg.senderId === myUserId;
                      return (
                        <View
                          key={msg.id}
                          style={[
                            styles.msgRow,
                            isMine ? styles.msgRowOut : styles.msgRowIn,
                          ]}
                        >
                          <View
                            style={[
                              styles.bubble,
                              isMine ? styles.bubbleOut : styles.bubbleIn,
                              msg.pending && styles.bubblePending,
                            ]}
                          >
                            <Text
                              style={[
                                styles.bubbleText,
                                isMine
                                  ? styles.bubbleTextOut
                                  : styles.bubbleTextIn,
                              ]}
                            >
                              {msg.text}
                            </Text>
                            <View style={styles.bubbleMeta}>
                              <Text
                                style={[
                                  styles.msgTime,
                                  isMine ? styles.msgTimeOut : styles.msgTimeIn,
                                ]}
                              >
                                {formatHour(msg.createdAt)}
                              </Text>
                              {isMine && (
                                <Ionicons
                                  name={
                                    msg.pending
                                      ? "time-outline"
                                      : msg.read
                                        ? "checkmark-done"
                                        : "checkmark"
                                  }
                                  size={13}
                                  color={
                                    msg.pending
                                      ? "#b0d8ca"
                                      : msg.read
                                        ? "#a8e6cc"
                                        : "#c9e8de"
                                  }
                                  style={{ marginLeft: 4 }}
                                />
                              )}
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ))
              )}

              {/* Indicador de "digitando" */}
              {isTyping && (
                <View style={styles.msgRowIn}>
                  <View
                    style={[
                      styles.bubble,
                      styles.bubbleIn,
                      styles.typingBubble,
                    ]}
                  >
                    <View style={styles.typingDots}>
                      <View style={[styles.dot, styles.dot1]} />
                      <View style={[styles.dot, styles.dot2]} />
                      <View style={[styles.dot, styles.dot3]} />
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Composer */}
            <View style={styles.composer}>
              <TextInput
                style={styles.input}
                placeholder="Escreva uma mensagem…"
                placeholderTextColor="#89a89d"
                value={draft}
                onChangeText={handleDraftChange}
                multiline
                maxLength={2000}
              />
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  !draft.trim() && styles.sendBtnDisabled,
                ]}
                onPress={handleSend}
                disabled={!draft.trim()}
                activeOpacity={0.85}
              >
                <Ionicons name="send" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.noChatCard}>
            <Ionicons name="chatbubbles-outline" size={52} color="#b8d9ce" />
            <Text style={styles.noChatText}>
              Selecione uma conversa para começar.
            </Text>
          </View>
        )}
      </Animated.View>

      {/* ── Modal: Nova Conversa ─────────────────────────────────────────── */}
      <Modal
        visible={contactModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setContactModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setContactModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.modalSheet}
            onPress={() => {}}
          >
            {/* Handle */}
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nova conversa</Text>
              <TouchableOpacity
                onPress={() => setContactModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#4a7066" />
              </TouchableOpacity>
            </View>

            {/* Busca */}
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={16} color="#7ba897" />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por nome…"
                placeholderTextColor="#9abfb4"
                value={contactSearch}
                onChangeText={setContactSearch}
                autoFocus
              />
              {contactSearch.length > 0 && (
                <TouchableOpacity onPress={() => setContactSearch("")}>
                  <Ionicons name="close-circle" size={16} color="#9abfb4" />
                </TouchableOpacity>
              )}
            </View>

            {/* Lista */}
            {contactsLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator color={GREEN} />
                <Text style={styles.modalLoadingText}>Carregando…</Text>
              </View>
            ) : filteredContacts.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Ionicons name="person-outline" size={36} color="#b8d9ce" />
                <Text style={styles.modalEmptyText}>
                  {contactSearch
                    ? "Nenhum contato encontrado."
                    : "Sem contatos disponíveis."}
                </Text>
              </View>
            ) : (
              <ScrollView
                style={styles.modalList}
                showsVerticalScrollIndicator={false}
              >
                {filteredContacts.map((contact) => {
                  const roleLabel =
                    contact.role === "professional"
                      ? "Profissional"
                      : contact.role === "patient"
                        ? "Paciente"
                        : contact.role === "admin"
                          ? "Admin"
                          : contact.role;
                  const alreadyHasConv = conversations.some(
                    (c) => c.contactUserId === contact.id,
                  );
                  return (
                    <TouchableOpacity
                      key={contact.id}
                      style={styles.contactRow}
                      onPress={() => handleStartConversation(contact)}
                      activeOpacity={0.75}
                    >
                      <View style={styles.contactAvatar}>
                        <Text style={styles.contactAvatarText}>
                          {contact.initials || getInitials(contact.full_name)}
                        </Text>
                      </View>
                      <View style={styles.contactInfo}>
                        <Text style={styles.contactName}>
                          {contact.full_name}
                        </Text>
                        <Text style={styles.contactRole}>{roleLabel}</Text>
                      </View>
                      {alreadyHasConv ? (
                        <View style={styles.contactExistingTag}>
                          <Text style={styles.contactExistingText}>
                            Conversa aberta
                          </Text>
                        </View>
                      ) : (
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color="#a8c5bb"
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  loadingText: {
    fontSize: 15,
    color: GREEN_DARK,
    fontWeight: "600",
  },

  // Decoração
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

  // Header
  header: {
    paddingTop: 56,
    paddingBottom: 22,
    paddingHorizontal: 24,
    backgroundColor: GREEN,
    flexDirection: "row",
    alignItems: "center",
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
    letterSpacing: -0.4,
    marginTop: 2,
  },
  wsIndicator: {
    width: 42,
    alignItems: "center",
  },
  wsDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
  },
  wsDotConnected: {
    backgroundColor: "#45e68a",
  },
  wsDotDisconnected: {
    backgroundColor: "rgba(255,255,255,0.3)",
  },

  // Conteúdo animado
  content: {
    flex: 1,
    padding: 20,
    paddingBottom: 28,
    gap: 16,
  },

  // Card de conversas
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
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  cardBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: GREEN,
  },
  emptyConvWrap: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 8,
  },
  emptyConvText: {
    color: "#8aaca3",
    fontSize: 14,
    fontWeight: "600",
  },
  conversationsRow: {
    paddingRight: 4,
    gap: 12,
  },

  // Cada card de conversa
  convCard: {
    width: 160,
    borderRadius: 20,
    padding: 14,
    backgroundColor: "#f7fbf9",
    borderWidth: 1,
    borderColor: "#eef5f1",
  },
  convCardActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  convTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  avatarWrap: { position: "relative" },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: GREEN_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarActive: { backgroundColor: "rgba(255,255,255,0.18)" },
  avatarText: { fontSize: 15, fontWeight: "800", color: GREEN },
  avatarTextActive: { color: WHITE },
  onlineDot: {
    position: "absolute",
    right: -1,
    bottom: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#45c486",
    borderWidth: 2,
    borderColor: WHITE,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#df5d5d",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  unreadBadgeText: { color: WHITE, fontSize: 11, fontWeight: "800" },
  convName: { fontSize: 14, fontWeight: "700", color: "#183d32" },
  convNameActive: { color: WHITE },
  convSnippet: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: "#678176",
    minHeight: 34,
  },
  convSnippetActive: { color: "#d9efe5" },
  convTime: { marginTop: 6, fontSize: 11, fontWeight: "700", color: "#7c958b" },
  convTimeActive: { color: "#c8e7da" },

  // Card de chat
  chatCard: {
    flex: 1,
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
    paddingHorizontal: 18,
    paddingVertical: 14,
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
  chatAvatarBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: GREEN_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  chatAvatarText: { fontSize: 16, fontWeight: "800", color: GREEN },
  chatName: { fontSize: 16, fontWeight: "800", color: "#183d32" },
  chatSub: { marginTop: 2, fontSize: 13, color: "#6f877d" },

  // Presence pill
  presencePill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
    gap: 6,
  },
  presencePillOnline: { backgroundColor: "#e8f8ef" },
  presencePillOffline: { backgroundColor: "#f3f5f4" },
  presenceDot: { width: 7, height: 7, borderRadius: 4 },
  presenceDotOnline: { backgroundColor: "#2d9c67" },
  presenceDotOffline: { backgroundColor: "#b0bdb8" },
  presenceText: { fontSize: 12, fontWeight: "700" },
  presenceTextOnline: { color: "#2d9c67" },
  presenceTextOffline: { color: "#7b8d85" },

  // Mensagens
  msgScroll: { flex: 1, backgroundColor: "#fcfefd" },
  msgContent: {
    paddingHorizontal: 18,
    paddingVertical: 18,
    paddingBottom: 24,
  },
  emptyMsgWrap: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyMsgText: {
    color: "#8aaca3",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 22,
  },
  datePill: {
    alignSelf: "center",
    backgroundColor: "#eef7f2",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 12,
    marginTop: 4,
  },
  datePillText: { fontSize: 12, fontWeight: "700", color: "#5d7c71" },
  msgRow: { marginBottom: 10, flexDirection: "row" },
  msgRowIn: { justifyContent: "flex-start" },
  msgRowOut: { justifyContent: "flex-end" },
  bubble: {
    maxWidth: "80%",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  bubbleIn: {
    backgroundColor: "#eef4f1",
    borderBottomLeftRadius: 6,
  },
  bubbleOut: {
    backgroundColor: GREEN,
    borderBottomRightRadius: 6,
  },
  bubblePending: { opacity: 0.65 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextIn: { color: "#1f3f35" },
  bubbleTextOut: { color: WHITE },
  bubbleMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 6,
  },
  msgTime: { fontSize: 11, fontWeight: "700" },
  msgTimeIn: { color: "#71877d" },
  msgTimeOut: { color: "#d6efe4" },

  // Typing indicator
  typingBubble: { paddingVertical: 14, paddingHorizontal: 18 },
  typingDots: { flexDirection: "row", gap: 5, alignItems: "center" },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#7ba897",
  },
  dot1: {},
  dot2: { marginTop: -4 },
  dot3: {},

  // Composer
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: "#edf4f0",
    backgroundColor: WHITE,
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 130,
    borderRadius: 18,
    backgroundColor: "#f4faf7",
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1d4136",
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { backgroundColor: "#8fbbaa" },

  // Empty state (sem conversa selecionada)
  noChatCard: {
    flex: 1,
    backgroundColor: WHITE,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    shadowColor: "#174c3e",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  noChatText: {
    color: "#8aaca3",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },

  // Card header com botão +
  cardHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  newChatBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: GREEN_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(10, 35, 28, 0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 34,
    maxHeight: "80%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#d4e9e2",
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#edf4f0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#183d32",
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: GREEN_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  // Busca
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#f2f9f5",
    borderRadius: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "#daeee5",
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#1d4136",
    paddingVertical: 0,
  },

  // Lista de contatos
  modalList: {
    paddingHorizontal: 16,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f7f4",
    gap: 14,
  },
  contactAvatar: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: GREEN_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  contactAvatarText: {
    fontSize: 15,
    fontWeight: "800",
    color: GREEN,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#183d32",
  },
  contactRole: {
    marginTop: 2,
    fontSize: 12,
    color: "#7ba897",
    fontWeight: "600",
  },
  contactExistingTag: {
    backgroundColor: GREEN_LIGHT,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  contactExistingText: {
    fontSize: 11,
    fontWeight: "700",
    color: GREEN,
  },

  // Modal loading / empty
  modalLoading: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  modalLoadingText: {
    fontSize: 14,
    color: "#7ba897",
    fontWeight: "600",
  },
  modalEmpty: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  modalEmptyText: {
    fontSize: 14,
    color: "#8aaca3",
    fontWeight: "600",
    textAlign: "center",
  },
});
