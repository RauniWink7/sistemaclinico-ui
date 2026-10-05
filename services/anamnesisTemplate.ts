// Regras do editor de modelos de anamnese. Ficam fora das telas para poderem
// ser testadas sem renderizar React Native — a validação de verdade continua
// sendo a do backend.
import type {
  AnamnesisQuestionApiItem,
  AnamnesisQuestionType,
  AnamnesisTemplatePayload,
} from "./api";

export const QUESTION_TYPE_LABELS: Record<AnamnesisQuestionType, string> = {
  short_text: "Texto curto",
  long_text: "Texto longo",
  single_choice: "Escolha única",
  multiple_choice: "Múltipla escolha",
  yes_no: "Sim / Não",
  date: "Data",
  scale: "Escala",
};

export const QUESTION_TYPES = Object.keys(
  QUESTION_TYPE_LABELS,
) as AnamnesisQuestionType[];

// Pergunta em edição: ganha uma chave local estável (`key`) para a lista não
// perder o foco ao reordenar, já que perguntas novas ainda não têm id.
export type DraftQuestion = AnamnesisQuestionApiItem & { key: string };

export interface DraftTemplate {
  title: string;
  description: string;
  questions: DraftQuestion[];
}

let keyCounter = 0;
const nextKey = () => `q${++keyCounter}`;

const isChoice = (type: AnamnesisQuestionType) =>
  type === "single_choice" || type === "multiple_choice";

/** Config inicial de cada tipo (escolhas começam com duas opções vazias). */
export const defaultConfig = (
  type: AnamnesisQuestionType,
): AnamnesisQuestionApiItem["config"] => {
  if (isChoice(type)) return { options: ["", ""] };
  if (type === "scale") return { min: 0, max: 10, min_label: "", max_label: "" };
  return {};
};

const renumber = (questions: DraftQuestion[]): DraftQuestion[] =>
  questions.map((question, index) => ({ ...question, order: index + 1 }));

export const newQuestion = (
  type: AnamnesisQuestionType = "short_text",
): DraftQuestion => ({
  key: nextKey(),
  order: 0,
  type,
  label: "",
  help_text: "",
  required: false,
  config: defaultConfig(type),
});

export const emptyDraft = (): DraftTemplate => ({
  title: "",
  description: "",
  questions: renumber([newQuestion()]),
});

/** Converte o modelo vindo da API para o formato de edição. */
export const toDraft = (template: {
  title: string;
  description?: string;
  questions: AnamnesisQuestionApiItem[];
}): DraftTemplate => ({
  title: template.title,
  description: template.description ?? "",
  questions: [...template.questions]
    .sort((a, b) => a.order - b.order)
    .map((question) => ({
      ...question,
      key: nextKey(),
      help_text: question.help_text ?? "",
      config: { ...question.config },
    })),
});

/** Troca o tipo da pergunta e reinicia a config, que só vale para o tipo anterior. */
export const changeQuestionType = (
  question: DraftQuestion,
  type: AnamnesisQuestionType,
): DraftQuestion =>
  type === question.type
    ? question
    : { ...question, type, config: defaultConfig(type) };

export const addQuestion = (
  questions: DraftQuestion[],
  type?: AnamnesisQuestionType,
): DraftQuestion[] => renumber([...questions, newQuestion(type)]);

export const removeQuestion = (
  questions: DraftQuestion[],
  index: number,
): DraftQuestion[] => renumber(questions.filter((_, i) => i !== index));

/** Sobe (`-1`) ou desce (`1`) uma pergunta; nos limites devolve a lista como está. */
export const moveQuestion = (
  questions: DraftQuestion[],
  index: number,
  direction: -1 | 1,
): DraftQuestion[] => {
  const target = index + direction;
  if (index < 0 || index >= questions.length) return questions;
  if (target < 0 || target >= questions.length) return questions;
  const next = [...questions];
  [next[index], next[target]] = [next[target], next[index]];
  return renumber(next);
};

export interface TemplateErrors {
  title?: string;
  questions?: string;
  // Erro por chave da pergunta (`DraftQuestion.key`).
  byQuestion: Record<string, string>;
}

/** Valida o modelo antes de salvar. `hasErrors` é falso quando pode enviar. */
export const validateTemplate = (
  draft: DraftTemplate,
): TemplateErrors & { hasErrors: boolean } => {
  const errors: TemplateErrors = { byQuestion: {} };

  if (!draft.title.trim()) errors.title = "Informe o título do modelo.";
  if (draft.questions.length === 0) {
    errors.questions = "Adicione pelo menos uma pergunta.";
  }

  for (const question of draft.questions) {
    if (!question.label.trim()) {
      errors.byQuestion[question.key] = "Informe o enunciado da pergunta.";
      continue;
    }

    if (isChoice(question.type)) {
      const options = (question.config.options ?? [])
        .map((option) => option.trim())
        .filter(Boolean);
      if (options.length < 2) {
        errors.byQuestion[question.key] = "Informe pelo menos duas opções.";
      } else if (new Set(options).size !== options.length) {
        errors.byQuestion[question.key] = "As opções não podem se repetir.";
      }
    }

    if (question.type === "scale") {
      const { min, max } = question.config;
      if (
        !Number.isInteger(min) ||
        !Number.isInteger(max) ||
        (min as number) >= (max as number)
      ) {
        errors.byQuestion[question.key] =
          "Informe valores inteiros, com o mínimo menor que o máximo.";
      }
    }
  }

  const hasErrors =
    !!errors.title || !!errors.questions || Object.keys(errors.byQuestion).length > 0;
  return { ...errors, hasErrors };
};

/** Monta o corpo enviado à API: textos aparados, opções vazias removidas, ordem 1..n. */
export const buildTemplatePayload = (
  draft: DraftTemplate,
): AnamnesisTemplatePayload => ({
  title: draft.title.trim(),
  description: draft.description.trim(),
  questions: draft.questions.map((question, index) => {
    const config: AnamnesisQuestionApiItem["config"] = isChoice(question.type)
      ? {
          options: (question.config.options ?? [])
            .map((option) => option.trim())
            .filter(Boolean),
        }
      : question.type === "scale"
        ? {
            min: question.config.min,
            max: question.config.max,
            min_label: (question.config.min_label ?? "").trim(),
            max_label: (question.config.max_label ?? "").trim(),
          }
        : {};
    return {
      order: index + 1,
      type: question.type,
      label: question.label.trim(),
      help_text: (question.help_text ?? "").trim(),
      required: question.required,
      config,
    };
  }),
});
