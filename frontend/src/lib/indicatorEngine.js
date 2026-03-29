/**
 * Indicator Engine — Core MEL computation logic.
 *
 * RAW DATA → INDICATOR ENGINE → AGGREGATED RESULTS → DASHBOARD
 *
 * All indicator calculations happen here, NEVER in React components.
 * The engine pulls from structured data sources, applies governed formulas,
 * computes performance, and produces indicator_results + asset_scores.
 */

// ===== MEL DOMAINS =====
export const MEL_DOMAINS = [
  { key: "reach_and_scale", label: "Reach & Scale", color: "#8b37a8" },
  { key: "inclusion", label: "Inclusion", color: "#3b82f6" },
  { key: "engagement", label: "Engagement", color: "#f59e0b" },
  { key: "learning", label: "Learning", color: "#10b981" },
  { key: "outcomes", label: "Outcomes", color: "#ef4444" }
];

export const DOMAIN_MAP = Object.fromEntries(MEL_DOMAINS.map((d) => [d.key, d]));

// ===== DATA SOURCE FIELD REGISTRY =====
// Maps data_source → available fields for numerator/denominator selection
export const DATA_SOURCE_FIELDS = {
  episodes: [
    "views", "unique_reach", "likes", "comments", "shares", "clicks",
    "watch_time_minutes", "engagement_rate", "completion_rate", "new_followers",
    "_count"
  ],
  participants: [
    "gender", "age", "region", "district", "is_pwd", "is_rural",
    "education_level", "_count", "_count_female", "_count_male",
    "_count_pwd", "_count_rural"
  ],
  survey_responses: [
    "confidence_score", "job_readiness_score", "leadership_score",
    "skills_application_score", "knowledge_score", "satisfaction_score",
    "_count", "_avg_confidence", "_avg_job_readiness", "_avg_leadership",
    "_avg_skills_application"
  ],
  follow_up_data: [
    "is_employed", "business_created", "outcome",
    "_count", "_count_employed", "_count_business_created",
    "_count_further_education"
  ]
};

// ===== CORE CALCULATION FUNCTIONS =====

/**
 * Compute a single indicator's value from raw data.
 */
export function computeIndicatorValue(indicator, dataSources) {
  const source = dataSources[indicator.data_source];
  if (!source || !source.length) {
    return { value: null, numerator: null, denominator: null, dataPoints: 0, coverage: 0 };
  }

  // Apply filters
  let filtered = applyFilters(source, indicator.filters, indicator.asset_id);
  const dataPoints = filtered.length;

  if (!dataPoints) {
    return { value: null, numerator: null, denominator: null, dataPoints: 0, coverage: 0 };
  }

  const numFields = indicator.numerator_fields || [];
  const denFields = indicator.denominator_fields || [];

  let numerator = 0;
  let denominator = 0;
  let value = null;

  switch (indicator.calculation) {
    case "sum":
      numerator = sumFields(filtered, numFields);
      value = numerator;
      break;

    case "average":
      numerator = sumFields(filtered, numFields);
      denominator = countValidEntries(filtered, numFields);
      value = denominator > 0 ? numerator / denominator : null;
      break;

    case "count":
      value = countFields(filtered, numFields);
      numerator = value;
      break;

    case "ratio":
      numerator = resolveFieldValue(filtered, numFields);
      denominator = resolveFieldValue(filtered, denFields);
      value = denominator > 0 ? (numerator / denominator) * 100 : null;
      break;

    default:
      value = null;
  }

  // Round to 2 decimal places
  if (value !== null) {
    value = Math.round(value * 100) / 100;
  }

  const totalPossible = estimateTotalDataPoints(indicator, dataSources);
  const coverage = totalPossible > 0 ? Math.min((dataPoints / totalPossible) * 100, 100) : 0;

  return {
    value,
    numerator: numerator !== null ? Math.round(numerator * 100) / 100 : null,
    denominator: denominator !== null ? Math.round(denominator * 100) / 100 : null,
    dataPoints,
    coverage: Math.round(coverage)
  };
}

/**
 * Compute performance = (actual / target) * 100
 */
export function computePerformance(actual, target) {
  if (actual === null || actual === undefined || !target) return null;
  return Math.round((actual / target) * 100 * 100) / 100;
}

/**
 * Determine status from performance percentage.
 */
