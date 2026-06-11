import type { DashboardPreference, DashboardSectionId } from "@/lib/types";

export const DASHBOARD_SECTION_ORDER: DashboardSectionId[] = ["notepad", "dates", "tasks", "allTasks", "projects"];

const DASHBOARD_SECTION_IDS = new Set<DashboardSectionId>(DASHBOARD_SECTION_ORDER);

type DashboardPreferenceInput = Pick<Partial<DashboardPreference>, "dateWindowDays" | "reviewPromptDismissals" | "showCompleted"> & {
  collapsedSections?: readonly string[];
  sectionOrder?: readonly string[];
};

function validUniqueSections(values: readonly string[] | undefined) {
  const sections: DashboardSectionId[] = [];
  const seen = new Set<DashboardSectionId>();

  for (const value of values ?? []) {
    const section = value as DashboardSectionId;
    if (!DASHBOARD_SECTION_IDS.has(section) || seen.has(section)) continue;
    sections.push(section);
    seen.add(section);
  }

  return sections;
}

export function normalizeDashboardPreference(preference?: DashboardPreferenceInput | null) {
  const storedOrder = validUniqueSections(preference?.sectionOrder);
  const sectionOrder = DASHBOARD_SECTION_ORDER.every((section) => storedOrder.includes(section)) ? storedOrder : [...DASHBOARD_SECTION_ORDER];

  return {
    collapsedSections: validUniqueSections(preference?.collapsedSections),
    dateWindowDays: preference?.dateWindowDays ?? 14,
    reviewPromptDismissals: preference?.reviewPromptDismissals ?? [],
    showCompleted: preference?.showCompleted ?? false,
    sectionOrder
  };
}
