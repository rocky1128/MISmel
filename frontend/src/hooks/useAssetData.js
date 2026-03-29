import { useMemo } from "react";
import useMELData from "./useMELData";
import { buildAssetInsights, buildTimeSeries, compactNumber, getSeriesTrend, slugify, summarizeMetrics } from "../lib/melAnalytics";

export default function useAssetData(assetSlug) {
  const mel = useMELData();

  const asset = useMemo(
    () => mel.assets.find((entry) => entry.slug === assetSlug) ?? null,
    [assetSlug, mel.assets]
  );

  const assetMetrics = useMemo(
    () => (asset ? mel.metrics.filter((metric) => metric.assetId === asset.id) : []),
    [asset, mel.metrics]
  );

  const assetIndicators = useMemo(
    () => (asset ? mel.indicators.filter((indicator) => indicator.assetId === asset.id) : []),
    [asset, mel.indicators]
  );

  const platformRows = useMemo(() => {
    const platforms = new Map();
    for (const metric of assetMetrics) {
      const key = metric.source || "manual";
      const current = platforms.get(key) || { source: key, views: 0, reach: 0, engagement: 0, followers: 0 };
      if (metric.name === "views") current.views += metric.value;
      if (metric.name === "unique_reach") current.reach += metric.value;
      if (metric.name === "engagement_rate") current.engagement += metric.value;
      if (metric.name === "new_followers") current.followers += metric.value;
      platforms.set(key, current);
    }
    return [...platforms.values()];
  }, [assetMetrics]);

  const trendSeries = useMemo(
    () => buildTimeSeries(assetMetrics, ["views", "unique_reach", "new_followers", "engagement_rate"]),
    [assetMetrics]
  );

  const kpis = useMemo(
    () => [
      {
        label: "Views",
        value: compactNumber(summarizeMetrics(assetMetrics, ["views"])),
        trend: getSeriesTrend(trendSeries, "views")
      },
      {
        label: "Reach",
        value: compactNumber(summarizeMetrics(assetMetrics, ["unique_reach"])),
        trend: getSeriesTrend(trendSeries, "unique_reach")
      },
      {
        label: "Followers",
        value: compactNumber(summarizeMetrics(assetMetrics, ["new_followers"])),
        trend: getSeriesTrend(trendSeries, "new_followers")
      },
      {
        label: "Indicator Score",
        value: `${Math.round(assetIndicators.reduce((sum, indicator) => sum + indicator.performanceScore, 0) / Math.max(assetIndicators.length, 1))}%`,
        trend: Math.round(assetIndicators.filter((indicator) => indicator.performanceScore >= 80).length - assetIndicators.filter((indicator) => indicator.performanceScore < 60).length)
      }
    ],
    [assetIndicators, assetMetrics, trendSeries]
  );

  const insights = useMemo(
    () => (asset ? buildAssetInsights(asset, assetMetrics, assetIndicators) : []),
    [asset, assetIndicators, assetMetrics]
  );

  return {
    ...mel,
    asset,
    assetMetrics,
    assetIndicators,
    platformRows,
    trendSeries,
    assetKpis: kpis,
    assetInsights: insights,
    resolveAssetSlug: (name) => slugify(name)
  };
}
