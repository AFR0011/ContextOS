import type { DashboardPreference, DashboardSectionId, DashboardTaskSortMode } from "@/lib/types";

export const DASHBOARD_SECTION_ORDER: DashboardSectionId[] = ["tasks", "dates", "projects", "notepad"];
export const DASHBOARD_TASK_SORT_MODES: DashboardTaskSortMode[] = ["recent", "oldest", "schedule", "date"];

const DASHBOARD_SECTION_IDS = new Set<DashboardSectionId>(DASHBOARD_SECTION_ORDER);
const DASHBOARD_TASK_SORT_IDS = new Set<DashboardTaskSortMode>(DASHBOARD_TASK_SORT_MODES);

type DashboardPreferenceInput = Pick<Partial<DashboardPreference>, "dateWindowDays" | "reviewPromptDismissals" | "showCompleted" | "taskSortMode"> & {
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

function validTaskSortMode(value: string | undefined) {
  const mode = value as DashboardTaskSortMode | undefined;
  return mode && DASHBOARD_TASK_SORT_IDS.has(mode) ? mode : "recent";
}

export function normalizeDashboardPreference(preference?: DashboardPreferenceInput | null) {
  return {
    collapsedSections: validUniqueSections(preference?.collapsedSections),
    dateWindowDays: preference?.dateWindowDays ?? 14,
    reviewPromptDismissals: preference?.reviewPromptDismissals ?? [],
    showCompleted: preference?.showCompleted ?? false,
    taskSortMode: validTaskSortMode(preference?.taskSortMode),
    sectionOrder: [...DASHBOARD_SECTION_ORDER]
  };
}
