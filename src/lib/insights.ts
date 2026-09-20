import type { CanonicalWorkspace, Insight } from "./canonical-domain";

export interface InsightProvider {
  getInsights(workspace: CanonicalWorkspace, today: string): Insight[];
}

export const noOpInsightProvider: InsightProvider = {
  getInsights() {
    return [];
  }
};
