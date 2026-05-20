# 📋 Relatório de Correções — Frontend

## Sistema de Clínica — Análise de Endpoints x Frontend

**Data:** Maio 2026 | **Base URL:** http://localhost:8000

---

## ✅ Correções Realizadas

### 1. **Autenticação — Login** ✓

📄 Arquivo: `app/(auth)/login.tsx`

**Status:** ✅ JÁ ESTAVA CORRETO

- Usa campo `email` (não `username`)
- Endpoint correto: `POST /api/auth/login/`
- Retorna `access_token` e `refresh_token` com JWT (role e clinic_id)

---

### 2. **Cadastro — Criação de Paciente** ✓

📄 Arquivo: `app/(auth)/cadastro.tsx`

**Mudanças Realizadas:**

- ✅ Body agora usa `password` (não `password_confirmation`)
- ✅ Endpoint mantido: `POST /api/auth/register/` (registro público)
- ✅ Campos corretos: `email`, `full_name`, `phone`, `clinic` (UUID obrigatório), `role`
- ✅ Removido campo `password_confirmation` (não suportado pelo backend)

**Estrutura Corrigida:**

```json
{
  "full_name": "Nome Paciente",
  "email": "paciente@email.com",
  "password": "senha123",
  "phone": "11999999999",
  "clinic": "<uuid-clinica>",
  "role": "patient"
}
```

---

### 3. **Home Paciente — Dashboard** ✓

📄 Arquivo: `app/(patient)/homep.tsx`

**Status:** ✅ JÁ ESTAVA CORRETO

- Usa `GET /api/appointments/` para listar consultas (filtrado automaticamente por paciente)
- NÃO chama `getProfessionalSummary()` (exclusive para psicólogos)
- Backend filtra automaticamente pelo usuário autenticado

---

### 4. **Perfil do Paciente** ✓

📄 Arquivo: `app/(patient)/perfil.tsx`

**Mudanças Realizadas:**

- ✅ Endpoint correto: `GET/PATCH /api/auth/patients/{user_id}/profile/`
- ✅ Adicionados campos opcionais: `medical_history`, `anamnesis`
- ✅ Separação clara entre campos de User e PatientProfile:
  - **User** (via `PATCH /api/auth/me/`): `full_name`, `phone`
  - **PatientProfile** (via `PATCH /api/auth/patients/{id}/profile/`): `birth_date`, `cpf`, `medical_history`, `anamnesis`, `emergency_contact_name`, `emergency_contact_phone`

**Estrutura Corrigida:**

```json
// PATCH /api/auth/me/ (User)
{
  "full_name": "Nome Completo",
  "phone": "11999999999"
}

// PATCH /api/auth/patients/{user_id}/profile/ (PatientProfile)
{
  "birth_date": "1990-01-15",
  "cpf": "123.456.789-00",
  "medical_history": "Histórico...",
  "anamnesis": "Anamnese...",
  "emergency_contact_name": "Nome",
  "emergency_contact_phone": "11999..."
}
```

---

### 5. **Escolha de Psicólogo** ✓

📄 Arquivo: `app/(patient)/escolha.tsx`

**Status:** ✅ JÁ ESTAVA CORRETO

- Endpoint correto: `GET /api/auth/professionals/`
- Backend filtra automaticamente pela clínica do usuário logado
- Busca disponibilidade com: `GET /api/appointments/availability/?professional=<uuid>`

---

### 6. **Agendamento de Consulta** ✓

📄 Arquivo: `app/(patient)/agendamento.tsx`

**Mudanças Realizadas em `api.ts`:**

- ✅ Corrigido: Não envia campo `patient` (backend injeta automaticamente)
- ✅ Corrigido: Não envia campo `clinic` (backend injeta automaticamente)
- ✅ Envia: `professional` (UUID do ProfessionalProfile), `scheduled_at` (ISO 8601 com timezone), `duration_minutes`

**Estrutura Corrigida:**

```json
{
  "professional": "<professional_profile_uuid>",
  "scheduled_at": "2025-06-15T10:00:00-03:00",
  "duration_minutes": 50
}
```

