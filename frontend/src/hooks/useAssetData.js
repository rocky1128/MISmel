import { useMemo } from "react";
import useMELData from "./useMELData";
import { buildAssetInsights, buildWeeklyTimeSeries, compactNumber, getSeriesTrend, slugify } from "../lib/melAnalytics";
import { buildLatestMediaRecords, buildMediaPlatformRows, extractMediaRecords, summarizeMediaRecords } from "../lib/mediaMetrics";

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

  const mediaRecords = useMemo(
    () => extractMediaRecords(assetMetrics),
    [assetMetrics]
  );

  const mediaSummary = useMemo(
    () => summarizeMediaRecords(mediaRecords),
    [mediaRecords]
  );

  const latestMediaRecords = useMemo(
    () => buildLatestMediaRecords(mediaRecords),
    [mediaRecords]
  );

  const platformRows = useMemo(() => {
    return buildMediaPlatformRows(latestMediaRecords);
  }, [latestMediaRecords]);

  const trendSeries = useMemo(
    () => buildWeeklyTimeSeries(assetMetrics, ["views", "unique_reach", "new_followers", "engagement_rate", "watch_time_min", "cta_clicks"]),
    [assetMetrics]
  );

  const kpis = useMemo(
    () => [
      {
        label: "Videos Tracked",
        value: compactNumber(mediaSummary.trackedVideos),
        trend: mediaRecords.length ? mediaRecords.length : 0
      },
      {
        label: "Views",
        value: compactNumber(mediaSummary.totals.views),
        trend: getSeriesTrend(trendSeries, "views")
      },
      {
        label: "Reach",
        value: compactNumber(mediaSummary.totals.uniqueReach),
        trend: getSeriesTrend(trendSeries, "unique_reach")
      },
      {
        label: "Watch Time",
        value: compactNumber(mediaSummary.totals.watchTime),
        trend: getSeriesTrend(trendSeries, "watch_time_min")
      },
      {
        label: "New Followers",
        value: compactNumber(mediaSummary.totals.newFollowers),
        trend: getSeriesTrend(trendSeries, "new_followers")
      }
    ],
    [mediaRecords.length, mediaSummary, trendSeries]
  );

  const insights = useMemo(
    () => (asset ? buildAssetInsights(asset, assetMetrics, assetIndicators, mediaSummary) : []),
    [asset, assetIndicators, assetMetrics, mediaSummary]
  );

  return {
    ...mel,
    asset,
    assetMetrics,
    mediaRecords,
    mediaSummary,
    assetIndicators,
    platformRows,
    trendSeries,
    assetKpis: kpis,
    assetInsights: insights,
    resolveAssetSlug: (name) => slugify(name)
  };
}
