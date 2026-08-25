export function percentile(values, percentile) {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);

  const index = (percentile / 100) * (sorted.length - 1);

  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return sorted[lower];
  }

  const weight = index - lower;

  return sorted[lower] + (sorted[upper] - sorted[lower]) * weight;
}

export function calculateStatistics(latencies) {
  return {
    iterations: latencies.length,

    min: Math.min(...latencies),

    max: Math.max(...latencies),

    average:
      latencies.reduce((sum, value) => sum + value, 0) / latencies.length,

    p50: percentile(latencies, 50),

    p95: percentile(latencies, 95),
  };
}
