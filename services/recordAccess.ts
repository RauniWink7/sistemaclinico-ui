// Regras de autorização e log de acesso do prontuário. Ficam fora das telas
// para poderem ser testadas sem renderizar React Native — quem decide de fato
// o acesso é o backend.
import type { ProfessionalApiItem, RecordAccessGrantApiItem } from "./api";

/** Autorização em vigor: não revogada. */
export const isGrantActive = (grant: RecordAccessGrantApiItem): boolean =>
  !grant.revoked_at;

export const splitGrants = (grants: RecordAccessGrantApiItem[]) => ({
  active: grants.filter(isGrantActive),
  revoked: grants.filter((g) => !isGrantActive(g)),
});

/**
 * Psicólogos que ainda podem receber autorização: fora o responsável (que já
 * tem acesso) e quem já tem uma autorização ativa. Quem teve a autorização
 * revogada volta a aparecer. Ordem alfabética pelo nome.
 */
export const availableGrantees = (
  professionals: ProfessionalApiItem[],
  grants: RecordAccessGrantApiItem[],
  responsibleId?: string | null,
): ProfessionalApiItem[] => {
  const blocked = new Set(
    grants.filter(isGrantActive).map((grant) => grant.grantee),
  );
  if (responsibleId) blocked.add(responsibleId);
  return professionals
    .filter((professional) => !blocked.has(professional.id))
    .sort((a, b) => a.user.full_name.localeCompare(b.user.full_name, "pt-BR"));
};

export const describeGrantLevel = (grant: { can_write: boolean }): string =>
  grant.can_write ? "Leitura e escrita" : "Somente leitura";

// Ações registradas no AuditLog (seção 5.3 do plano).
const ACTION_LABELS: Record<string, string> = {
  "record.viewed": "Visualizou o prontuário",
  "record.entry_created": "Criou um registro",
  "record.entry_finalized": "Finalizou um registro",
  "record.addendum_created": "Registrou um adendo",
  "record.exported": "Exportou o prontuário em PDF",
  "record.access_granted": "Concedeu acesso",
  "record.access_revoked": "Revogou acesso",
  "anamnesis.created": "Iniciou uma anamnese",
  "anamnesis.finalized": "Finalizou uma anamnese",
};

/** Texto legível de uma ação do log; ação desconhecida aparece como veio. */
export const describeAccessAction = (action: string): string =>
  ACTION_LABELS[action] ?? action;
