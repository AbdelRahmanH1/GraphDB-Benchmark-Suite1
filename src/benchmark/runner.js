export async function benchmarkOperation(
  database,
  operationFactory,
  options = {},
) {
  const { warmupIterations = 20, iterations = 5 } = options;

  for (let i = 0; i < warmupIterations; i++) {
    const operation = operationFactory(i);

    await database.execute(operation);
  }

  const latencies = [];

  for (let i = 0; i < iterations; i++) {
    const operation = operationFactory(i);

    const start = performance.now();

    await database.execute(operation);

    const elapsed = performance.now() - start;

    latencies.push(elapsed);
  }

  latencies.sort((a, b) => a - b);

  return {
    iterations,
    min: latencies[0],
    max: latencies[latencies.length - 1],
    average:
      latencies.reduce((sum, value) => sum + value, 0) / latencies.length,
    p50: percentile(latencies, 0.5),
    p95: percentile(latencies, 0.95),
  };
}

function percentile(values, percentile) {
  const index = Math.ceil(percentile * values.length) - 1;

  return values[Math.max(0, index)];
}
