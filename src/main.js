import "dotenv/config";

import fs from "node:fs/promises";
import path from "node:path";

import { benchmarkOperation } from "./benchmark/runner.js";
import { createOperationFactory } from "./benchmark/operations.js";
import { createStartNodes } from "./benchmark/start-nodes.js";

import { traversalWorkload } from "./workloads/traversal.js";
import { lookupWorkload } from "./workloads/lookup.js";
import { aggregationWorkload } from "./workloads/aggregation.js";

import { loadDatabase } from "./loaders/loader.js";
import { createDatabases } from "./databases/index.js";

const databases = createDatabases();

const RESULTS_DIR = path.resolve("results");
const RESULTS_FILE = path.join(RESULTS_DIR, "benchmark-results.json");

const LOAD_BATCH_SIZE = 1000;
const MAX_RELATIONSHIPS = 10000;

const START_NODE_COUNT = 100;
const START_NODE_SEED = 12345;

const WARMUP_ITERATIONS = 20;
const MEASURED_ITERATIONS = 100;

const results = [];

async function ensureResultsDirectory() {
  await fs.mkdir(RESULTS_DIR, { recursive: true });
}

async function saveResults() {
  await ensureResultsDirectory();

  await fs.writeFile(RESULTS_FILE, JSON.stringify(results, null, 2), "utf8");

  console.log(`\n✓ Results saved to: ${RESULTS_FILE}`);
}

function addBenchmarkResult(database, workload, operation, result) {
  results.push({
    database: database.name,
    workload: workload.name,
    operation: operation.name,
    iterations: result.iterations,
    minMs: Number(result.min ?? 0),
    maxMs: Number(result.max ?? 0),
    averageMs: Number(result.average ?? 0),
    p50Ms: Number(result.p50 ?? 0),
    p95Ms: Number(result.p95 ?? 0),
  });
}

function addErrorResult(database, workload, operation, error) {
  results.push({
    database: database.name,
    workload: workload?.name ?? null,
    operation: operation?.name ?? null,
    error: error?.message || String(error),
  });
}

async function runWorkload(database, workload, startNodes) {
  console.log(`\n========================================`);
  console.log(`${database.name} - ${workload.name.toUpperCase()} WORKLOAD`);
  console.log(`========================================`);

  for (const operation of workload.operations) {
    console.log(`\nRunning ${operation.name}...`);

    try {
      const operationFactory = createOperationFactory(operation, startNodes);

      const result = await benchmarkOperation(database, operationFactory, {
        warmupIterations: WARMUP_ITERATIONS,
        iterations: MEASURED_ITERATIONS,
      });

      console.log(`✓ ${database.name} - ${workload.name} - ${operation.name}`);

      console.table({
        iterations: result.iterations,
        minMs: Number(result.min ?? 0).toFixed(2),
        maxMs: Number(result.max ?? 0).toFixed(2),
        averageMs: Number(result.average ?? 0).toFixed(2),
        p50Ms: Number(result.p50 ?? 0).toFixed(2),
        p95Ms: Number(result.p95 ?? 0).toFixed(2),
      });

      addBenchmarkResult(database, workload, operation, result);
    } catch (error) {
      console.error(
        `✗ ${database.name} - ${workload.name} - ${operation.name} failed`,
      );

      console.error("ERROR NAME:", error?.name);
      console.error("ERROR MESSAGE:", error?.message);
      console.error("ERROR STACK:", error?.stack);

      addErrorResult(database, workload, operation, error);
    }
  }
}