export function getResultStatus(performance) {
  if (performance === null || performance === undefined) return "critical";
  if (performance >= 100) return "good";
  if (performance >= 70) return "warning";
  return "critical";
}

/**
 * Run the full indicator engine on all active governed indicators.
 * Returns computed results ready to be stored/displayed.
 */
export function runIndicatorEngine(governedIndicators, dataSources, period) {
  const activeIndicators = governedIndicators.filter(
    (i) => i.status === "active" || i.status === "approved"
  );

  return activeIndicators.map((indicator) => {
    const computed = computeIndicatorValue(indicator, dataSources);
    const performance = computePerformance(computed.value, indicator.target);
    const status = getResultStatus(performance);

    return {
      indicator_id: indicator.id,
      indicator_name: indicator.name,
      indicator_code: indicator.code,
      version_id: indicator.version,
      domain: indicator.domain,
      asset_id: indicator.asset_id,
      period,
      value: computed.value,
      numerator: computed.numerator,
      denominator: computed.denominator,
      target: indicator.target,
      performance,
      status,
      data_points_used: computed.dataPoints,
      data_coverage: computed.coverage,
      weight: indicator.weight || 1
    };
  });
}

/**
 * Compute asset scores from indicator results.
 */
export function computeAssetScores(results, assets) {
  const assetMap = new Map();

  for (const result of results) {
    if (!result.asset_id) continue;
    if (!assetMap.has(result.asset_id)) {
      assetMap.set(result.asset_id, []);
    }
    assetMap.get(result.asset_id).push(result);
  }

  return assets.map((asset) => {
    const assetResults = assetMap.get(asset.id) || [];
    const byDomain = {};

    for (const domain of MEL_DOMAINS) {
      const domainResults = assetResults.filter((r) => r.domain === domain.key);
      const scores = domainResults
        .filter((r) => r.performance !== null)
        .map((r) => ({ performance: r.performance, weight: r.weight || 1 }));

      if (scores.length) {
        const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
        byDomain[domain.key] = Math.round(
          scores.reduce((sum, s) => sum + s.performance * s.weight, 0) / totalWeight
        );
      } else {
        byDomain[domain.key] = null;
      }
    }

    const validDomains = Object.values(byDomain).filter((v) => v !== null);
    const overall = validDomains.length
      ? Math.round(validDomains.reduce((a, b) => a + b, 0) / validDomains.length)
      : 0;

    const coverages = assetResults.filter((r) => r.data_coverage != null).map((r) => r.data_coverage);
    const avgCoverage = coverages.length
      ? Math.round(coverages.reduce((a, b) => a + b, 0) / coverages.length)
      : 0;

    return {
      asset_id: asset.id,
      asset_name: asset.name,
      reach_score: byDomain.reach_and_scale,
      inclusion_score: byDomain.inclusion,
      engagement_score: byDomain.engagement,
      learning_score: byDomain.learning,
      outcomes_score: byDomain.outcomes,
      overall_score: overall,
      indicator_count: assetResults.length,
      data_coverage: avgCoverage
    };
  });
}

/**
 * Build the 4 executive signal blocks from indicator results.
 */
