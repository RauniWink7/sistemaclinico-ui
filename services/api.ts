import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const API_BASE_URL = Platform.select({
  web: "http://127.0.0.1:8000/api",
  android: "http://10.0.2.2:8000/api",
  default: "http://127.0.0.1:8000/api",
}) as string;

const STORAGE_KEYS = {
  accessToken: "@clinica:accessToken",
  refreshToken: "@clinica:refreshToken",
  clinicId: "@clinica:clinicId",
};

export interface JwtPayload {
  role?: string;
  full_name?: string;
  clinic_id?: string;
  [key: string]: any;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterPayload {
  full_name: string;
  email: string;
  password: string;
  password_confirmation: string;
  phone?: string;
  clinic: string; // UUID obrigatório — sem fallback
}

export interface ClinicApiItem {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface AppointmentApiItem {
  id: string;
  date?: string;
  time?: string;
  scheduled_at?: string;
  status?: string;
  psychologist?: string;
  specialty?: string;
  has_review?: boolean;
  hasReview?: boolean;
  professional?: string;
  patient?: string;
  duration_minutes?: number;
}

export interface ConversationApiItem {
  id: string;
  psychologist_id?: string;
  psychologistName?: string;
  psychologistNameAlt?: string;
  specialty?: string;
  avatar?: string;
  unread_count?: number;
  last_message?: string;
  last_message_time?: string;
  online?: boolean;
}

export interface ChatMessageApiItem {
  id: string;
  conversation?: string;
  conversation_id?: string;
  sender: "patient" | "psychologist" | string;
  content_encrypted?: string;
  text?: string;
  message_type?: string;
  created_at: string;
  read?: boolean;
}

export interface DocumentApi {
  id: string;
  title: string;
  file_type: string;
  uploaded_at: string;
  size?: string;
  download_url?: string;
}

// Tipagem fiel ao retorno real de GET /api/auth/professionals/
export interface ProfessionalApiItem {
  id: string; // UUID do ProfessionalProfile — usado no POST /appointments/
  user: {
    id: string;
    email: string;
    full_name: string;
    phone?: string;
    role?: string;
    clinic?: string;
    is_active?: boolean;
    created_at?: string;
    first_name?: string;
    last_name?: string;
  };
  crp?: string;
  specialty?: string;
  bio?: string;
  photo?: string | null;
  session_duration_minutes?: number;
  created_at?: string;
  updated_at?: string;
  // campos legados mantidos para compatibilidade
  name?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  psychologistName?: string;
  psychologistNameAlt?: string;
  professional?: string;
  initials?: string;
  color?: string;
  bg?: string;
  rating?: number;
  sessions?: number;
  available?: boolean;
}

export interface AppointmentAvailabilityApiItem {
  id: string;
  professional: string;
  weekday: number; // Django: 0=Seg, 1=Ter, 2=Qua, 3=Qui, 4=Sex, 5=Sáb, 6=Dom
  weekday_display: string;
  start_time: string;
  end_time: string;
  blocked: boolean;
}

export interface PatientProfileApiItem {
  id: string;
  user: {
    id: string;
    email: string;
    full_name: string;
    phone?: string;
    role?: string;
    clinic?: string;
    is_active?: boolean;
    created_at?: string;
  };
  birth_date?: string | null;
  cpf?: string | null;
  medical_history?: string;
  anamnesis?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ApiResult<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  accessToken?: string;
  refreshToken?: string;
  role?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fetchJson = async (url: string, options: RequestInit = {}) => {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => null);
  return { response, data };
};

const extractList = <T>(data: any): T[] =>
  Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];

const base64UrlDecode = (input: string): string => {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  const padded =
    base64 + (pad === 2 ? "==" : pad === 3 ? "=" : pad === 1 ? "===" : "");
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  const bytes = [] as number[];
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < padded.length; i += 1) {
    const val = chars.indexOf(padded.charAt(i));
    if (val === -1) continue;
    buffer = (buffer << 6) | val;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  try {
    return new TextDecoder().decode(new Uint8Array(bytes));
  } catch {
    return String.fromCharCode(...bytes);
  }
};

const parseJwt = (token: string): JwtPayload | null => {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    return JSON.parse(base64UrlDecode(parts[1])) as JwtPayload;
  } catch {
    return null;
  }
};