async function runDatabase(database) {
  console.log("\n========================================");
  console.log(`Database: ${database.name}`);
  console.log("========================================");

  try {
    console.log("Connecting...");

    await database.connect();

    console.log("✓ Connected");

    if (typeof database.clearDatabase === "function") {
      console.log("Clearing database...");

      await database.clearDatabase();

      console.log("✓ Database cleared");
    } else {
      console.log("⚠ clearDatabase() is not implemented; skipping clear step.");
    }

    console.log("\nLoading dataset...");

    const loadStart = performance.now();

    const loadResult = await loadDatabase(
      database,
      LOAD_BATCH_SIZE,
      MAX_RELATIONSHIPS,
    );

    const loadElapsedMs = Number(loadResult.elapsedMs ?? 0);

    const relationshipCount = Number(loadResult.relationshipCount ?? 0);

    const nodeCount = Array.isArray(loadResult.nodeIds)
      ? loadResult.nodeIds.length
      : 0;

    const relationshipsPerSecond =
      loadElapsedMs > 0 ? relationshipCount / (loadElapsedMs / 1000) : 0;

    const nodesPerSecond =
      loadElapsedMs > 0 ? nodeCount / (loadElapsedMs / 1000) : 0;

    const actualLoadElapsedMs = performance.now() - loadStart;

    console.log("✓ Dataset loaded");

    console.table({
      nodes: nodeCount,
      relationships: relationshipCount,
      loadTimeMs: loadElapsedMs.toFixed(2),
      wallClockLoadTimeMs: actualLoadElapsedMs.toFixed(2),
      nodesPerSecond: nodesPerSecond.toFixed(2),
      relationshipsPerSecond: relationshipsPerSecond.toFixed(2),
    });

    results.push({
      database: database.name,
      workload: "data-loading",
      operation: "load",
      nodes: nodeCount,
      relationships: relationshipCount,
      loadTimeMs: loadElapsedMs,
      wallClockLoadTimeMs: actualLoadElapsedMs,
      nodesPerSecond,
      relationshipsPerSecond,
    });

    let stats = null;

    if (typeof database.getStats === "function") {
      console.log("\nGetting database statistics...");

      try {
        stats = await database.getStats();

        console.log("Database stats:");
        console.table(stats);

        results.push({
          database: database.name,
          workload: "footprint",
          operation: "stats",
          nodes: Number(stats?.nodes ?? 0),
          relationships: Number(stats?.relationships ?? 0),
        });
      } catch (error) {
        console.error(`⚠ Could not get stats for ${database.name}`);

        console.error("ERROR:", error?.message);

        results.push({
          database: database.name,
          workload: "footprint",
          operation: "stats",
          error: error?.message || String(error),
        });
      }
    } else {
      console.log(
        "⚠ getStats() is not implemented; footprint stats not observable.",
      );

      results.push({
        database: database.name,
        workload: "footprint",
        operation: "stats",
        error: "not observable",
      });
    }

    const nodeIds = loadResult.nodeIds ?? [];

    if (nodeIds.length === 0) {
      throw new Error("No node IDs were returned from the dataset loader.");
    }

    const startNodes = createStartNodes(
      nodeIds,
      START_NODE_COUNT,
      START_NODE_SEED,
    );

    console.log(`✓ Selected ${startNodes.length} benchmark start nodes`);

    await runWorkload(database, traversalWorkload, startNodes);

    await runWorkload(database, lookupWorkload, startNodes);

    await runWorkload(database, aggregationWorkload, startNodes);
  } catch (error) {
    console.error(`\n✗ ${database.name} failed`);

    console.error("ERROR NAME:", error?.name);
    console.error("ERROR MESSAGE:", error?.message);
    console.error("ERROR STACK:", error?.stack);

    if (error instanceof AggregateError) {
      console.error("\n=== INNER ERRORS ===");

      for (const [index, innerError] of error.errors.entries()) {
        console.error(`\nInner error #${index + 1}:`);
        console.error("name:", innerError?.name);
        console.error("message:", innerError?.message);
        console.error("code:", innerError?.code);
        console.error("address:", innerError?.address);
        console.error("port:", innerError?.port);
        console.error("stack:", innerError?.stack);
      }
    }

    results.push({
      database: database.name,
      workload: "database",
      operation: "database-run",
      error: error?.message || String(error),
    });
  } finally {
    try {
      if (typeof database.close === "function") {
        await database.close();
        console.log(`✓ ${database.name} connection closed`);
      }
    } catch (error) {
      console.error(`Failed to close ${database.name}:`, error);
    }
  }
}

await ensureResultsDirectory();

for (const database of databases) {
  await runDatabase(database);
}

await saveResults();

console.log("\n\n========================================");
console.log("FINAL BENCHMARK RESULTS");
console.log("========================================");

console.table(results);

console.log("\n========================================");
console.log("BENCHMARK SUMMARY");
console.log("========================================");

const successfulResults = results.filter(
  (result) => !result.error && result.workload !== "mixed",
);

console.log(`Successful measurements: ${successfulResults.length}`);

const failedResults = results.filter((result) => result.error);

if (failedResults.length > 0) {
  console.log("\nFailures / caveats:");

  console.table(
    failedResults.map((result) => ({
      database: result.database,
      workload: result.workload,
      operation: result.operation,
      error: result.error,
    })),
  );
}

console.log("\n✓ Benchmark complete");
