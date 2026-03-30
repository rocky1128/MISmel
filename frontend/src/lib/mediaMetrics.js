export const MEDIA_ASSET_SLUGS = new Set(["virtual-university", "hangout"]);

export const MEDIA_PLATFORM_OPTIONS = [
  { value: "facebook", label: "Facebook" },
  { value: "youtube", label: "YouTube" },
  { value: "tiktok", label: "TikTok" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "instagram", label: "Instagram" },
  { value: "x", label: "X" },
  { value: "website", label: "Website" }
];

export const MEDIA_CONTEXT_FIELDS = [
  { key: "video_id", label: "Video ID", required: true },
  { key: "title_description", label: "Title / Description", required: true },
  { key: "pub_date", label: "Pub Date", required: true },
  { key: "snapshot_date", label: "Snapshot Date", required: true },
  { key: "platform", label: "Platform", required: true }
];

export const GENDER_FIELDS = ["male_pct", "female_pct"];
export const AGE_FIELDS = [
  "age_15_17_pct",
  "age_18_24_pct",
  "age_25_30_pct",
  "age_31_35_pct",
  "age_36_plus_pct"
];

export const MEDIA_METRIC_FIELDS = [
  { key: "views", label: "Views", metricName: "views", kind: "number" },
  { key: "unique_reach", label: "Unique Reach", metricName: "unique_reach", kind: "number" },
  { key: "watch_time_min", label: "Watch Time (min)", metricName: "watch_time_min", kind: "number" },
  { key: "completion_rate", label: "Completion Rate (%)", metricName: "completion_rate", kind: "percent" },
  { key: "engagement_rate", label: "Engagement Rate (%)", metricName: "engagement_rate", kind: "percent" },
  { key: "cta_clicks", label: "CTA Clicks", metricName: "cta_clicks", kind: "number" },
  { key: "shares_saves", label: "Shares / Saves", metricName: "shares_saves", kind: "number" },
  { key: "new_followers", label: "New Followers", metricName: "new_followers", kind: "number" },
  { key: "male_pct", label: "Male (%)", metricName: "male_pct", kind: "percent" },
  { key: "female_pct", label: "Female (%)", metricName: "female_pct", kind: "percent" },
  { key: "age_15_17_pct", label: "15-17 (%)", metricName: "age_15_17_pct", kind: "percent" },
  { key: "age_18_24_pct", label: "18-24 (%)", metricName: "age_18_24_pct", kind: "percent" },
  { key: "age_25_30_pct", label: "25-30 (%)", metricName: "age_25_30_pct", kind: "percent" },
  { key: "age_31_35_pct", label: "31-35 (%)", metricName: "age_31_35_pct", kind: "percent" },
  { key: "age_36_plus_pct", label: "36+ (%)", metricName: "age_36_plus_pct", kind: "percent" }
];

export const MEDIA_FIELD_MAP = Object.fromEntries(
  [...MEDIA_CONTEXT_FIELDS, ...MEDIA_METRIC_FIELDS].map((field) => [field.key, field])
);

export function createEmptyMediaEntry() {
  return {
    asset_id: "",
    video_id: "",
    title_description: "",
    pub_date: "",
    snapshot_date: "",
    platform: "",
    views: "",
    unique_reach: "",
    watch_time_min: "",
    completion_rate: "",
    engagement_rate: "",
    cta_clicks: "",
    shares_saves: "",
    new_followers: "",
    male_pct: "",
    female_pct: "",
    age_15_17_pct: "",
    age_18_24_pct: "",
    age_25_30_pct: "",
    age_31_35_pct: "",
    age_36_plus_pct: ""
  };
}