export const normalizeError = (data: any): string => {
  if (!data) return "Ocorreu um erro inesperado.";
  if (typeof data === "string") return data;
  if (data.message) return String(data.message);
  if (data.error) return String(data.error);
  if (data.detail) return String(data.detail);
  if (typeof data === "object") {
    const values = Object.values(data).flat();
    if (values.length) return String(values[0]);
  }
  return "Ocorreu um erro inesperado.";
};

// ─── Token Storage ────────────────────────────────────────────────────────────

export const saveTokens = async (
  accessToken: string,
  refreshToken: string,
): Promise<void> => {
  const payload = parseJwt(accessToken);
  const clinicId = (payload?.clinic_id || payload?.clinic) ?? null;

  const storagePairs: [string, string][] = [
    [STORAGE_KEYS.accessToken, accessToken],
    [STORAGE_KEYS.refreshToken, refreshToken],
  ];

  if (clinicId) {
    storagePairs.push([STORAGE_KEYS.clinicId, clinicId]);
  }

  await AsyncStorage.multiSet(storagePairs);
};

export const getAccessToken = async (): Promise<string | null> =>
  AsyncStorage.getItem(STORAGE_KEYS.accessToken);

export const getRefreshToken = async (): Promise<string | null> =>
  AsyncStorage.getItem(STORAGE_KEYS.refreshToken);

export const getClinicId = async (): Promise<string | null> =>
  AsyncStorage.getItem(STORAGE_KEYS.clinicId);

export const clearTokens = async (): Promise<void> => {
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.accessToken,
    STORAGE_KEYS.refreshToken,
    STORAGE_KEYS.clinicId,
  ]);
};

