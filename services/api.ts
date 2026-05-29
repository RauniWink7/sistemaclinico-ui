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
  phone?: string;
  clinic: string; // UUID obrigatório — sem fallback
  role?: string; // 'patient' | 'professional' — omitir para usar o default do backend
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
  patient_detail?: {
    user: {
      id: string;
      full_name: string;
      email?: string;
      phone?: string;
    };
  };
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

export interface NotificationApiItem {
  id: string;
  type: string;
  channel: string;
  status: string;
  title: string;
  body: string;
  metadata?: Record<string, any>;
  is_read: boolean;
  read_at?: string | null;
  sent_at?: string | null;
  created_at: string;
}

export interface ReportPeriodQuery {
  start_date?: string;
  end_date?: string;
  professional_id?: string;
  clinic_id?: string;
}

export interface ReportSummary {
  total_appointments?: number;
  unique_patients?: number;
  patients_attended?: number;
  scheduled?: number;
  completed?: number;
  cancelled?: number;
  rescheduled?: number;
  no_show?: number;
  attendance_rate_percent?: number;
  cancellation_rate_percent?: number;
  first_appointment_at?: string | null;
  last_appointment_at?: string | null;
}

export interface ReportRow {
  [key: string]: any;
}

export interface PatientReportApi {
  report: "patient" | "professional_patient";
  period: { start_date?: string | null; end_date?: string | null };
  patient?: ReportRow;
  professional?: ReportRow;
  summary: ReportSummary;
  status_counts: ReportRow[];
  frequency_by_month: ReportRow[];
  appointment_history: ReportRow[];
}

export interface ProfessionalSummaryReportApi {
  report: "professional_summary";
  period: { start_date?: string | null; end_date?: string | null };
  professional: ReportRow;
  summary: ReportSummary;
  status_counts: ReportRow[];
  volume_by_month: ReportRow[];
  patients: ReportRow[];
  appointments: ReportRow[];
}

