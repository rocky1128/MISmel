import { useMemo } from "react";
import useMELData from "./useMELData";
import { buildExecutiveAlerts, buildExecutiveInsights, buildExecutiveKPIs, buildIndicatorGroups, buildPillarPerformance } from "../lib/melAnalytics";

export default function useDashboardData() {
  const mel = useMELData();

  const pillars = useMemo(
    () => buildPillarPerformance(mel.indicators, mel.activities),
    [mel.activities, mel.indicators]
  );

  const kpis = useMemo(
    () => buildExecutiveKPIs({ metrics: mel.metrics, indicators: mel.indicators, activities: mel.activities, evidence: mel.evidence, pillars }),
    [mel.activities, mel.evidence, mel.indicators, mel.metrics, pillars]
  );

  const indicatorBoards = useMemo(
    () => buildIndicatorGroups(mel.indicators),
    [mel.indicators]
  );

  const alerts = useMemo(
    () => buildExecutiveAlerts({ assets: mel.assets, indicators: mel.indicators, evidence: mel.evidence }),
    [mel.assets, mel.evidence, mel.indicators]
  );

  const insights = useMemo(
    () => buildExecutiveInsights({ metrics: mel.metrics, indicators: mel.indicators, alerts }),
    [alerts, mel.indicators, mel.metrics]
  );

  const activityHealth = useMemo(
    () => ({
      total: mel.activities.length,
      completed: mel.activities.filter((activity) => activity.status === "completed").length,
      active: mel.activities.filter((activity) => activity.status === "in_progress").length,
      overdue: mel.activities.filter((activity) => activity.status === "overdue").length
    }),
    [mel.activities]
  );

  return {
    ...mel,
    executiveKpis: kpis,
    pillars,
    alerts,
    insights,
    topIndicators: indicatorBoards.top,
    worstIndicators: indicatorBoards.worst,
    indicatorGroups: indicatorBoards.grouped,
    activityHealth
  };
}
