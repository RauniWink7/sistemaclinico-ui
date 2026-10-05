import { describe, expect, it } from "vitest";
import type {
  AnamnesisApiItem,
  AnamnesisQuestionApiItem,
  RecordEntryApiItem,
} from "./api";
import {
  buildTimeline,
  canAddAddendum,
  getCurrentDemand,
  isAnswerEmpty,
  sortQuestions,
  validateAnswer,
  validateAnswers,
} from "./anamnesis";

const question = (
  overrides: Partial<AnamnesisQuestionApiItem> = {},
): AnamnesisQuestionApiItem => ({
  order: 1,
  type: "short_text",
  label: "Pergunta",
  required: false,
  config: {},
  ...overrides,
});

const entry = (overrides: Partial<RecordEntryApiItem> = {}): RecordEntryApiItem => ({
  id: "e1",
  kind: "evolution",
  status: "finalized",
  content: "texto",
  author: "u1",
  occurred_at: "2026-09-10T10:00:00-03:00",
  ...overrides,
});

const anamnesis = (overrides: Partial<AnamnesisApiItem> = {}): AnamnesisApiItem => ({
  id: "a1",
  template_snapshot: { title: "Modelo", questions: [] },
  answers: {},
  status: "finalized",
  author: "u1",
  finalized_at: "2026-09-01T10:00:00-03:00",
  ...overrides,
});

describe("sortQuestions", () => {
  it("ordena por order sem alterar o array original", () => {
    const original = [question({ order: 3 }), question({ order: 1 }), question({ order: 2 })];
    expect(sortQuestions(original).map((q) => q.order)).toEqual([1, 2, 3]);
    expect(original.map((q) => q.order)).toEqual([3, 1, 2]);
  });
});

describe("isAnswerEmpty", () => {
  it("considera vazios: ausente, nulo, texto em branco e lista vazia", () => {
    for (const v of [undefined, null, "", "   ", []]) expect(isAnswerEmpty(v)).toBe(true);
  });

  it("false e 0 são respostas válidas", () => {
    expect(isAnswerEmpty(false)).toBe(false);
    expect(isAnswerEmpty(0)).toBe(false);
  });
});

describe("validateAnswer", () => {
  it("aceita resposta vazia (obrigatoriedade é outra checagem)", () => {
    expect(validateAnswer(question({ type: "date" }), "")).toBeNull();
  });

  it("texto exige string", () => {
    expect(validateAnswer(question({ type: "long_text" }), "ok")).toBeNull();
    expect(validateAnswer(question({ type: "long_text" }), 5)).not.toBeNull();
  });

  it("escolha única exige uma das opções", () => {
    const q = question({ type: "single_choice", config: { options: ["A", "B"] } });
    expect(validateAnswer(q, "A")).toBeNull();
    expect(validateAnswer(q, "C")).not.toBeNull();
    expect(validateAnswer(q, ["A"])).not.toBeNull();
  });

  it("múltipla escolha exige lista só com opções válidas", () => {
    const q = question({ type: "multiple_choice", config: { options: ["A", "B"] } });
    expect(validateAnswer(q, ["A", "B"])).toBeNull();
    expect(validateAnswer(q, ["A", "C"])).not.toBeNull();
    expect(validateAnswer(q, "A")).not.toBeNull();
  });

  it("sim/não exige booleano", () => {
    const q = question({ type: "yes_no" });
    expect(validateAnswer(q, false)).toBeNull();
    expect(validateAnswer(q, "sim")).not.toBeNull();
  });

  it("data exige AAAA-MM-DD existente", () => {
    const q = question({ type: "date" });
    expect(validateAnswer(q, "2026-02-28")).toBeNull();
    expect(validateAnswer(q, "2026-02-30")).not.toBeNull();
    expect(validateAnswer(q, "10/09/2026")).not.toBeNull();
  });

  it("escala exige inteiro dentro de min e max", () => {
    const q = question({ type: "scale", config: { min: 1, max: 5 } });
    expect(validateAnswer(q, 5)).toBeNull();
    expect(validateAnswer(q, 6)).not.toBeNull();
    expect(validateAnswer(q, 0)).not.toBeNull();
    expect(validateAnswer(q, 2.5)).not.toBeNull();
  });

  it("escala sem config usa 0 a 10", () => {
    const q = question({ type: "scale" });
    expect(validateAnswer(q, 0)).toBeNull();
    expect(validateAnswer(q, 10)).toBeNull();
    expect(validateAnswer(q, 11)).not.toBeNull();
  });
});

describe("validateAnswers", () => {
  const questions = [
    { ...question({ order: 1, required: true }), id: "q1" },
    { ...question({ order: 2, type: "yes_no" }), id: "q2" },
  ];

  it("aponta obrigatória sem resposta", () => {
    expect(validateAnswers(questions, {})).toEqual({ q1: "Pergunta obrigatória." });
  });

  it("aponta valor que não bate com o tipo", () => {
    const errors = validateAnswers(questions, { q1: "ok", q2: "talvez" });
    expect(Object.keys(errors)).toEqual(["q2"]);
  });

  it("devolve objeto vazio quando está tudo certo", () => {
    expect(validateAnswers(questions, { q1: "ok", q2: false })).toEqual({});
  });
});