export interface AdminAppointmentsReportApi {
  report: "admin_appointments";
  period: { start_date?: string | null; end_date?: string | null };
  clinic_id?: string | null;
  filters?: ReportRow;
  summary: ReportSummary;
  status_counts: ReportRow[];
  consultations_by_period: ReportRow[];
  consultations_by_professional: ReportRow[];
  appointments: ReportRow[];
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
  const response = await fetchWithRefresh(url, options);
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
  // '=' fica fora da tabela de propósito: é padding e deve ser ignorado no loop
  // (indexOf retorna -1 e o caractere é pulado). Incluí-lo corrompia o último
  // byte decodificado, quebrando o JSON.parse do token e zerando o role no login.
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
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

// ─── Token Refresh ──────────────────────────────────────────────────────────

// Single-flight: várias requisições que tomam 401 ao mesmo tempo compartilham
// um único refresh. Com ROTATE_REFRESH_TOKENS + BLACKLIST_AFTER_ROTATION, o
// primeiro refresh invalida o refresh token antigo, então refreshes concorrentes
// com o token antigo falhariam.
let refreshPromise: Promise<string | null> | null = null;

const refreshAccessToken = async (): Promise<string | null> => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) return null;

      const response = await fetch(`${API_BASE_URL}/auth/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: refreshToken }),
      });
      const data = await response.json().catch(() => null);
      const newAccess = data?.access;

      if (!response.ok || !newAccess) {
        // Refresh expirado/inválido — limpa a sessão para forçar novo login.
        await clearTokens();
        return null;
      }

      // ROTATE_REFRESH_TOKENS=True: o backend devolve um novo refresh a cada uso.
      await saveTokens(newAccess, data?.refresh ?? refreshToken);
      return newAccess;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

// Faz o fetch e, ao receber 401 numa requisição autenticada, renova o token uma
// vez e refaz a chamada. Requisições públicas (sem Authorization) passam direto.
const fetchWithRefresh = async (
  url: string,
  options: RequestInit = {},
): Promise<Response> => {
  const headers = {
    ...(options.headers as Record<string, string> | undefined),
  };
  const hadAuth = "Authorization" in headers;

  const response = await fetch(url, { ...options, headers });
  if (response.status !== 401 || !hadAuth) return response;

  const newToken = await refreshAccessToken();
  if (!newToken) return response;

  return fetch(url, {
    ...options,
    headers: { ...headers, Authorization: `Bearer ${newToken}` },
  });
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
  console.log("📤 Register payload:", payload);
  console.log("📥 Register response:", data);
  if (!response.ok) return { ok: false, error: normalizeError(data), data };
  return { ok: true, data };
};

// ─── Admin User Management ───────────────────────────────────────────────────

// GET /api/auth/admin/users/ — listar todos os usuários da clínica
export const getAdminUsers = async (): Promise<ApiResult<any[]>> => {
  const headers = await createAuthHeaders();
  if (!headers) return { ok: false, error: "Usuário não autenticado." };
  const { response, data } = await fetchJson(
    `${API_BASE_URL}/auth/admin/users/`,
    { method: "GET", headers },
  );
  const results = extractList<any>(data);
  if (!response.ok)
    return { ok: false, error: normalizeError(data), data: results };
  return { ok: true, data: results };
};

// GET /api/auth/admin/users/<id>/ — detalhes de um usuário
export const getAdminUser = async (userId: string): Promise<ApiResult> => {
  const headers = await createAuthHeaders();
  if (!headers) return { ok: false, error: "Usuário não autenticado." };
  const { response, data } = await fetchJson(
    `${API_BASE_URL}/auth/admin/users/${encodeURIComponent(userId)}/`,
    { method: "GET", headers },
  );
  if (!response.ok) return { ok: false, error: normalizeError(data), data };
  return { ok: true, data };
};

// PATCH /api/auth/admin/users/<id>/ — editar dados básicos do usuário
export const updateAdminUser = async (
  userId: string,
  payload: { full_name?: string; phone?: string; email?: string },
): Promise<ApiResult> => {
  const headers = await createAuthHeaders();
  if (!headers) return { ok: false, error: "Usuário não autenticado." };
  const { response, data } = await fetchJson(
    `${API_BASE_URL}/auth/admin/users/${encodeURIComponent(userId)}/`,
    { method: "PATCH", headers, body: JSON.stringify(payload) },
  );
  if (!response.ok) return { ok: false, error: normalizeError(data), data };
  return { ok: true, data };
};

// PATCH /api/auth/admin/users/<id>/status/ — ativar/desativar usuário
export const toggleUserStatus = async (
  userId: string,
  isActive: boolean,
): Promise<ApiResult> => {
  const headers = await createAuthHeaders();
  if (!headers) return { ok: false, error: "Usuário não autenticado." };
  const { response, data } = await fetchJson(
    `${API_BASE_URL}/auth/admin/users/${encodeURIComponent(userId)}/status/`,
    { method: "PATCH", headers, body: JSON.stringify({ is_active: isActive }) },
  );
  if (!response.ok) return { ok: false, error: normalizeError(data), data };
  return { ok: true, data };
};

// PATCH /api/auth/admin/users/<id>/role/ — alterar papel do usuário
export const changeUserRole = async (
  userId: string,
  role: string,
): Promise<ApiResult> => {
  const headers = await createAuthHeaders();
  if (!headers) return { ok: false, error: "Usuário não autenticado." };
  const { response, data } = await fetchJson(
    `${API_BASE_URL}/auth/admin/users/${encodeURIComponent(userId)}/role/`,
    { method: "PATCH", headers, body: JSON.stringify({ role }) },
  );
  if (!response.ok) return { ok: false, error: normalizeError(data), data };
  return { ok: true, data };
};

// POST /api/auth/admin/users/professionals/ — criar profissional via admin
export const createProfessionalAsAdmin = async (payload: {
  email: string;
  full_name: string;
  phone?: string;
  crp?: string;
  specialty?: string;
  send_invite?: boolean;
}): Promise<ApiResult> => {
  const headers = await createAuthHeaders();
  if (!headers) return { ok: false, error: "Usuário não autenticado." };
  const { response, data } = await fetchJson(
    `${API_BASE_URL}/auth/admin/users/professionals/`,
    { method: "POST", headers, body: JSON.stringify(payload) },
  );
  if (!response.ok) return { ok: false, error: normalizeError(data), data };
  return { ok: true, data };
};

// POST /api/auth/admin/users/patients/ — criar paciente via admin (requer autenticação)
export const createPatientAsAdmin = async (payload: {
  email: string;
  full_name: string;
  phone?: string;
  birth_date?: string;
  cpf?: string;
  medical_history?: string;
  anamnesis?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  send_invite?: boolean;
}): Promise<ApiResult> => {
  const headers = await createAuthHeaders();
  if (!headers) return { ok: false, error: "Usuário não autenticado." };

  const { response, data } = await fetchJson(
    `${API_BASE_URL}/auth/admin/users/patients/`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) return { ok: false, error: normalizeError(data), data };
  return { ok: true, data };
};

export const getMe = async (): Promise<ApiResult> => {
  const headers = await createAuthHeaders();
  if (!headers) return { ok: false, error: "Usuário não autenticado." };
  const response = await fetchWithRefresh(`${API_BASE_URL}/auth/me/`, {
    method: "GET",
    headers,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) return { ok: false, error: normalizeError(data), data };
  return { ok: true, data };
};

// Atualiza full_name e phone do usuário autenticado via PATCH /api/auth/me/
// O phone pertence ao model User — este é o endpoint correto para salvá-lo
export const updateMe = async (payload: {
  full_name?: string;
  phone?: string;
}): Promise<ApiResult> => {
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

// GET /api/auth/<clinicId>/patients/
// Retorna lista de pacientes da clínica. Admin vê todos; psicólogo só vê os seus.
// Nota: a rota fica em /api/auth/ (não em /api/clinics/) conforme urls.py de accounts.
export const getClinicPatients = async (
  clinicId: string,
): Promise<ApiResult<any[]>> => {
  const headers = await createAuthHeaders();
  if (!headers) return { ok: false, error: "Usuário não autenticado." };
  const { response, data } = await fetchJson(
    `${API_BASE_URL}/auth/${encodeURIComponent(clinicId)}/patients/`,
    { method: "GET", headers },
  );
  const results = extractList<any>(data);
  if (!response.ok)
    return { ok: false, error: normalizeError(data), data: results };
  return { ok: true, data: results };
};

// Atualiza campos do model User (full_name, phone) via PATCH /api/auth/me/
// O endpoint /api/auth/users/:id/ não existe — o correto é /api/auth/me/
// que já aceita full_name e phone do usuário autenticado
export const updateUser = async (
  _userId: string, // mantido para não quebrar chamadas existentes
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

// PATCH /api/auth/professionals/<id>/  — atualiza crp, specialty, bio do profissional
export const updateProfessionalProfile = async (
  professionalId: string,
  payload: {
    crp?: string;
    specialty?: string;
    bio?: string;
    session_duration_minutes?: number;
  },
): Promise<ApiResult> => {
  const headers = await createAuthHeaders();
  if (!headers) return { ok: false, error: "Usuário não autenticado." };
  const { response, data } = await fetchJson(
    `${API_BASE_URL}/auth/professionals/${encodeURIComponent(professionalId)}/`,
    { method: "PATCH", headers, body: JSON.stringify(payload) },
  );
  if (!response.ok) return { ok: false, error: normalizeError(data), data };
  return { ok: true, data };
};

// DELETE /api/appointments/availability/<id>/
export const deleteAvailability = async (
  availabilityId: string,
): Promise<ApiResult> => {
  const headers = await createAuthHeaders();
  if (!headers) return { ok: false, error: "Usuário não autenticado." };
  const token = await getAccessToken();
  const url = `${API_BASE_URL}/appointments/availability/${encodeURIComponent(availabilityId)}/`;
  console.log("🗑️ DELETE availability:", url);
  const response = await fetchWithRefresh(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log("📦 DELETE response status:", response.status);
  // 204 No Content é sucesso — não tentar .json() numa resposta vazia
  if (response.status === 204 || response.ok) {
    console.log("✅ Deletado com sucesso");
    return { ok: true };
  }
  const data = await response.json().catch(() => null);
  console.log("❌ Erro ao deletar:", data);
  return { ok: false, error: normalizeError(data), data };
};

// PATCH /api/appointments/availability/<id>/
export const updateAvailability = async (
  availabilityId: string,
  payload: { weekday?: number; start_time?: string; end_time?: string },
): Promise<ApiResult> => {
  const headers = await createAuthHeaders();
  if (!headers) return { ok: false, error: "Usuário não autenticado." };
  const { response, data } = await fetchJson(
    `${API_BASE_URL}/appointments/availability/${encodeURIComponent(availabilityId)}/`,
    { method: "PATCH", headers, body: JSON.stringify(payload) },
  );
  if (!response.ok) return { ok: false, error: normalizeError(data), data };
  return { ok: true, data };
};

// ─── Clínicas (Admin) ──────────────────────────────────────────────────────────

// GET /api/clinics/{clinic_id}/stats/
// Retorna estatísticas da clínica: total_appointments, completed_appointments, etc.
export const getClinicStats = async (clinicId: string): Promise<ApiResult> => {
  const headers = await createAuthHeaders();
  if (!headers) return { ok: false, error: "Usuário não autenticado." };
  const { response, data } = await fetchJson(
    `${API_BASE_URL}/clinics/${encodeURIComponent(clinicId)}/stats/`,
    { method: "GET", headers },
  );
  if (!response.ok) return { ok: false, error: normalizeError(data), data };
  return { ok: true, data };
};

// GET /api/clinics/{clinic_id}/
// Retorna dados da clínica: name, address, phone, email, open_from, open_until, etc.
export const getClinicData = async (clinicId: string): Promise<ApiResult> => {
  const headers = await createAuthHeaders();
  if (!headers) return { ok: false, error: "Usuário não autenticado." };
  const { response, data } = await fetchJson(
    `${API_BASE_URL}/clinics/${encodeURIComponent(clinicId)}/`,
    { method: "GET", headers },
  );
  if (!response.ok) return { ok: false, error: normalizeError(data), data };
  return { ok: true, data };
};

// PATCH /api/clinics/{clinic_id}/
// Atualiza dados da clínica: name, address, phone, email, open_from, open_until
export const updateClinic = async (
  clinicId: string,
  payload: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    open_from?: string;
    open_until?: string;
  },
): Promise<ApiResult> => {
  const headers = await createAuthHeaders();
  if (!headers) return { ok: false, error: "Usuário não autenticado." };
  const { response, data } = await fetchJson(
    `${API_BASE_URL}/clinics/${encodeURIComponent(clinicId)}/`,
    { method: "PATCH", headers, body: JSON.stringify(payload) },
  );
  if (!response.ok) return { ok: false, error: normalizeError(data), data };
  return { ok: true, data };
};

// GET /api/auth/professionals/?clinic_id={clinic_id}
// Retorna lista de profissionais de uma clínica específica
export const getProfessionalsByClinic = async (
  clinicId: string,
): Promise<ApiResult<ProfessionalApiItem[]>> => {
  const headers = await createAuthHeaders();
  if (!headers) return { ok: false, error: "Usuário não autenticado." };
  const { response, data } = await fetchJson(
    `${API_BASE_URL}/auth/professionals/?clinic_id=${encodeURIComponent(clinicId)}`,
    { method: "GET", headers },
  );
  const results = extractList<ProfessionalApiItem>(data);
  if (!response.ok)
    return { ok: false, error: normalizeError(data), data: results };
  return { ok: true, data: results };
};

// ─── Agendamentos ─────────────────────────────────────────────────────────────

// GET /api/appointments/<id>/ — detalhe completo de uma consulta
export const getAppointmentDetail = async (
  appointmentId: string,
): Promise<ApiResult> => {
  const headers = await createAuthHeaders();
  if (!headers) return { ok: false, error: "Usuário não autenticado." };
  const { response, data } = await fetchJson(
    `${API_BASE_URL}/appointments/${encodeURIComponent(appointmentId)}/`,
    { method: "GET", headers },
  );
  if (!response.ok) return { ok: false, error: normalizeError(data), data };
  return { ok: true, data };
};

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

// GET /api/appointments/summary/
// Retorna: { consultas_hoje, proxima_consulta, total_pacientes }
export const getProfessionalSummary = async (): Promise<
  ApiResult<{
    consultas_hoje: number;
    proxima_consulta: AppointmentApiItem | null;
    total_pacientes: number;
  }>
> => {
  const headers = await createAuthHeaders();
  if (!headers) return { ok: false, error: "Usuário não autenticado." };
  const { response, data } = await fetchJson(
    `${API_BASE_URL}/appointments/summary/`,
    {
      method: "GET",
      headers,
    },
  );
  if (!response.ok) return { ok: false, error: normalizeError(data), data };
  return { ok: true, data };
};

export const createAppointment = async (
  professionalId: string, // item.id do ProfessionalProfile — UUID obrigatório
  scheduledAt: string, // ex: "2025-06-15T10:00:00-03:00" — formato ISO 8601 com timezone obrigatório
  durationMinutes = 50,
  options: { patientId?: string; clinicId?: string } = {},
): Promise<ApiResult> => {
  const headers = await createAuthHeaders();
  if (!headers) return { ok: false, error: "Usuário não autenticado." };

  // Garante formato ISO 8601 com timezone — backend rejeita sem timezone
  const hasTimezone = /Z$|[+-]\d{2}:\d{2}$/.test(scheduledAt);
  const scheduledAtUtc = hasTimezone ? scheduledAt : `${scheduledAt}Z`;

  const clinicId = options.clinicId ?? (await getClinicId());

  const payload: Record<string, any> = {
    professional: professionalId,
    scheduled_at: scheduledAtUtc,
    duration_minutes: durationMinutes,
  };

  if (options.patientId) {
    payload.patient = options.patientId;
  }

  if (clinicId) {
    payload.clinic = clinicId;
  }

  console.log("📤 POST /api/appointments/", payload);

  const { response, data } = await fetchJson(`${API_BASE_URL}/appointments/`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    console.error("❌ Erro ao criar agendamento:", normalizeError(data));
    console.error("❌ Body completo:", JSON.stringify(data));
    return { ok: false, error: normalizeError(data), data };
  }

  console.log("✅ Agendamento criado com sucesso");
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

// PATCH /api/appointments/<id>/   { status: 'completed' | 'rescheduled' | 'scheduled' | 'no_show' }
export const updateAppointmentStatus = async (
  appointmentId: string,
  status: "completed" | "rescheduled" | "scheduled" | "no_show",
): Promise<ApiResult> => {
  const headers = await createAuthHeaders();
  if (!headers) return { ok: false, error: "Usuário não autenticado." };

  const url = `${API_BASE_URL}/appointments/${encodeURIComponent(appointmentId)}/`;
  const body = JSON.stringify({ status });

  console.log(`📤 API PATCH ${url}`, { status });

  const { response, data } = await fetchJson(url, {
    method: "PATCH",
    headers,
    body,
  });

  console.log(`📥 Response status: ${response.status}`, { data });

  if (!response.ok) {
    const error = normalizeError(data);
    console.error(`❌ Error: ${error}`, data);
    return { ok: false, error, data };
  }

  console.log(`✅ Appointment updated successfully =---------`);
  console.log(body);
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

// GET /api/appointments/availability/?professional=<uuid> — alias para getPsychologistAvailability
export const getAvailability = async (
  professionalId: string,
): Promise<ApiResult<AppointmentAvailabilityApiItem[]>> => {
  return getPsychologistAvailability(professionalId);
};

// POST /api/appointments/availability/  { weekday, start_time, end_time, blocked: true }
export const createAvailabilityBlock = async (payload: {
  professional: string;
  weekday: number;
  start_time: string;
  end_time: string;
  blocked: boolean;
}): Promise<ApiResult> => {
  const headers = await createAuthHeaders();
  if (!headers) return { ok: false, error: "Usuário não autenticado." };
  const { response, data } = await fetchJson(
    `${API_BASE_URL}/appointments/availability/`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok) return { ok: false, error: normalizeError(data), data };
  return { ok: true, data };
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

// GET /api/chat/contacts/ — listar contatos disponíveis para nova conversa
export const getChatContacts = async (): Promise<ApiResult> => {
  const headers = await createAuthHeaders();
  if (!headers) return { ok: false, error: "Usuário não autenticado." };
  const { response, data } = await fetchJson(`${API_BASE_URL}/chat/contacts/`, {
    method: "GET",
    headers,
  });
  if (!response.ok) return { ok: false, error: normalizeError(data), data };
  return { ok: true, data };
};

// PATCH /api/chat/messages/read/?with=<user_id> — marcar mensagens como lidas
export const markMessagesRead = async (userId: string): Promise<ApiResult> => {
  const headers = await createAuthHeaders();
  if (!headers) return { ok: false, error: "Usuário não autenticado." };
  const { response, data } = await fetchJson(
    `${API_BASE_URL}/chat/messages/read/?with=${encodeURIComponent(userId)}`,
    { method: "PATCH", headers },
  );
  if (!response.ok) return { ok: false, error: normalizeError(data), data };
  return { ok: true, data };
};

// GET /api/notifications/unread/ — obter contagem de notificações não lidas
export const getUnreadNotifications = async (): Promise<
  ApiResult<{ unread_count: number }>
> => {
  const headers = await createAuthHeaders();
  if (!headers) return { ok: false, error: "Usuário não autenticado." };
  const { response, data } = await fetchJson(
    `${API_BASE_URL}/notifications/unread/`,
    { method: "GET", headers },
  );
  if (!response.ok) return { ok: false, error: normalizeError(data), data };
  return { ok: true, data };
};

export const getNotifications = async (): Promise<
  ApiResult<NotificationApiItem[]>
> => {
  const headers = await createAuthHeaders();
  if (!headers) return { ok: false, error: "Usuário não autenticado." };
  const { response, data } = await fetchJson(`${API_BASE_URL}/notifications/`, {
    method: "GET",
    headers,
  });
  const results = extractList<NotificationApiItem>(data);
  if (!response.ok)
    return { ok: false, error: normalizeError(data), data: results };
  return { ok: true, data: results };
};

export const markNotificationRead = async (
  notificationId: string,
): Promise<ApiResult<NotificationApiItem>> => {
  const headers = await createAuthHeaders();
  if (!headers) return { ok: false, error: "Usuário não autenticado." };
  const { response, data } = await fetchJson(
    `${API_BASE_URL}/notifications/${encodeURIComponent(notificationId)}/read/`,
    { method: "PATCH", headers },
  );
  if (!response.ok) return { ok: false, error: normalizeError(data), data };
  return { ok: true, data };
};

const createQueryString = (params: ReportPeriodQuery = {}): string => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.append(key, value);
  });
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
};

const getReport = async <T>(
  path: string,
  params: ReportPeriodQuery = {},
): Promise<ApiResult<T>> => {
  const headers = await createAuthHeaders();
  if (!headers) return { ok: false, error: "Usuário não autenticado." };
  const { response, data } = await fetchJson(
    `${API_BASE_URL}${path}${createQueryString(params)}`,
    { method: "GET", headers },
  );
  if (!response.ok) return { ok: false, error: normalizeError(data), data };
  return { ok: true, data };
};

export const getPatientReport = async (
  patientId: string,
  params: ReportPeriodQuery = {},
): Promise<ApiResult<PatientReportApi>> =>
  getReport<PatientReportApi>(
    `/reports/patients/${encodeURIComponent(patientId)}/`,
    params,
  );

export const getProfessionalSummaryReport = async (
  params: ReportPeriodQuery = {},
): Promise<ApiResult<ProfessionalSummaryReportApi>> =>
  getReport<ProfessionalSummaryReportApi>(
    "/reports/professionals/summary/",
    params,
  );

export const getProfessionalPatientReport = async (
  patientId: string,
  params: ReportPeriodQuery = {},
): Promise<ApiResult<PatientReportApi>> =>
  getReport<PatientReportApi>(
    `/reports/professionals/patients/${encodeURIComponent(patientId)}/`,
    params,
  );

export const getAdminAppointmentsReport = async (
  params: ReportPeriodQuery = {},
): Promise<ApiResult<AdminAppointmentsReportApi>> =>
  getReport<AdminAppointmentsReportApi>("/reports/admin/appointments/", params);

export const downloadReportFile = async (
  path: string,
  params: ReportPeriodQuery = {},
  filename: string,
): Promise<ApiResult> => {
  const headers = await createAuthHeaders();
  if (!headers) return { ok: false, error: "Usuário não autenticado." };
  if (Platform.OS !== "web") {
    return {
      ok: false,
      error: "Exportação de arquivos disponível no navegador.",
    };
  }

  const response = await fetchWithRefresh(
    `${API_BASE_URL}${path}${createQueryString(params)}`,
    { method: "GET", headers },
  );
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    return { ok: false, error: normalizeError(data), data };
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return { ok: true };
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

    const res = await fetchWithRefresh(`${API_BASE_URL}/records/documents/`, {
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

export const getDocumentsByPatient = async (patientUserId: string) => {
  try {
    const token = await getAccessToken();

    const res = await fetchWithRefresh(
      `${API_BASE_URL}/records/documents/?patient=${encodeURIComponent(patientUserId)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const data = await res.json();

    if (!res.ok) {
      return { ok: false, error: normalizeError(data) };
    }

    const list = Array.isArray(data)
      ? data
      : Array.isArray(data?.results)
        ? data.results
        : [];

    return { ok: true, data: list };
  } catch (e) {
    return { ok: false, error: "Erro ao buscar documentos do paciente" };
  }
};