const createAuthHeaders = async (): Promise<Record<string, string> | null> => {
  const token = await getAccessToken();
  if (!token) return null;
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const login = async (
  credentials: LoginCredentials,
): Promise<ApiResult> => {
  const response = await fetch(`${API_BASE_URL}/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  const data = await response.json().catch(() => null);
  const accessToken = data?.access || data?.access_token;
  const refreshToken = data?.refresh || data?.refresh_token;
  if (!response.ok || !accessToken || !refreshToken) {
    return {
      ok: false,
      error: normalizeError(data) || "E-mail ou senha incorretos.",
      data,
    };
  }
  await saveTokens(accessToken, refreshToken);
  const role = getRoleFromToken(accessToken);
  return { ok: true, data, accessToken, refreshToken, role };
};

export const register = async (
  payload: RegisterPayload,
): Promise<ApiResult> => {
  // ⚠️ clinic deve ser um UUID válido — nunca usar string fixa
  const response = await fetch(`${API_BASE_URL}/auth/register/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) return { ok: false, error: normalizeError(data), data };
  return { ok: true, data };
};

export const getMe = async (): Promise<ApiResult> => {
  const headers = await createAuthHeaders();
  if (!headers) return { ok: false, error: "Usuário não autenticado." };
  const response = await fetch(`${API_BASE_URL}/auth/me/`, {
    method: "GET",
    headers,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) return { ok: false, error: normalizeError(data), data };
  return { ok: true, data };
};

// Atualiza full_name e phone do usuário autenticado via PATCH /api/auth/me/
// O phone pertence ao model User — este é o endpoint correto para salvá-lo
export const updateMe = async (
  payload: { full_name?: string; phone?: string },
): Promise<ApiResult> => {
  const headers = await createAuthHeaders();
  if (!headers) return { ok: false, error: "Usuário não autenticado." };
  const { response, data } = await fetchJson(`${API_BASE_URL}/auth/me/`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(payload),
  });
  if (!response.ok) return { ok: false, error: normalizeError(data), data };
  return { ok: true, data };
};

// ─── Clínicas ─────────────────────────────────────────────────────────────────

// Usado na tela de cadastro para listar clínicas disponíveis (sem autenticação)
export const getClinics = async (): Promise<ApiResult<ClinicApiItem[]>> => {
  const { response, data } = await fetchJson(`${API_BASE_URL}/clinics/`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  const results = extractList<ClinicApiItem>(data);
  if (!response.ok)
    return { ok: false, error: normalizeError(data), data: results };
  return { ok: true, data: results };
};

// ─── Perfil do Paciente ───────────────────────────────────────────────────────

export const getPatientProfile = async (
  userId: string, // user.id de GET /api/auth/me/
): Promise<ApiResult<PatientProfileApiItem>> => {
  const headers = await createAuthHeaders();
  if (!headers) return { ok: false, error: "Usuário não autenticado." };
  const { response, data } = await fetchJson(
    `${API_BASE_URL}/auth/patients/${encodeURIComponent(userId)}/profile/`,
    { method: "GET", headers },
  );
  if (!response.ok) return { ok: false, error: normalizeError(data), data };
  return { ok: true, data };
};

export const updatePatientProfile = async (
  userId: string, // user.id de GET /api/auth/me/
  payload: Record<string, any>,
): Promise<ApiResult> => {
  const headers = await createAuthHeaders();
  if (!headers) return { ok: false, error: "Usuário não autenticado." };
  const { response, data } = await fetchJson(
    `${API_BASE_URL}/auth/patients/${encodeURIComponent(userId)}/profile/`,
    { method: "PATCH", headers, body: JSON.stringify(payload) },
  );
  if (!response.ok) return { ok: false, error: normalizeError(data), data };
  return { ok: true, data };
};

// Atualiza campos do model User (full_name, phone) via PATCH /api/auth/users/{id}/
// O phone fica no User, não no PatientProfile — por isso precisa de endpoint separado
export const updateUser = async (
  userId: string,
  payload: { full_name?: string; phone?: string },
): Promise<ApiResult> => {
  const headers = await createAuthHeaders();
  if (!headers) return { ok: false, error: "Usuário não autenticado." };
  const { response, data } = await fetchJson(
    `${API_BASE_URL}/auth/users/${encodeURIComponent(userId)}/`,
    { method: "PATCH", headers, body: JSON.stringify(payload) },
  );
  if (!response.ok) return { ok: false, error: normalizeError(data), data };
  return { ok: true, data };
};

// ─── Profissionais ────────────────────────────────────────────────────────────

export const getPsychologists = async (): Promise<
  ApiResult<ProfessionalApiItem[]>
> => {
  const headers = await createAuthHeaders();
  if (!headers) return { ok: false, error: "Usuário não autenticado." };
  const { response, data } = await fetchJson(
    `${API_BASE_URL}/auth/professionals/`,
    { method: "GET", headers },
  );
  const results = extractList<ProfessionalApiItem>(data);
  if (!response.ok)
    return { ok: false, error: normalizeError(data), data: results };
  return { ok: true, data: results };
};

// ─── Agendamentos ─────────────────────────────────────────────────────────────

export const getAppointments = async (): Promise<
  ApiResult<AppointmentApiItem[]>
> => {
  const headers = await createAuthHeaders();
  if (!headers) return { ok: false, error: "Usuário não autenticado." };
  const { response, data } = await fetchJson(`${API_BASE_URL}/appointments/`, {
    method: "GET",
    headers,
  });
  const results = extractList<AppointmentApiItem>(data);
  if (!response.ok)
    return { ok: false, error: normalizeError(data), data: results };
  return { ok: true, data: results };
};

export const createAppointment = async (
  patientId: string,
  professionalId: string, // item.id do ProfessionalProfile
  clinicId: string, // me.data.clinic
  scheduledAt: string, // ex: "2025-05-05T09:00:00" — timezone adicionado aqui
  durationMinutes = 50,
): Promise<ApiResult> => {
  const headers = await createAuthHeaders();
  if (!headers) return { ok: false, error: "Usuário não autenticado." };

  // Garante timezone UTC — backend rejeita sem timezone
  const hasTimezone = /Z$|[+-]\d{2}:\d{2}$/.test(scheduledAt);
  const scheduledAtUtc = hasTimezone ? scheduledAt : `${scheduledAt}Z`;

  console.log(JSON.stringify({patient: patientId, professional: professionalId, clinic: clinicId, scheduled_at: scheduledAtUtc, duration_minutes: durationMinutes, }))
  // ⚠️ NÃO enviar "patient" — backend pega do token automaticamente
  const { response, data } = await fetchJson(`${API_BASE_URL}/appointments/`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      patient: patientId,
      professional: professionalId,
      clinic: clinicId,
      scheduled_at: scheduledAtUtc,
      duration_minutes: durationMinutes,
    }),
  });
  if (!response.ok) return { ok: false, error: normalizeError(data), data };

  return { ok: true, data };
};