export function buildMediaMetricRows(entry) {
  const source = normalizePlatform(entry.platform);
  const date = entry.snapshot_date || "";
  const contentKey = buildContentKey(entry.video_id, entry.title_description, source, date);
  const metadata = {
    video_id: entry.video_id || contentKey,
    title: entry.title_description || "",
    pub_date: entry.pub_date || null,
    snapshot_date: entry.snapshot_date || null,
    platform: entry.platform || "",
    content_type: "video"
  };

  return MEDIA_METRIC_FIELDS.flatMap((field) => {
    const rawValue = entry[field.key];
    if (rawValue === "" || rawValue === null || rawValue === undefined) {
      return [];
    }

    const parsedValue = field.kind === "percent"
      ? normalizePercent(rawValue)
      : Number(rawValue);

    if (!Number.isFinite(parsedValue)) {
      return [];
    }

    return [{
      name: field.metricName,
      source,
      asset_id: entry.asset_id || null,
      date,
      value: parsedValue,
      content_key: contentKey,
      metadata
    }];
  });
}

export function extractMediaRecords(metrics) {
  const records = new Map();

  for (const metric of metrics) {
    const metadata = metric.metadata || {};
    const contentKey = metric.contentKey || metadata.video_id || buildContentKey("", metadata.title, metric.source, metric.date);
    const recordKey = `${contentKey}:${metric.date}:${metric.source}`;

    if (!records.has(recordKey)) {
      records.set(recordKey, {
        key: recordKey,
        contentKey,
        videoId: metric.contentKey || metadata.video_id || "",
        date: metric.date,
        title: metadata.title || "",
        pubDate: metadata.pub_date || "",
        snapshotDate: metadata.snapshot_date || metric.date || "",
        platform: metadata.platform || metric.source || "",
        assetId: metric.assetId,
        values: {}
      });
    }

    const record = records.get(recordKey);
    record.values[metric.name] = Number(metric.value || 0);
  }

  return [...records.values()].sort((left, right) => {
    if (left.date === right.date) {
      return (left.videoId || left.title).localeCompare(right.videoId || right.title);
    }
    return new Date(right.date) - new Date(left.date);
  });
}

export function summarizeMediaRecords(records) {
  const latestRecords = buildLatestMediaRecords(records);
  const trackedVideoKeys = new Set(
    records.map((record) => record.contentKey || record.videoId || `${record.platform}-${record.date}-${record.title}`)
  );

  return {
    trackedVideos: trackedVideoKeys.size,
    submissions: records.length,
    totals: {
      views: sumRecordMetric(latestRecords, ["views"]),
      uniqueReach: sumRecordMetric(latestRecords, ["unique_reach"]),
      watchTime: sumRecordMetric(latestRecords, ["watch_time_min"]),
      ctaClicks: sumRecordMetric(latestRecords, ["cta_clicks"]),
      shares: sumRecordMetric(latestRecords, ["shares_saves", "shares"]),
      newFollowers: sumRecordMetric(latestRecords, ["new_followers"])
    },
    averages: {
      completionRate: averageRecordMetric(latestRecords, ["completion_rate"]),
      engagementRate: averageRecordMetric(latestRecords, ["engagement_rate"]),
      malePct: averageRecordMetric(latestRecords, ["male_pct"]),
      femalePct: averageRecordMetric(latestRecords, ["female_pct"]),
      age15to17: averageRecordMetric(latestRecords, ["age_15_17_pct"]),
      age18to24: averageRecordMetric(latestRecords, ["age_18_24_pct"]),
      age25to30: averageRecordMetric(latestRecords, ["age_25_30_pct"]),
      age31to35: averageRecordMetric(latestRecords, ["age_31_35_pct"]),
      age36Plus: averageRecordMetric(latestRecords, ["age_36_plus_pct"])
    }
  };
}

export function buildLatestMediaRecords(records) {
  const latest = new Map();

  for (const record of records) {
    const key = `${record.contentKey}:${normalizePlatform(record.platform || record.values.platform || "manual")}`;
    const current = latest.get(key);
    if (!current || new Date(record.date) > new Date(current.date)) {
      latest.set(key, record);
    }
  }

  return [...latest.values()].sort((left, right) => new Date(right.date) - new Date(left.date));
}