describe("buildTimeline", () => {
  it("agrupa adendos sob o original em ordem cronológica", () => {
    const original = entry({ id: "e1" });
    const tarde = entry({ id: "e3", kind: "addendum", amends: "e1", occurred_at: "2026-09-12T10:00:00-03:00" });
    const cedo = entry({ id: "e2", kind: "addendum", amends: "e1", occurred_at: "2026-09-11T10:00:00-03:00" });

    const timeline = buildTimeline([original, tarde, cedo], []);

    expect(timeline).toHaveLength(1);
    expect(timeline[0].addenda.map((a) => a.id)).toEqual(["e2", "e3"]);
  });

  it("agrupa adendo de anamnese sob a anamnese", () => {
    const adendo = entry({ id: "e2", kind: "addendum", amends_anamnesis: "a1" });
    const timeline = buildTimeline([adendo], [anamnesis()]);

    expect(timeline).toHaveLength(1);
    expect(timeline[0].type).toBe("anamnesis");
    expect(timeline[0].addenda).toHaveLength(1);
  });

  it("adendo de adendo sobe até o original", () => {
    const entries = [
      entry({ id: "e1" }),
      entry({ id: "e2", kind: "addendum", amends: "e1" }),
      entry({ id: "e3", kind: "addendum", amends: "e2", occurred_at: "2026-09-12T10:00:00-03:00" }),
    ];
    const timeline = buildTimeline(entries, []);

    expect(timeline).toHaveLength(1);
    expect(timeline[0].addenda.map((a) => a.id)).toEqual(["e2", "e3"]);
  });

  it("adendo sem original visível não some", () => {
    const timeline = buildTimeline([entry({ id: "e9", kind: "addendum", amends: "outro" })], []);
    expect(timeline.map((i) => i.id)).toEqual(["e9"]);
  });

  it("ordena do mais recente para o mais antigo por padrão e aceita asc", () => {
    const entries = [
      entry({ id: "antigo", occurred_at: "2026-01-01T10:00:00-03:00" }),
      entry({ id: "novo", occurred_at: "2026-06-01T10:00:00-03:00" }),
    ];
    expect(buildTimeline(entries, []).map((i) => i.id)).toEqual(["novo", "antigo"]);
    expect(buildTimeline(entries, [], { order: "asc" }).map((i) => i.id)).toEqual(["antigo", "novo"]);
  });

  it("mistura entradas e anamneses pela data", () => {
    const timeline = buildTimeline(
      [entry({ id: "e1", occurred_at: "2026-09-10T10:00:00-03:00" })],
      [anamnesis({ id: "a1", finalized_at: "2026-09-01T10:00:00-03:00" })],
    );
    expect(timeline.map((i) => i.id)).toEqual(["e1", "a1"]);
  });

  it("omite rascunhos quando includeDrafts é false", () => {
    const entries = [entry({ id: "e1" }), entry({ id: "e2", status: "draft" })];
    expect(buildTimeline(entries, [], { includeDrafts: false }).map((i) => i.id)).toEqual(["e1"]);
    expect(buildTimeline(entries, []).map((i) => i.id).sort()).toEqual(["e1", "e2"]);
  });
});

describe("getCurrentDemand", () => {
  it("devolve a última demanda finalizada, ignorando rascunhos e outros tipos", () => {
    const entries = [
      entry({ id: "d1", kind: "demand", finalized_at: "2026-01-01T10:00:00-03:00" }),
      entry({ id: "d2", kind: "demand", finalized_at: "2026-03-01T10:00:00-03:00" }),
      entry({ id: "d3", kind: "demand", status: "draft", finalized_at: null }),
      entry({ id: "ev", kind: "evolution", finalized_at: "2026-09-01T10:00:00-03:00" }),
    ];
    expect(getCurrentDemand(entries)?.id).toBe("d2");
  });

  it("devolve null sem demanda finalizada", () => {
    expect(getCurrentDemand([entry({ kind: "demand", status: "draft" })])).toBeNull();
  });
});

describe("canAddAddendum", () => {
  it("só em registro finalizado, com permissão de escrita e que não seja adendo", () => {
    expect(canAddAddendum({ status: "finalized", kind: "evolution" }, true)).toBe(true);
    expect(canAddAddendum({ status: "draft", kind: "evolution" }, true)).toBe(false);
    expect(canAddAddendum({ status: "finalized", kind: "evolution" }, false)).toBe(false);
    expect(canAddAddendum({ status: "finalized", kind: "addendum" }, true)).toBe(false);
  });
});