export const cancelAppointment = async (
  appointmentId: string,
  reason: string,
): Promise<ApiResult> => {
  const headers = await createAuthHeaders();
  if (!headers) return { ok: false, error: "Usuário não autenticado." };
  const { response, data } = await fetchJson(
    `${API_BASE_URL}/appointments/${encodeURIComponent(appointmentId)}/cancel/`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ cancel_reason: reason }),
    },
  );
  if (!response.ok) return { ok: false, error: normalizeError(data), data };
  return { ok: true, data };
};

export const rateAppointment = async (
  appointmentId: string,
  score: number,
  comment?: string,
): Promise<ApiResult> => {
  const headers = await createAuthHeaders();
  if (!headers) return { ok: false, error: "Usuário não autenticado." };
  const { response, data } = await fetchJson(
    `${API_BASE_URL}/appointments/${encodeURIComponent(appointmentId)}/rating/`,
    { method: "POST", headers, body: JSON.stringify({ score, comment }) },
  );
  if (!response.ok) return { ok: false, error: normalizeError(data), data };
  return { ok: true, data };
};

export const getPsychologistAvailability = async (
  psychologistId: string,
): Promise<ApiResult<AppointmentAvailabilityApiItem[]>> => {
  const headers = await createAuthHeaders();
  if (!headers) return { ok: false, error: "Usuário não autenticado." };
  const query = `?professional=${encodeURIComponent(psychologistId)}`;
  const { response, data } = await fetchJson(
    `${API_BASE_URL}/appointments/availability/${query}`,
    { method: "GET", headers },
  );
  const availability = extractList<AppointmentAvailabilityApiItem>(data);
  if (!response.ok)
    return { ok: false, error: normalizeError(data), data: availability };
  return { ok: true, data: availability };
};

// ─── Chat ─────────────────────────────────────────────────────────────────────

export const getConversations = async (): Promise<
  ApiResult<ConversationApiItem[]>
> => {
  const headers = await createAuthHeaders();
  if (!headers) return { ok: false, error: "Usuário não autenticado." };
  const { response, data } = await fetchJson(
    `${API_BASE_URL}/chat/conversations/`,
    { method: "GET", headers },
  );
  const results = extractList<ConversationApiItem>(data);
  if (!response.ok)
    return { ok: false, error: normalizeError(data), data: results };
  return { ok: true, data: results };
};

export const getMessagesWithPsychologist = async (
  psychologistId: string,
): Promise<ApiResult<ChatMessageApiItem[]>> => {
  const headers = await createAuthHeaders();
  if (!headers) return { ok: false, error: "Usuário não autenticado." };
  const { response, data } = await fetchJson(
    `${API_BASE_URL}/chat/messages/?with=${encodeURIComponent(psychologistId)}`,
    { method: "GET", headers },
  );
  const results = extractList<ChatMessageApiItem>(data);
  if (!response.ok)
    return { ok: false, error: normalizeError(data), data: results };
  return { ok: true, data: results };
};

