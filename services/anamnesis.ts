// Regras de anamnese e prontuário usadas pelas telas. Ficam fora dos
// componentes para poderem ser testadas sem renderizar React Native — a
// validação de verdade continua sendo a do backend.
import type {
  AnamnesisAnswerValue,
  AnamnesisAnswers,
  AnamnesisApiItem,
  AnamnesisQuestionApiItem,
  RecordEntryApiItem,
  RecordEntryKind,
} from "./api";

const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;

// Questões da escala sem min/max configurados seguem o padrão do modelo.
const ESCALA_MIN_PADRAO = 0;
const ESCALA_MAX_PADRAO = 10;

type QuestionWithId = AnamnesisQuestionApiItem & { id: string };

/** Perguntas em ordem de exibição, sem alterar o array recebido. */
export const sortQuestions = <T extends { order: number }>(
  questions: T[],
): T[] => [...questions].sort((a, b) => a.order - b.order);

/** Resposta ausente: nada, texto em branco ou lista vazia. `false` e `0` contam como resposta. */
export const isAnswerEmpty = (value: AnamnesisAnswerValue | undefined): boolean => {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
};

const isValidDate = (value: string): boolean => {
  if (!DATA_RE.test(value)) return false;
  const [ano, mes, dia] = value.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return (
    data.getUTCFullYear() === ano &&
    data.getUTCMonth() === mes - 1 &&
    data.getUTCDate() === dia
  );
};

/** Remove respostas vazias (e de perguntas que não existem mais) antes de enviar. */
export const pruneAnswers = (
  questions: { id: string }[],
  answers: AnamnesisAnswers,
): AnamnesisAnswers => {
  const pruned: AnamnesisAnswers = {};
  for (const { id } of questions) {
    if (!isAnswerEmpty(answers[id])) pruned[id] = answers[id];
  }
  return pruned;
};

/** Valores selecionáveis de uma escala, de `min` a `max` (padrão 0 a 10). */
export const getScaleValues = (
  config: AnamnesisQuestionApiItem["config"],
): number[] => {
  const min = Math.trunc(config.min ?? ESCALA_MIN_PADRAO);
  const max = Math.trunc(config.max ?? ESCALA_MAX_PADRAO);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) return [];
  return Array.from({ length: max - min + 1 }, (_, i) => min + i);
};

/**
 * Marca/desmarca uma opção da múltipla escolha. O resultado segue a ordem das
 * opções da pergunta (não a ordem dos toques), para o valor ficar estável.
 */
export const toggleOption = (
  current: AnamnesisAnswerValue | undefined,
  option: string,
  options: string[],
): string[] => {
  const selected = new Set(Array.isArray(current) ? current : []);
  if (selected.has(option)) selected.delete(option);
  else selected.add(option);
  return options.filter((item) => selected.has(item));
};

/**
 * Valida o valor de UMA resposta contra o tipo da pergunta. Resposta vazia é
 * válida aqui (a obrigatoriedade é checada em `validateAnswers`).
 * Retorna a mensagem de erro, ou `null` quando está tudo certo.
 */
export const validateAnswer = (
  question: AnamnesisQuestionApiItem,
  value: AnamnesisAnswerValue | undefined,
): string | null => {
  if (isAnswerEmpty(value)) return null;

  switch (question.type) {
    case "short_text":
    case "long_text":
      return typeof value === "string" ? null : "Informe um texto.";

    case "single_choice": {
      const options = question.config.options ?? [];
      return typeof value === "string" && options.includes(value)
        ? null
        : "Escolha uma das opções.";
    }

    case "multiple_choice": {
      const options = question.config.options ?? [];
      return Array.isArray(value) &&
        value.every((item) => options.includes(item))
        ? null
        : "Escolha apenas opções da lista.";
    }

    case "yes_no":
      return typeof value === "boolean" ? null : "Responda sim ou não.";

    case "date":
      return typeof value === "string" && isValidDate(value)
        ? null
        : "Informe uma data válida (AAAA-MM-DD).";

    case "scale": {
      const min = question.config.min ?? ESCALA_MIN_PADRAO;
      const max = question.config.max ?? ESCALA_MAX_PADRAO;
      return typeof value === "number" &&
        Number.isInteger(value) &&
        value >= min &&
        value <= max
        ? null
        : `Informe um número inteiro entre ${min} e ${max}.`;
    }

    default:
      return "Tipo de pergunta desconhecido.";
  }
};

/**
 * Valida todas as respostas de uma anamnese antes de finalizar: obrigatórias
 * respondidas e valores batendo com o tipo. Devolve `{ id da pergunta: erro }`;
 * objeto vazio significa que pode finalizar.
 */
export const validateAnswers = (
  questions: QuestionWithId[],
  answers: AnamnesisAnswers,
): Record<string, string> => {
  const errors: Record<string, string> = {};
  for (const question of questions) {
    const value = answers[question.id];
    if (question.required && isAnswerEmpty(value)) {
      errors[question.id] = "Pergunta obrigatória.";
      continue;
    }
    const error = validateAnswer(question, value);
    if (error) errors[question.id] = error;
  }
  return errors;
};

// ─── Linha do tempo do prontuário ────────────────────────────────────────────

export type TimelineItem =
  | {
      type: "entry";
      id: string;
      date: string;
      entry: RecordEntryApiItem;
      addenda: RecordEntryApiItem[];
    }
  | {
      type: "anamnesis";
      id: string;
      date: string;
      anamnesis: AnamnesisApiItem;
      addenda: RecordEntryApiItem[];
    };