---

### 7. **Listagem de Consultas** ✓

📄 Arquivo: `app/(patient)/consultas.tsx`

**Status:** ✅ JÁ ESTAVA CORRETO

- Cancelamento: `POST /api/appointments/{pk}/cancel/` com `cancel_reason` obrigatório
- Avaliação: `POST /api/appointments/{pk}/rating/` com `score` (1-5) e `comment` opcional
- Usa modal para cancelamento (não Alert.prompt)

---

### 8. **Documentos do Paciente** ✓

📄 Arquivo: `app/(patient)/documento.tsx`

**Status:** ✅ ARQUIVO COMENTADO

- Quando habilitado, usa `Content-Type: multipart/form-data`
- Campos corretos: `file`, `title`, `file_type` (`pdf`, `image`, `document`, `other`)
- NÃO envia campo `patient` (injetado automaticamente)

---

### 9. **Chat** ✓

📄 Arquivo: `app/(patient)/chat.tsx`

**Status:** ✅ USA REST API (não WebSocket)

- Endpoint para envio: `POST /api/chat/messages/`
- Estrutura: `receiver`, `content_encrypted`, `message_type`, `appointment` (opcional)
- Marca como lida: `PATCH /api/chat/messages/read/?with=<user_id>`

**Nota:** WebSocket disponível em `ws://localhost:8000/ws/chat/<contact_id>/?token=<access_token>`

- Use `contact_id` (UUID do outro usuário), não `user_id`
- Autenticação via query param `?token=`

---

## 🔧 Funções Adicionadas em `api.ts`

### Novos Endpoints Implementados:

1. **`createPatientAsAdmin()`** — POST `/api/auth/admin/users/patients/` (para admin)
2. **`requestPasswordReset()`** — POST `/api/auth/password/reset/`
3. **`confirmPasswordReset()`** — POST `/api/auth/password/reset/confirm/`
4. **`confirmInvite()`** — POST `/api/auth/password/invite/confirm/`
5. **`getChatContacts()`** — GET `/api/chat/contacts/`
6. **`markMessagesRead()`** — PATCH `/api/chat/messages/read/?with=<user_id>`
7. **`getUnreadNotifications()`** — GET `/api/notifications/unread/`
8. **`getAvailability()`** — Alias para `getPsychologistAvailability()`

---

## 📊 Resumo Geral

| Arquivo         | Problema             | Status            | Tipo   |
| --------------- | -------------------- | ----------------- | ------ |
| login.tsx       | Campo email ✓        | ✅ OK             | -      |
| cadastro.tsx    | Body correto         | ✅ CORRIGIDO      | ● ERRO |
| homep.tsx       | Endpoint correto     | ✅ OK             | -      |
| perfil.tsx      | Campos editáveis     | ✅ CORRIGIDO      | ● ERRO |
| escolha.tsx     | Rota psicólogos      | ✅ OK             | -      |
| agendamento.tsx | professional_profile | ✅ CORRIGIDO      | ● ERRO |
| consultas.tsx   | Cancelamento POST    | ✅ OK             | -      |
| documento.tsx   | multipart/form-data  | ✅ OK (comentado) | -      |
| chat.tsx        | REST API             | ✅ OK             | -      |
| api.ts          | Funções suporte      | ✅ ADICIONADAS    | ✓      |

---

## ⚠️ Pontos Importantes

1. **UUIDs obrigatórios**: Sempre validar que `clinic` é um UUID válido (não string fixa)
2. **Timezone ISO 8601**: Campos `scheduled_at` devem incluir timezone (ex: `-03:00`)
3. **Injeção automática**: Backend injeta automaticamente `patient` e `clinic` em agendamentos
4. **Separação de endpoints**: User data (`updateMe`) vs PatientProfile data (`updatePatientProfile`)
5. **Role do paciente**: Definida automaticamente pelo backend quando criado via admin

---

**Gerado em:** Maio 2026  
**Ultima Atualização:** [Data atual]