export function buildSignalBlocks(results, dataSources) {
  const byDomain = {};
  for (const domain of MEL_DOMAINS) {
    byDomain[domain.key] = results.filter((r) => r.domain === domain.key);
  }

  // 1. Scale Signal
  const scaleResults = byDomain.reach_and_scale || [];
  const totalReach = scaleResults
    .filter((r) => r.value !== null)
    .reduce((sum, r) => sum + (r.value || 0), 0);
  const scalePerformance = weightedAvgPerformance(scaleResults);

  // 2. Engagement Signal
  const engagementResults = byDomain.engagement || [];
  const engagementPerformance = weightedAvgPerformance(engagementResults);

  // 3. Learning Signal
  const learningResults = byDomain.learning || [];
  const learningPerformance = weightedAvgPerformance(learningResults);

  // Compute pre/post confidence change from surveys
  const surveys = dataSources.survey_responses || [];
  const preSurveys = surveys.filter((s) => s.survey_type === "pre");
  const postSurveys = surveys.filter((s) => s.survey_type === "post");
  const avgPreConfidence = safeAverage(preSurveys.map((s) => s.confidence_score));
  const avgPostConfidence = safeAverage(postSurveys.map((s) => s.confidence_score));
  const confidenceChange = avgPreConfidence > 0
    ? Math.round(((avgPostConfidence - avgPreConfidence) / avgPreConfidence) * 100)
    : null;

  const avgPreReadiness = safeAverage(preSurveys.map((s) => s.job_readiness_score));
  const avgPostReadiness = safeAverage(postSurveys.map((s) => s.job_readiness_score));
  const readinessChange = avgPreReadiness > 0
    ? Math.round(((avgPostReadiness - avgPreReadiness) / avgPreReadiness) * 100)
    : null;

  // 4. Outcomes Signal
  const outcomesResults = byDomain.outcomes || [];
  const outcomesPerformance = weightedAvgPerformance(outcomesResults);

  const followUps = dataSources.follow_up_data || [];
  const employmentRate = followUps.length
    ? Math.round((followUps.filter((f) => f.is_employed).length / followUps.length) * 100)
    : null;
  const businessRate = followUps.length
    ? Math.round((followUps.filter((f) => f.business_created).length / followUps.length) * 100)
    : null;

  // Data confidence
  const totalIndicators = results.length;
  const withData = results.filter((r) => r.value !== null).length;
  const dataConfidence = totalIndicators > 0
    ? Math.round((withData / totalIndicators) * 100)
    : 0;

  // Survey coverage
  const surveyCoverage = surveys.length > 0 ? Math.min(surveys.length, 100) : 0;
  const outcomeCoverage = followUps.length > 0 ? Math.min(followUps.length, 100) : 0;

  return {
    scale: {
      label: "Scale",
      totalReach: formatCompact(totalReach),
      totalReachRaw: totalReach,
      performance: scalePerformance,
      status: getResultStatus(scalePerformance),
      trend: computeTrend(scaleResults),
      indicatorCount: scaleResults.length,
      subMetrics: [
        { label: "Total Reach", value: formatCompact(totalReach) },
        { label: "Growth Trend", value: `${computeTrend(scaleResults) >= 0 ? "+" : ""}${computeTrend(scaleResults)}%` }
      ]
    },
    engagement: {
      label: "Engagement",
      performance: engagementPerformance,
      status: getResultStatus(engagementPerformance),
      trend: computeTrend(engagementResults),
      indicatorCount: engagementResults.length,
      subMetrics: [
        { label: "Engagement Rate", value: `${engagementPerformance || 0}%` },
        { label: "Participation", value: formatCompact(sumResultValues(engagementResults)) }
      ]
    },
    learning: {
      label: "Learning",
      performance: learningPerformance,
      status: getResultStatus(learningPerformance),
      trend: confidenceChange,
      indicatorCount: learningResults.length,
      subMetrics: [
        { label: "Confidence Improvement", value: confidenceChange !== null ? `${confidenceChange >= 0 ? "+" : ""}${confidenceChange}%` : "No data" },
        { label: "Job Readiness Change", value: readinessChange !== null ? `${readinessChange >= 0 ? "+" : ""}${readinessChange}%` : "No data" }
      ]
    },
    outcomes: {
      label: "Outcomes",
      performance: outcomesPerformance,
      status: getResultStatus(outcomesPerformance),
      trend: computeTrend(outcomesResults),
      indicatorCount: outcomesResults.length,
      subMetrics: [
        { label: "Employment Rate", value: employmentRate !== null ? `${employmentRate}%` : "No data" },
        { label: "Business Creation", value: businessRate !== null ? `${businessRate}%` : "No data" }
      ]
    },
    dataConfidence: {
      overall: dataConfidence,
      indicators: `${withData}/${totalIndicators}`,
      surveys: surveyCoverage,
      outcomes: outcomeCoverage,
      status: dataConfidence >= 80 ? "good" : dataConfidence >= 50 ? "warning" : "critical"
    }
  };
}

/**
 * Build domain summary for executive view.
 */
export function buildDomainSummary(results) {
  return MEL_DOMAINS.map((domain) => {
    const domainResults = results.filter((r) => r.domain === domain.key);
    const performance = weightedAvgPerformance(domainResults);
    const withData = domainResults.filter((r) => r.value !== null).length;

    return {
      key: domain.key,
      label: domain.label,
      color: domain.color,
      performance: performance || 0,
      status: getResultStatus(performance),
      indicatorCount: domainResults.length,
      dataCompleteness: domainResults.length > 0
        ? Math.round((withData / domainResults.length) * 100)
        : 0,
      trend: computeTrend(domainResults)
    };
  });
}

