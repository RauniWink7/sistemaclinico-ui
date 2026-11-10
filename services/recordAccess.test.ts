import { describe, expect, it } from "vitest";
import type { ProfessionalApiItem, RecordAccessGrantApiItem } from "./api";
import {
  availableGrantees,
  describeAccessAction,
  describeGrantLevel,
  splitGrants,
} from "./recordAccess";

const professional = (id: string, name: string): ProfessionalApiItem => ({
  id,
  user: { id: `u-${id}`, email: `${id}@x.com`, full_name: name },
});

const grant = (
  overrides: Partial<RecordAccessGrantApiItem> = {},
): RecordAccessGrantApiItem => ({
  id: "g1",
  grantee: "p2",
  can_write: false,
  granted_at: "2026-09-10T10:00:00-03:00",
  ...overrides,
});

describe("splitGrants", () => {
  it("separa autorizações ativas das revogadas", () => {
    const { active, revoked } = splitGrants([
      grant({ id: "a" }),
      grant({ id: "b", revoked_at: "2026-09-11T10:00:00-03:00" }),
    ]);
    expect(active.map((g) => g.id)).toEqual(["a"]);
    expect(revoked.map((g) => g.id)).toEqual(["b"]);
  });
});

describe("availableGrantees", () => {
  const all = [
    professional("p1", "Zélia"),
    professional("p2", "Ana"),
    professional("p3", "Bruno"),
  ];

  it("exclui o responsável e quem já tem autorização ativa", () => {
    const result = availableGrantees(all, [grant({ grantee: "p2" })], "p1");
    expect(result.map((p) => p.id)).toEqual(["p3"]);
  });

  it("quem teve a autorização revogada volta a aparecer", () => {
    const revoked = grant({ grantee: "p2", revoked_at: "2026-09-11T10:00:00-03:00" });
    expect(availableGrantees(all, [revoked], "p1").map((p) => p.id)).toEqual(["p2", "p3"]);
  });

  it("ordena pelo nome", () => {
    expect(availableGrantees(all, [], null).map((p) => p.user.full_name)).toEqual([
      "Ana",
      "Bruno",
      "Zélia",
    ]);
  });
});

describe("rótulos", () => {
  it("descreve o nível de acesso", () => {
    expect(describeGrantLevel({ can_write: true })).toBe("Leitura e escrita");
    expect(describeGrantLevel({ can_write: false })).toBe("Somente leitura");
  });

  it("traduz ações do log e mantém as desconhecidas", () => {
    expect(describeAccessAction("record.viewed")).toBe("Visualizou o prontuário");
    expect(describeAccessAction("outra.acao")).toBe("outra.acao");
  });
});