export function buildMediaPlatformRows(records) {
  const rows = new Map();

  for (const record of records) {
    const key = normalizePlatform(record.platform || "manual");
    const current = rows.get(key) || {
      source: key,
      videos: 0,
      views: 0,
      reach: 0,
      watchTime: 0,
      shares: 0,
      ctaClicks: 0,
      followers: 0,
      engagementTotal: 0,
      engagementCount: 0,
      completionTotal: 0,
      completionCount: 0
    };

    current.videos += 1;
    current.views += Number(record.values.views || 0);
    current.reach += Number(record.values.unique_reach || 0);
    current.watchTime += Number(record.values.watch_time_min || 0);
    current.shares += Number(record.values.shares_saves || record.values.shares || 0);
    current.ctaClicks += Number(record.values.cta_clicks || 0);
    current.followers += Number(record.values.new_followers || 0);

    if (Number.isFinite(record.values.engagement_rate)) {
      current.engagementTotal += Number(record.values.engagement_rate || 0);
      current.engagementCount += 1;
    }

    if (Number.isFinite(record.values.completion_rate)) {
      current.completionTotal += Number(record.values.completion_rate || 0);
      current.completionCount += 1;
    }

    rows.set(key, current);
  }

  return [...rows.values()].map((row) => ({
    source: row.source,
    videos: row.videos,
    views: row.views,
    reach: row.reach,
    watchTime: row.watchTime,
    shares: row.shares,
    ctaClicks: row.ctaClicks,
    followers: row.followers,
    engagement: row.engagementCount ? row.engagementTotal / row.engagementCount : 0,
    completion: row.completionCount ? row.completionTotal / row.completionCount : 0
  }));
}

export function validateMediaEntry(entry) {
  const errors = [];

  for (const field of MEDIA_CONTEXT_FIELDS) {
    if (field.required && !entry[field.key]) {
      errors.push(`${field.label} is required.`);
    }
  }

  for (const field of MEDIA_METRIC_FIELDS.filter((item) => item.kind === "percent")) {
    const rawValue = entry[field.key];
    if (rawValue === "" || rawValue === null || rawValue === undefined) {
      continue;
    }

    const numeric = Number(rawValue);
    if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100) {
      errors.push(`${field.label} must be between 0 and 100.`);
    }
  }

  errors.push(...validatePercentageGroup(entry, GENDER_FIELDS, "Gender"));
  errors.push(...validatePercentageGroup(entry, AGE_FIELDS, "Age brackets"));

  return errors;
}

export function getPercentageGroupTotal(entry, keys) {
  return keys.reduce((sum, key) => {
    const value = entry[key];
    return sum + (value === "" || value === null || value === undefined ? 0 : Number(value || 0));
  }, 0);
}

function normalizePlatform(value) {
  return (value || "manual").toString().trim().toLowerCase().replace(/\s+/g, "_");
}

function normalizePercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return NaN;
  }
  return numeric > 1 ? numeric / 100 : numeric;
}

function buildContentKey(videoId, title, platform, date) {
  if (videoId) {
    return String(videoId).trim();
  }

  return [title, platform, date]
    .filter(Boolean)
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sumRecordMetric(records, keys) {
  return records.reduce((sum, record) => {
    const value = keys.reduce((resolved, key) => resolved ?? record.values[key], null);
    return sum + Number(value || 0);
  }, 0);
}

function averageRecordMetric(records, keys) {
  const values = records
    .map((record) => keys.reduce((resolved, key) => resolved ?? record.values[key], null))
    .filter((value) => Number.isFinite(value));

  if (!values.length) {
    return null;
  }

  return values.reduce((sum, value) => sum + Number(value), 0) / values.length;
}

function validatePercentageGroup(entry, keys, label) {
  const rawValues = keys.map((key) => entry[key]);
  const filledValues = rawValues.filter((value) => value !== "" && value !== null && value !== undefined);

  if (!filledValues.length) {
    return [];
  }

  if (filledValues.length !== keys.length) {
    return [`${label} fields must all be filled when you provide that breakdown.`];
  }

  const total = getPercentageGroupTotal(entry, keys);
  if (Math.abs(total - 100) > 0.01) {
    return [`${label} percentages must add up to 100%.`];
  }

  return [];
}
