import { calculatePerformance } from "./scoreUtils";

export const STRATEGIC_PILLARS = [
  "Youth Empowerment",
  "Media Reach",
  "Institutional Strength",
  "Partnerships"
];

const BENEFICIARY_METRICS = ["beneficiaries", "unique_reach", "participants", "enrolments", "enrollments", "new_followers"];
const ENGAGEMENT_RATE_METRICS = ["engagement_rate", "completion_rate"];
const SUSTAINABILITY_METRICS = ["revenue", "cta_clicks", "new_followers"];

export function slugify(value) {
  return (value || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function derivePillar(fields = {}) {
  const combined = [
    fields.code,
    fields.name,
    fields.title,
    fields.description,
    fields.assetName,
    fields.department,
    fields.kpiCategory,
    fields.indicatorType
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/(media|reach|view|watch|engagement|facebook|youtube|tiktok|linkedin|hangout|springboard tv|virtual university)/.test(combined)) {
    return "Media Reach";
  }

  if (/(partner|partnership|collaboration|sponsor|all departments)/.test(combined)) {
    return "Partnerships";
  }

  if (/(institution|dashboard|framework|data|quality|system|capacity|ict|mel|evidence|process|learning|admin)/.test(combined)) {
    return "Institutional Strength";
  }

  return "Youth Empowerment";
}

export function getPerformanceScore(actual, target) {
  const score = calculatePerformance(actual, target);
  if (Number.isNaN(score)) return 0;
  return clamp(score, 0, 100);
}

export function getStatusTone(value, warning = 60, good = 80) {
  if (value >= good) return "good";
  if (value >= warning) return "warning";
  return "critical";
}

export function mapToneToBadge(tone) {
  if (tone === "good") return "badge-green";
  if (tone === "warning") return "badge-amber";
  return "badge-red";
}

export function buildTimeSeries(metrics, names = []) {
  const filtered = metrics.filter((metric) => (names.length ? names.includes(metric.name) : true));
  const buckets = new Map();

  for (const metric of filtered) {
    const key = metric.date;
    if (!buckets.has(key)) {
      buckets.set(key, { date: key });
    }

    const bucket = buckets.get(key);
    bucket[metric.name] = (bucket[metric.name] || 0) + Number(metric.value || 0);
  }

  return [...buckets.values()].sort((left, right) => new Date(left.date) - new Date(right.date));
}

export function getPercentDelta(current, previous) {
  if (!previous) return 0;
  return Math.round(((current - previous) / previous) * 100);
}

export function getSeriesTrend(series, key) {
  if (!series.length) return 0;
  const latest = series[series.length - 1]?.[key] || 0;
  const previous = series[series.length - 2]?.[key] || 0;
  return getPercentDelta(latest, previous);
}

export function summarizeMetrics(metrics, names) {
  return metrics
    .filter((metric) => names.includes(metric.name))
    .reduce((sum, metric) => sum + Number(metric.value || 0), 0);
}

export function averageMetric(metrics, names) {
  const values = metrics.filter((metric) => names.includes(metric.name)).map((metric) => Number(metric.value || 0));
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function buildPillarPerformance(indicators, activities) {
  return STRATEGIC_PILLARS.map((pillar) => {
    const pillarIndicators = indicators.filter((indicator) => indicator.pillar === pillar);
    const pillarActivities = activities.filter((activity) => activity.pillar === pillar);
    const indicatorScore = average(pillarIndicators.map((indicator) => indicator.performanceScore));
    const activityScore = average(pillarActivities.map((activity) => activity.progress || 0));
    const score = Math.round(weightAverage([
      { value: indicatorScore, weight: pillarIndicators.length ? 0.65 : 0 },
      { value: activityScore, weight: pillarActivities.length ? 0.35 : 0 }
    ]));
    const momentum = Math.round((indicatorScore - activityScore) / 5);

    return {
      pillar,
      score,
      tone: getStatusTone(score),
      trend: momentum,
      indicatorCount: pillarIndicators.length,
      activityCount: pillarActivities.length
    };
  });
}

export function buildExecutiveKPIs({ metrics, indicators, activities, evidence, pillars }) {
  const metricsSeries = buildTimeSeries(metrics, ["unique_reach", "new_followers", "engagement_rate", "completion_rate", "cta_clicks", "revenue"]);
  const strategicProgress = Math.round(average(pillars.map((pillar) => pillar.score)));
  const beneficiaries = Math.round(summarizeMetrics(metrics, BENEFICIARY_METRICS));
  const engagementScore = Math.round(averageMetric(metrics, ENGAGEMENT_RATE_METRICS) * 100 || average(indicators.map((indicator) => indicator.performanceScore)) * 0.45);
  const sustainabilityScore = Math.round(
    clamp(
      average([
        normalizeScore(summarizeMetrics(metrics, SUSTAINABILITY_METRICS), 500),
        normalizeScore(evidence.filter((item) => item.verificationStatus === "Verified").length, Math.max(evidence.length, 1)),
        normalizeScore(activities.filter((activity) => activity.status === "completed").length, Math.max(activities.length, 1))
      ]),
      0,
      100
    )
  );

  return [
    {
      label: "Strategic Progress",
      value: `${strategicProgress}%`,
      trend: Math.round(average(pillars.map((pillar) => pillar.trend))),
      tone: getStatusTone(strategicProgress),
      caption: "Cross-pillar delivery score"
    },
    {
      label: "Total Beneficiaries",
      value: compactNumber(beneficiaries),
      trend: getSeriesTrend(metricsSeries, "unique_reach"),
      tone: getStatusTone(normalizeScore(beneficiaries, 10000)),
      caption: "Reach and followership proxy"
    },
    {
      label: "Engagement Score",
      value: `${engagementScore}%`,
      trend: getSeriesTrend(metricsSeries, "engagement_rate"),
      tone: getStatusTone(engagementScore),
      caption: "Average engagement quality"
    },
    {
      label: "Sustainability Index",
      value: `${sustainabilityScore}%`,
      trend: getSeriesTrend(metricsSeries, "cta_clicks"),
      tone: getStatusTone(sustainabilityScore),
      caption: "Revenue and sustainability proxy"
    }
  ];
}

export function buildExecutiveAlerts({ assets, indicators, evidence }) {
  const assetSignals = assets
    .map((asset) => {
      const assetIndicators = indicators.filter((indicator) => indicator.assetId === asset.id);
      return {
        name: asset.name,
        score: Math.round(average(assetIndicators.map((indicator) => indicator.performanceScore))),
        indicatorCount: assetIndicators.length
      };
    })
    .filter((asset) => asset.indicatorCount);

  const underperformingAssets = assetSignals
    .filter((asset) => asset.score < 60)
    .sort((left, right) => left.score - right.score)
    .slice(0, 3)
    .map((asset) => ({
      title: `${asset.name} is underperforming`,
      detail: `Average indicator performance is ${asset.score}%.`
    }));

  const decliningIndicators = [...indicators]
    .sort((left, right) => left.performanceScore - right.performanceScore)
    .slice(0, 3)
    .map((indicator) => ({
      title: indicator.name,
      detail: `Performance is ${indicator.performanceScore}% against target.`
    }));

  const dataGaps = indicators
    .filter((indicator) => indicator.actual === null || indicator.actual === undefined)
    .slice(0, 3)
    .map((indicator) => ({
      title: `${indicator.name} has a data gap`,
      detail: `No current actual value has been submitted for ${indicator.code}.`
    }));

  if (!dataGaps.length && evidence.filter((item) => item.verificationStatus === "Pending").length) {
    dataGaps.push({
      title: "Evidence verification backlog",
      detail: `${evidence.filter((item) => item.verificationStatus === "Pending").length} evidence items are still pending review.`
    });
  }

  return { underperformingAssets, decliningIndicators, dataGaps };
}

export function buildExecutiveInsights({ metrics, indicators, alerts }) {
  const engagementSeries = buildTimeSeries(metrics, ["engagement_rate"]);
  const followerSeries = buildTimeSeries(metrics, ["new_followers"]);
  const engagementTrend = getSeriesTrend(engagementSeries, "engagement_rate");
  const followerTrend = getSeriesTrend(followerSeries, "new_followers");
  const weakestIndicator = [...indicators].sort((left, right) => left.performanceScore - right.performanceScore)[0];

  const insights = [];

  if (engagementTrend < 0) {
    insights.push({
      tone: "warning",
      title: "Engagement is softening",
      text: `Engagement dropped by ${Math.abs(engagementTrend)}% in the latest period, driven by weaker interaction on media assets.`,
      emphasis: "Watch Hangout and Springboard TV activity levels."
    });
  } else {
    insights.push({
      tone: "good",
      title: "Engagement is stable",
      text: `Engagement improved by ${Math.abs(engagementTrend)}% in the latest period.`,
      emphasis: "Keep reinforcing the highest-performing content channels."
    });
  }

  if (followerTrend > 0) {
    insights.push({
      tone: "good",
      title: "Audience growth is improving",
      text: `Follower growth increased by ${followerTrend}% compared with the prior period.`,
      emphasis: "This strengthens the sustainability pipeline for institutional assets."
    });
  }

  if (weakestIndicator) {
    insights.push({
      tone: weakestIndicator.performanceScore < 60 ? "critical" : "warning",
      title: "Priority intervention area",
      text: `${weakestIndicator.name} is currently the weakest indicator at ${weakestIndicator.performanceScore}% of target.`,
      emphasis: "Investigate reporting quality and delivery constraints in this area."
    });
  }

  if (alerts.dataGaps.length) {
    insights.push({
      tone: "warning",
      title: "Data completeness needs attention",
      text: `${alerts.dataGaps.length} priority reporting items still have missing or unverified data.`,
      emphasis: "Focus the MEL operations team on verification and submission follow-up."
    });
  }

  return insights.slice(0, 4);
}

export function buildIndicatorGroups(indicators) {
  const grouped = STRATEGIC_PILLARS.map((pillar) => ({
    pillar,
    indicators: indicators
      .filter((indicator) => indicator.pillar === pillar)
      .sort((left, right) => right.performanceScore - left.performanceScore)
  }));

  return {
    grouped,
    top: [...indicators].sort((left, right) => right.performanceScore - left.performanceScore).slice(0, 5),
    worst: [...indicators].sort((left, right) => left.performanceScore - right.performanceScore).slice(0, 5)
  };
}

export function buildAssetInsights(asset, metrics, indicators) {
  const engagementAverage = averageMetric(metrics, ["engagement_rate"]) * 100;
  const reach = summarizeMetrics(metrics, ["unique_reach"]);
  const followers = summarizeMetrics(metrics, ["new_followers"]);
  const indicatorAverage = average(indicators.map((indicator) => indicator.performanceScore));

  return [
    {
      tone: getStatusTone(indicatorAverage),
      title: `${asset.name} performance snapshot`,
      text: `${asset.name} is averaging ${Math.round(indicatorAverage)}% across linked indicators.`,
      emphasis: `${compactNumber(reach)} reach and ${compactNumber(followers)} new followers are recorded in the current data set.`
    },
    {
      tone: getStatusTone(engagementAverage),
      title: "Engagement quality",
      text: `Average engagement quality is ${Math.round(engagementAverage)}%.`,
      emphasis: "Use the Engagement tab to isolate the strongest and weakest channels."
    }
  ];
}

export function compactNumber(value) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);
}

function normalizeScore(value, baseline) {
  if (!baseline) return 0;
  return clamp((value / baseline) * 100, 0, 100);
}

function weightAverage(entries) {
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  if (!totalWeight) return 0;
  return entries.reduce((sum, entry) => sum + entry.value * entry.weight, 0) / totalWeight;
}

function average(values) {
  const filtered = values.filter((value) => Number.isFinite(value));
  if (!filtered.length) return 0;
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