const timestamp = (value?: string | null): number => {
  const parsed = value ? new Date(value).getTime() : NaN;
  return Number.isNaN(parsed) ? 0 : parsed;
};

const anamnesisDate = (a: AnamnesisApiItem): string =>
  a.finalized_at || a.created_at || "";

/**
 * Junta evoluções, encaminhamentos, anamneses etc. numa linha do tempo única.
 * Adendos saem da lista principal e ficam agrupados sob o registro original,
 * em ordem cronológica. Os itens principais vêm do mais recente para o mais
 * antigo (ou o contrário com `order: "asc"`).
 *
 * Adendo cujo original não está na lista (ex.: sem permissão) é mantido como
 * item próprio, para nunca sumir da tela.
 */
export const buildTimeline = (
  entries: RecordEntryApiItem[],
  anamneses: AnamnesisApiItem[],
  options: { order?: "asc" | "desc"; includeDrafts?: boolean } = {},
): TimelineItem[] => {
  const { order = "desc", includeDrafts = true } = options;
  const visible = (status: string) => includeDrafts || status === "finalized";

  const anamnesisIds = new Set(anamneses.map((a) => a.id));

  const addendaByTarget = new Map<string, RecordEntryApiItem[]>();
  const orphanAddenda: RecordEntryApiItem[] = [];

  const byId = new Map(entries.map((e) => [e.id, e]));
  // Adendo de adendo sobe até o registro original, para nunca sumir da tela.
  const resolveRoot = (entry: RecordEntryApiItem): string | null => {
    const seen = new Set<string>();
    let current: RecordEntryApiItem = entry;
    while (!seen.has(current.id)) {
      seen.add(current.id);
      const target = current.amends ?? current.amends_anamnesis ?? null;
      if (target === null) return null;
      const next = byId.get(target);
      if (!next || next.kind !== "addendum") {
        return next || anamnesisIds.has(target) ? target : null;
      }
      current = next;
    }
    return null;
  };

  for (const entry of entries) {
    if (entry.kind !== "addendum") continue;
    const target = resolveRoot(entry);
    if (target === null) {
      orphanAddenda.push(entry);
      continue;
    }
    addendaByTarget.set(target, [...(addendaByTarget.get(target) ?? []), entry]);
  }

  const addendaOf = (id: string) =>
    (addendaByTarget.get(id) ?? [])
      .filter((a) => visible(a.status))
      .sort((a, b) => timestamp(a.occurred_at) - timestamp(b.occurred_at));

  const items: TimelineItem[] = [];

  for (const entry of entries) {
    if (entry.kind === "addendum" && !orphanAddenda.includes(entry)) continue;
    if (!visible(entry.status)) continue;
    items.push({
      type: "entry",
      id: entry.id,
      date: entry.occurred_at,
      entry,
      addenda: addendaOf(entry.id),
    });
  }

  for (const anamnesis of anamneses) {
    if (!visible(anamnesis.status)) continue;
    items.push({
      type: "anamnesis",
      id: anamnesis.id,
      date: anamnesisDate(anamnesis),
      anamnesis,
      addenda: addendaOf(anamnesis.id),
    });
  }

  const direction = order === "asc" ? 1 : -1;
  return items.sort((a, b) => direction * (timestamp(a.date) - timestamp(b.date)));
};

/** Demanda vigente = a última demanda finalizada (decisão D3). */
export const getCurrentDemand = (
  entries: RecordEntryApiItem[],
): RecordEntryApiItem | null => {
  const finalized = entries.filter(
    (e) => e.kind === "demand" && e.status === "finalized",
  );
  if (!finalized.length) return null;
  return finalized.reduce((latest, e) =>
    timestamp(e.finalized_at ?? e.occurred_at) >=
    timestamp(latest.finalized_at ?? latest.occurred_at)
      ? e
      : latest,
  );
};

export const ENTRY_KIND_LABELS: Record<RecordEntryKind, string> = {
  demand: "Demanda",
  evolution: "Evolução",
  referral: "Encaminhamento",
  closure: "Encerramento",
  addendum: "Adendo",
};

/** Tipos que o psicólogo cria direto; adendo só nasce de um registro finalizado. */
export const CREATABLE_ENTRY_KINDS: Exclude<RecordEntryKind, "addendum">[] = [
  "demand",
  "evolution",
  "referral",
  "closure",
];

// Mesmo fuso fixo da clínica usado nos formulários de agendamento.
const FUSO_CLINICA = "-03:00";

/**
 * Monta o `occurred_at` (data do atendimento) a partir dos campos de data e
 * hora. Sem data devolve `undefined` e o backend usa o momento atual; com data
 * e sem hora usa o meio-dia, para o fuso não empurrar o registro de dia.
 */
export const buildOccurredAt = (date: string, time: string): string | undefined => {
  if (!DATA_RE.test(date)) return undefined;
  const hora = /^\d{2}:\d{2}$/.test(time) ? time : "12:00";
  return `${date}T${hora}:00${FUSO_CLINICA}`;
};

/** "10/09/2026 14:30" no fuso do dispositivo; vazio se a data for inválida. */
export const formatDateTime = (value?: string | null): string => {
  const parsed = value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

/** "10/09/2026"; vazio se a data for inválida. */
export const formatDate = (value?: string | null): string => {
  const parsed = value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("pt-BR");
};

/** Registro finalizado é imutável: só aceita adendo. Rascunho aceita edição e descarte. */
export const isImmutable = (item: { status: string }): boolean =>
  item.status === "finalized";

export const canAddAddendum = (
  item: { status: string; kind?: string },
  canWrite: boolean,
): boolean => canWrite && item.status === "finalized" && item.kind !== "addendum";
