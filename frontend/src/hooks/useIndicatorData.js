import { useMemo } from "react";
import useMELData from "./useMELData";
import { buildIndicatorGroups } from "../lib/melAnalytics";

export default function useIndicatorData() {
  const mel = useMELData();

  const groups = useMemo(() => buildIndicatorGroups(mel.indicators), [mel.indicators]);

  return {
    ...mel,
    indicatorGroups: groups.grouped,
    topIndicators: groups.top,
    worstIndicators: groups.worst
  };
}
