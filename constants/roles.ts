// /constants/roles.ts

export type RoleLevel = 0 | 10 | 20;

export const RoleLevels = {
  TECHNICAL: 0,
  MANAGER: 10,
  STANDARD: 20,
} as const;

export const RoleLabels: Record<RoleLevel, Record<string, string>> = {
  [RoleLevels.TECHNICAL]: {
    spa: "Técnico",
    eng: "Technical",
    por: "Técnico",
    fra: "Technicien",
    ita: "Tecnico",
    rus: "Техник",
  },
  [RoleLevels.MANAGER]: {
    spa: "Gerente",
    eng: "Manager",
    por: "Gerente",
    fra: "Gestionnaire",
    ita: "Manager",
    rus: "Менеджер",
  },
  [RoleLevels.STANDARD]: {
    spa: "Estándar",
    eng: "Standard",
    por: "Padrão",
    fra: "Standard",
    ita: "Standard",
    rus: "Обычный",
  },
};