export const uploadDocument = async (
  title: string,
  fileType: string,
  file: { uri: string; name: string; type: string },
  patientProfileId?: string, // profile.id — obrigatório quando enviado pelo psicólogo
) => {
  try {
    const token = await getAccessToken();

    const formData = new FormData();
    formData.append("title", title);
    formData.append("file_type", fileType);

    // Psicólogo/admin precisa informar o PatientProfile — backend exige o campo 'patient'
    if (patientProfileId) {
      formData.append("patient", patientProfileId);
    }

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

    const res = await fetchWithRefresh(`${API_BASE_URL}/records/documents/`, {
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

    const res = await fetchWithRefresh(`${API_BASE_URL}/records/documents/${id}/`, {
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

// POST /api/auth/password/reset/ — solicitar recuperação de senha (rota pública)
export const requestPasswordReset = async (
  email: string,
): Promise<ApiResult> => {
  const { response, data } = await fetchJson(
    `${API_BASE_URL}/auth/password/reset/`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    },
  );

  if (!response.ok) return { ok: false, error: normalizeError(data), data };
  return { ok: true, data };
};

// POST /api/auth/password/reset/confirm/ — confirmar nova senha (rota pública)
export const confirmPasswordReset = async (payload: {
  uid: string;
  token: string;
  password: string;
}): Promise<ApiResult> => {
  const { response, data } = await fetchJson(
    `${API_BASE_URL}/auth/password/reset/confirm/`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) return { ok: false, error: normalizeError(data), data };
  return { ok: true, data };
};

// POST /api/auth/password/invite/confirm/ — primeiro acesso via convite (rota pública)
export const confirmInvite = async (payload: {
  uid: string;
  token: string;
  password: string;
}): Promise<ApiResult> => {
  const { response, data } = await fetchJson(
    `${API_BASE_URL}/auth/password/invite/confirm/`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) return { ok: false, error: normalizeError(data), data };
  return { ok: true, data };
};

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