// ===== HELPER FUNCTIONS =====

function applyFilters(data, filters, assetId) {
  let filtered = [...data];

  // Always filter by asset if specified
  if (assetId) {
    filtered = filtered.filter((row) => row.asset_id === assetId);
  }

  if (!filters || typeof filters !== "object") return filtered;

  for (const [key, value] of Object.entries(filters)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) {
      filtered = filtered.filter((row) => value.includes(row[key]));
    } else {
      filtered = filtered.filter((row) => row[key] === value);
    }
  }

  return filtered;
}

function sumFields(data, fields) {
  if (!fields.length) return 0;
  let total = 0;
  for (const row of data) {
    for (const field of fields) {
      const resolved = resolveSpecialField(row, field);
      if (resolved !== null && !isNaN(resolved)) {
        total += Number(resolved);
      }
    }
  }
  return total;
}

function countFields(data, fields) {
  if (!fields.length) return data.length;
  const field = fields[0];
  if (field === "_count") return data.length;
  return data.filter((row) => {
    const val = resolveSpecialField(row, field);
    return val !== null && val !== undefined && val !== false && val !== 0;
  }).length;
}

function countValidEntries(data, fields) {
  if (!fields.length) return data.length;
  return data.filter((row) =>
    fields.some((f) => {
      const val = resolveSpecialField(row, f);
      return val !== null && val !== undefined && !isNaN(val);
    })
  ).length;
}

function resolveFieldValue(data, fields) {
  if (!fields || !fields.length) return data.length;
  const field = fields[0];
  if (field === "_count") return data.length;
  if (field.startsWith("_count_")) return countSpecialField(data, field);
  return sumFields(data, fields);
}

function resolveSpecialField(row, field) {
  if (field === "_count") return 1;
  if (field === "_count_female") return row.gender === "female" ? 1 : 0;
  if (field === "_count_male") return row.gender === "male" ? 1 : 0;
  if (field === "_count_pwd") return row.is_pwd ? 1 : 0;
  if (field === "_count_rural") return row.is_rural ? 1 : 0;
  if (field === "_count_employed") return row.is_employed ? 1 : 0;
  if (field === "_count_business_created") return row.business_created ? 1 : 0;
  if (field === "_count_further_education") return row.outcome === "further_education" ? 1 : 0;
  if (field.startsWith("_avg_")) {
    const realField = field.replace("_avg_", "") + "_score";
    return row[realField] ?? null;
  }
  return row[field] ?? null;
}

function countSpecialField(data, field) {
  return data.reduce((sum, row) => sum + (resolveSpecialField(row, field) || 0), 0);
}

function estimateTotalDataPoints(indicator, dataSources) {
  const allSource = dataSources[indicator.data_source] || [];
  return allSource.length;
}

function weightedAvgPerformance(results) {
  const valid = results.filter((r) => r.performance !== null);
  if (!valid.length) return null;
  const totalWeight = valid.reduce((sum, r) => sum + (r.weight || 1), 0);
  return Math.round(valid.reduce((sum, r) => sum + r.performance * (r.weight || 1), 0) / totalWeight);
}

function sumResultValues(results) {
  return results
    .filter((r) => r.value !== null)
    .reduce((sum, r) => sum + r.value, 0);
}

function computeTrend(results) {
  // Simple trend: compare first half vs second half of results
  if (results.length < 2) return 0;
  const mid = Math.floor(results.length / 2);
  const firstHalf = results.slice(0, mid);
  const secondHalf = results.slice(mid);
  const avgFirst = safeAverage(firstHalf.map((r) => r.performance).filter(Boolean));
  const avgSecond = safeAverage(secondHalf.map((r) => r.performance).filter(Boolean));
  if (!avgFirst) return 0;
  return Math.round(((avgSecond - avgFirst) / avgFirst) * 100);
}

function safeAverage(values) {
  const valid = (values || []).filter((v) => v !== null && v !== undefined && !isNaN(v));
  if (!valid.length) return 0;
  return valid.reduce((a, b) => a + Number(b), 0) / valid.length;
}

function formatCompact(value) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);
}
