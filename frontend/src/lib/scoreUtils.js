export function calculatePerformance(actual, target) {
  if (!target || target === 0) return 0;
  return Math.round((actual / target) * 100);
}

export function getPerformanceStatus(pct) {
  if (pct >= 90) return "green";
  if (pct >= 60) return "amber";
  return "red";
}

export function getPerformanceLabel(pct) {
  if (pct >= 90) return "On Track";
  if (pct >= 60) return "Needs Attention";
  return "At Risk";
}

export function getBadgeClass(status) {
  return `badge-${status}`;
}

export function calculateWeightedScore(activities) {
  if (!activities.length) return 0;
  return Math.round(
    activities.reduce((sum, a) => sum + a.progress * a.weight, 0)
  );
}

export function countByStatus(items, status) {
  return items.filter((i) => i.status === status).length;
}

export function aggregateMetrics(metrics, groupKey) {
  const groups = {};
  for (const m of metrics) {
    const key = m[groupKey] || "other";
    if (!groups[key]) groups[key] = {};
    if (!groups[key][m.name]) groups[key][m.name] = 0;
    groups[key][m.name] += Number(m.value);
  }
  return groups;
}
