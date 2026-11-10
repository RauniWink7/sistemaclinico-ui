import { describe, expect, it } from "vitest";
import {
  addQuestion,
  buildTemplatePayload,
  changeQuestionType,
  emptyDraft,
  moveQuestion,
  newQuestion,
  removeQuestion,
  toDraft,
  validateTemplate,
  type DraftTemplate,
} from "./anamnesisTemplate";

const draftWith = (overrides: Partial<DraftTemplate> = {}): DraftTemplate => {
  const base = emptyDraft();
  base.title = "Modelo";
  base.questions[0].label = "Queixa principal";
  return { ...base, ...overrides };
};

describe("lista de perguntas", () => {
  it("o rascunho vazio começa com uma pergunta de ordem 1", () => {
    const draft = emptyDraft();
    expect(draft.questions).toHaveLength(1);
    expect(draft.questions[0].order).toBe(1);
  });

  it("adicionar e remover renumeram de 1 a n", () => {
    let questions = addQuestion(addQuestion(emptyDraft().questions));
    expect(questions.map((q) => q.order)).toEqual([1, 2, 3]);
    questions = removeQuestion(questions, 0);
    expect(questions.map((q) => q.order)).toEqual([1, 2]);
  });

  it("mover troca de posição, renumera e respeita os limites", () => {
    const questions = addQuestion(addQuestion(emptyDraft().questions));
    const [a, b] = questions;

    const moved = moveQuestion(questions, 0, 1);
    expect(moved[0].key).toBe(b.key);
    expect(moved[1].key).toBe(a.key);
    expect(moved.map((q) => q.order)).toEqual([1, 2, 3]);

    expect(moveQuestion(questions, 0, -1)).toBe(questions);
    expect(moveQuestion(questions, 2, 1)).toBe(questions);
  });

  it("perguntas novas têm chaves diferentes", () => {
    expect(newQuestion().key).not.toBe(newQuestion().key);
  });
});

describe("changeQuestionType", () => {
  it("reinicia a config ao trocar de tipo", () => {
    const q = changeQuestionType(newQuestion("short_text"), "single_choice");
    expect(q.config.options).toEqual(["", ""]);
    const scale = changeQuestionType(q, "scale");
    expect(scale.config).toMatchObject({ min: 0, max: 10 });
    expect(scale.config.options).toBeUndefined();
  });

  it("mantém a pergunta quando o tipo é o mesmo", () => {
    const q = newQuestion("date");
    expect(changeQuestionType(q, "date")).toBe(q);
  });
});

describe("validateTemplate", () => {
  it("aceita um modelo completo", () => {
    expect(validateTemplate(draftWith()).hasErrors).toBe(false);
  });

  it("exige título e ao menos uma pergunta", () => {
    const result = validateTemplate(draftWith({ title: "  ", questions: [] }));
    expect(result.title).toBeTruthy();
    expect(result.questions).toBeTruthy();
    expect(result.hasErrors).toBe(true);
  });

  it("exige enunciado em cada pergunta", () => {
    const draft = draftWith();
    draft.questions[0].label = " ";
    const result = validateTemplate(draft);
    expect(result.byQuestion[draft.questions[0].key]).toBeTruthy();
  });

  it("escolhas exigem duas opções preenchidas e sem repetição", () => {
    const draft = draftWith();
    draft.questions[0] = changeQuestionType(draft.questions[0], "single_choice");
    draft.questions[0].label = "Escolha";
    const key = draft.questions[0].key;

    expect(validateTemplate(draft).byQuestion[key]).toBeTruthy();

    draft.questions[0].config = { options: ["A", " a "] };
    expect(validateTemplate(draft).byQuestion[key]).toBeUndefined();

    draft.questions[0].config = { options: ["A", "A"] };
    expect(validateTemplate(draft).byQuestion[key]).toBeTruthy();
  });

  it("escala exige inteiros com mínimo menor que o máximo", () => {
    const draft = draftWith();
    draft.questions[0] = changeQuestionType(draft.questions[0], "scale");
    draft.questions[0].label = "Humor";
    const key = draft.questions[0].key;

    expect(validateTemplate(draft).hasErrors).toBe(false);

    draft.questions[0].config = { min: 5, max: 5 };
    expect(validateTemplate(draft).byQuestion[key]).toBeTruthy();

    draft.questions[0].config = { min: 0, max: 2.5 };
    expect(validateTemplate(draft).byQuestion[key]).toBeTruthy();
  });
});

describe("buildTemplatePayload", () => {
  it("apara textos, remove opções vazias e numera a ordem", () => {
    const draft = draftWith({ title: "  Modelo  ", description: " desc " });
    draft.questions[0] = changeQuestionType(draft.questions[0], "multiple_choice");
    draft.questions[0].label = "  Sintomas ";
    draft.questions[0].config = { options: [" A ", "", "B"] };

    const payload = buildTemplatePayload(draft);

    expect(payload.title).toBe("Modelo");
    expect(payload.description).toBe("desc");
    expect(payload.questions[0]).toMatchObject({
      order: 1,
      label: "Sintomas",
      config: { options: ["A", "B"] },
    });
    expect(payload.questions[0]).not.toHaveProperty("key");
  });

  it("limpa config que não pertence ao tipo", () => {
    const draft = draftWith();
    draft.questions[0].config = { options: ["x", "y"], min: 1 };
    expect(buildTemplatePayload(draft).questions[0].config).toEqual({});
  });
});

describe("toDraft", () => {
  it("ordena as perguntas e preenche campos opcionais", () => {
    const draft = toDraft({
      title: "T",
      questions: [
        { order: 2, type: "date", label: "B", required: false, config: {} },
        { order: 1, type: "yes_no", label: "A", required: true, config: {} },
      ],
    });
    expect(draft.description).toBe("");
    expect(draft.questions.map((q) => q.label)).toEqual(["A", "B"]);
    expect(draft.questions[0].help_text).toBe("");
  });
});
