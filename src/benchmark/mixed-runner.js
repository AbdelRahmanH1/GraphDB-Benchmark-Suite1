export async function benchmarkMixedWorkload(
  database,
  operationFactory,
  {
    warmupIterations = 20,
    measuredIterations = 100,
    concurrency = 10,
    readPercentage = 80,
    writePercentage = 20,
  } = {},
) {
  if (readPercentage + writePercentage !== 100) {
    throw new Error("readPercentage + writePercentage must equal 100");
  }

  for (let i = 0; i < warmupIterations; i++) {
    const operation = operationFactory(i);

    await database.execute(operation);
  }

  const totalOperations = measuredIterations * concurrency;

  const latencies = [];

  let readCount = 0;
  let writeCount = 0;

  const start = performance.now();

  async function executeOne(index) {
    const random = Math.random() * 100;

    const operation = operationFactory(index);

    const isRead = random < readPercentage;

    if (isRead) {
      readCount++;
    } else {
      writeCount++;
    }

    const operationToExecute = {
      ...operation,
      type: isRead ? "read" : "write",
    };

    const operationStart = performance.now();

    await database.execute(operationToExecute);

    const operationEnd = performance.now();

    latencies.push(operationEnd - operationStart);
  }

  let completed = 0;

  while (completed < totalOperations) {
    const batchSize = Math.min(concurrency, totalOperations - completed);

    const batch = [];

    for (let i = 0; i < batchSize; i++) {
      batch.push(executeOne(completed + i));
    }

    await Promise.all(batch);

    completed += batchSize;
  }

  const elapsedMs = performance.now() - start;

  latencies.sort((a, b) => a - b);

  const min = latencies[0] ?? 0;
  const max = latencies[latencies.length - 1] ?? 0;

  const average =
    latencies.length > 0
      ? latencies.reduce((sum, value) => sum + value, 0) / latencies.length
      : 0;

  const percentile = (percentileValue) => {
    if (latencies.length === 0) {
      return 0;
    }

    const index = Math.ceil((percentileValue / 100) * latencies.length) - 1;

    return latencies[Math.max(0, index)];
  };

  const p50 = percentile(50);
  const p95 = percentile(95);

  const queriesPerSecond =
    elapsedMs > 0 ? totalOperations / (elapsedMs / 1000) : 0;

  return {
    iterations: totalOperations,

    concurrency,

    readPercentage,
    writePercentage,

    readCount,
    writeCount,

    elapsedMs,

    queriesPerSecond,

    min,
    max,
    average,
    p50,
    p95,
  };
}