export const sendChatMessage = async (
  receiverId: string, // user.id do profissional
  content: string,
  appointmentId?: string,
): Promise<ApiResult<ChatMessageApiItem>> => {
  const headers = await createAuthHeaders();
  if (!headers) return { ok: false, error: "Usuário não autenticado." };
  const { response, data } = await fetchJson(`${API_BASE_URL}/chat/messages/`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      receiver: receiverId,
      content_encrypted: content,
      message_type: "text",
      ...(appointmentId ? { appointment: appointmentId } : {}),
    }),
  });
  if (!response.ok) return { ok: false, error: normalizeError(data), data };
  return { ok: true, data };
};

export const markMessageRead = async (
  messageId: string,
): Promise<ApiResult> => {
  const headers = await createAuthHeaders();
  if (!headers) return { ok: false, error: "Usuário não autenticado." };
  const { response, data } = await fetchJson(
    `${API_BASE_URL}/chat/messages/${encodeURIComponent(messageId)}/read/`,
    { method: "PATCH", headers },
  );
  if (!response.ok) return { ok: false, error: normalizeError(data), data };
  return { ok: true, data };
};

export const getUnreadCount = async (): Promise<
  ApiResult<{ unread_count: number }>
> => {
  const headers = await createAuthHeaders();
  if (!headers) return { ok: false, error: "Usuário não autenticado." };
  const { response, data } = await fetchJson(`${API_BASE_URL}/chat/unread/`, {
    method: "GET",
    headers,
  });
  if (!response.ok) return { ok: false, error: normalizeError(data), data };
  return { ok: true, data };
};

// ─── Documentos ───────────────────────────────────────────────────────────────


export const getDocuments = async () => {
  try {
    const token = await getAccessToken();

    const res = await fetch(`${API_BASE_URL}/records/documents/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      return { ok: false, error: normalizeError(data) };
    }

    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: "Erro ao buscar documentos" };
  }
};

export const uploadDocument = async (
  title: string,
  fileType: string,
  file: { uri: string; name: string; type: string },
) => {
  try {
    const token = await getAccessToken();

    const formData = new FormData();
    formData.append("title", title);
    formData.append("file_type", fileType);

    // No Expo Web, o browser não entende o objeto { uri, name, type } do RN.
    // É necessário fazer fetch do URI para obter um Blob real antes de anexar.
    if (Platform.OS === "web") {
      const blobRes = await fetch(file.uri);
      const blob = await blobRes.blob();
      // File estende Blob e adiciona o nome — necessário para o Django ler o filename
      const fileObj = new File([blob], file.name, {
        type: blob.type || file.type || "application/octet-stream",
      });
      formData.append("file", fileObj);
    } else {
      // React Native nativo: o objeto { uri, name, type } é reconhecido pelo fetch nativo
      formData.append("file", file as any);
    }

    const res = await fetch(`${API_BASE_URL}/records/documents/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        // ⚠️ NÃO definir Content-Type manualmente com FormData —
        // o browser precisa gerar o boundary do multipart/form-data automaticamente
      },
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      return { ok: false, error: normalizeError(data) };
    }

    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: "Erro ao enviar documento" };
  }
};

export const deleteDocument = async (id: string) => {
  try {
    const token = await getAccessToken();

    const res = await fetch(`${API_BASE_URL}/records/documents/${id}/`, { // 👈 barra aqui
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: normalizeError(data) };
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, error: "Erro ao excluir documento" };
  }
};

// ─── JWT Utils ────────────────────────────────────────────────────────────────

export const getRoleFromToken = (token: string): string => {
  const payload = parseJwt(token);
  return payload?.role?.toLowerCase() ?? "";
};

export const getClinicIdFromToken = (token: string): string | null => {
  const payload = parseJwt(token);
  return payload?.clinic_id ?? null;
};

export const getRouteForRole = (
  role: string,
): "/homep" | "/dashboardP" | "/(admin)" => {
  switch (role?.toLowerCase()) {
    case "admin":
      return "/(admin)";
    case "professional":
    case "psychologist":
      return "/dashboardP";
    case "patient":
    default:
      return "/homep";
  }
};