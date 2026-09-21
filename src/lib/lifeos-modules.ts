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

export interface LifeOsModuleDestinations {
  ravel?: string | null;
  socialos?: string | null;
  ledger?: string | null;
  canon?: string | null;
}

const modules: Array<{ id: LifeOsModuleId; name: string }> = [
  { id: "ravel", name: "Ravel" },
  { id: "socialos", name: "SocialOS" },
  { id: "ledger", name: "Ledger" },
  { id: "canon", name: "Canon" }
];

export function normalizeLifeOsModuleHref(value: string | null | undefined): string | null {
  const candidate = value?.trim();
  if (!candidate) return null;

  if (candidate.startsWith("/") && !candidate.startsWith("//") && !candidate.includes("\\")) {
    return candidate;
  }

  try {
    const url = new URL(candidate);
    if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function createLifeOsModuleProvider(destinations: LifeOsModuleDestinations): LifeOsModuleProvider {
  return {
    getModules() {
      return modules.map((module) => ({
        ...module,
        summary: null,
        href: normalizeLifeOsModuleHref(destinations[module.id])
      }));
    }
  };
}

export const configuredLifeOsModuleProvider = createLifeOsModuleProvider({
  ravel: process.env.NEXT_PUBLIC_LIFEOS_RAVEL_URL,
  socialos: process.env.NEXT_PUBLIC_LIFEOS_SOCIALOS_URL,
  ledger: process.env.NEXT_PUBLIC_LIFEOS_LEDGER_URL,
  canon: process.env.NEXT_PUBLIC_LIFEOS_CANON_URL
});
