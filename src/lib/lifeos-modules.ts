export type LifeOsModuleId = "ravel" | "socialos" | "ledger" | "canon";

export interface LifeOsModuleSummary {
  eyebrow?: string;
  headline: string;
  detail?: string;
}

export interface LifeOsModuleSnapshot {
  id: LifeOsModuleId;
  name: string;
  summary: LifeOsModuleSummary | null;
  href: string | null;
}

export interface LifeOsModuleProvider {
  getModules(): LifeOsModuleSnapshot[];
}

const modules: Array<{ id: LifeOsModuleId; name: string }> = [
  { id: "ravel", name: "Ravel" },
  { id: "socialos", name: "SocialOS" },
  { id: "ledger", name: "Ledger" },
  { id: "canon", name: "Canon" }
];

export const disconnectedLifeOsModuleProvider: LifeOsModuleProvider = {
  getModules() {
    return modules.map((module) => ({
      ...module,
      summary: null,
      href: null
    }));
  }
};
