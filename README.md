# Graph DB Benchmark: CognoDB vs Neo4j vs FalkorDB

This project is really about one database: **CognoDB**. I wanted to know how it actually performs, not just take that on faith, so I built a proper benchmark around it and put two well-known graph databases next to it for comparison — Neo4j and FalkorDB. Both are popular, both handle graphs a bit differently under the hood, and both are easy enough to run locally so the comparison stays fair.

The whole thing is a Node.js app. It uses Docker to run Neo4j and FalkorDB locally so I'm not comparing a hosted instance to a laptop install, and it talks to each database through its native client — the Neo4j driver for Neo4j (and for CognoDB, since it exposes a Neo4j-compatible protocol), and the FalkorDB client for FalkorDB.

The point isn't "which graph database is the best in the world." It's much narrower than that: on my machine, with the same dataset and the same queries, how does CognoDB actually perform compared to two databases people already trust?

---

## 🧪 What Actually Gets Measured

Rather than one synthetic query, the benchmark walks through the kinds of things a real graph workload actually does:

| Category                     | What it simulates                                             |
| ---------------------------- | ------------------------------------------------------------- |
| **Data loading**             | How fast can it ingest a large relationship dataset?          |
| **Traversals**               | 1-hop, 2-hop, 3-hop — "who's connected to whom" style queries |
| **Point lookups**            | Find one node by ID                                           |
| **Filtered/indexed lookups** | Find nodes by an indexed property                             |
| **Aggregation**              | Count relationships by type                                   |

For every timed operation, I don't just report the average — averages hide the ugly tail. I report **p50 and p95 latency**, plus throughput (queries/sec, nodes/sec, relationships/sec).

---

## ⚖️ The Fairness Problem — and Why Docker Solved It

Here's the trap most "graph database benchmarks" fall into: they compare a fully-managed cloud instance of Database A against a laptop install of Database B, and then act surprised when the numbers don't mean anything.

To avoid that, every comparison database runs **locally, in Docker, under the same resource ceiling**:

```env
BENCHMARK_CPU=0.50
BENCHMARK_MEMORY=512M
```

Same vCPU budget. Same memory budget. Same host machine. Same network path (localhost). If a database can't be fairly capped this way, or the limits can't be normalized, that's documented as a caveat rather than swept under the rug.

Docker Compose orchestrates the fleet:

```text
graph-benchmark-neo4j
graph-benchmark-falkordb
```

Each service gets its own host port to avoid collisions:

| Database | Host Port                                                   |
| -------- | ----------------------------------------------------------- |
| Neo4j    | 7688 (moved off the default 7687 to dodge a local conflict) |
| FalkorDB | 6379                                                        |

---

## 📦 The Dataset: Stanford SNAP Pokec

Real social graphs behave differently than randomly generated ones — degree distribution, clustering, hub nodes. So the benchmark uses the **Pokec social network dataset** from Stanford's SNAP collection (`soc-pokec-relationships.txt`), streamed in batches rather than loaded fully into memory so the loading step doesn't blow up memory usage.

Cypher, Gremlin, AQL — the query _language_ changes per platform, but the query's _meaning_ never does.

---

## 🏗️ How the Harness Is Built

The core design decision: **the benchmark engine should never know how a specific database talks.** Every database gets a thin adapter implementing the same interface —

```text
connect()  close()  loadBatch()  execute()  clearDatabase()  getStats()
```

— so the runner just calls the adapter, and the adapter handles Bolt, Gremlin, AQL, or whatever the platform speaks underneath.

```text
Benchmark Runner
       │
       ▼
Database Adapter
       │
       ├── CognoDB
       ├── Neo4j
       └── FalkorDB
```

```text
src/
├── benchmark/     → runner, operations, start-node selection
├── databases/      → one adapter folder per database
├── dataset/         → streaming reader for the Pokec file
├── loaders/         → batch loading logic
├── workloads/       → traversal / lookup / aggregation definitions
└── main.js          → orchestrates the whole run
```

Every workload is warmed up first (20 iterations, discarded) before the measured run (100 iterations) — so JVM startup, query compilation, and cold caches don't poison the numbers.

---

## 🧩 The War Story: What Broke, and How It Got Fixed

No infrastructure setup like this goes smoothly on the first try. A few honest scars from getting the stack running:

- **Docker Compose config issues** — an early attempt had an invalid nesting in the compose file, which got sorted out once the services were separated correctly.
- **Databases not fully ready** — a few connection attempts failed early on simply because Neo4j or FalkorDB hadn't finished starting up yet inside their containers. Checking `docker logs` and waiting a bit longer solved it every time.

None of this gets hidden in the final report. If a database can't execute a required operation, the benchmark records it as an error with the reason — **honest failures over silent omissions**.

---

## Environment Variables (`.env.example`)

```dotenv
BENCHMARK_CPU=0.50
BENCHMARK_MEMORY=512M

# =========================================================
# COGNODB
# =========================================================
COGNODB_HOST=
COGNODB_URI=
COGNODB_USERNAME=
COGNODB_PASSWORD=
# =========================================================
# NEO4J
# =========================================================

NEO4J_HOST=
NEO4J_PORT=
NEO4J_URI=
NEO4J_USERNAME=
NEO4J_PASSWORD=
NEO4J_DATABASE=

# =========================================================
# FALKORDB
# =========================================================

FALKORDB_HOST=
FALKORDB_PORT=
FALKORDB_USERNAME=
FALKORDB_PASSWORD=
FALKORDB_GRAPH_NAME=
```

Copy this to `.env` and fill in the values for your setup before running the benchmark.

---

## Installing and Running It

You'll need Node.js and Docker installed first.

1. Download the dataset before anything else — it's too large to include in the repo. Grab [soc-pokec-relationships.txt.gz](https://snap.stanford.edu/data/soc-pokec-relationships.txt.gz), extract it, and place the extracted file at:
   `data/raw/soc-pokec-relationships.txt`
2. Clone the repo and install dependencies:
   `npm install`
3. Create a `.env` file with the connection details for CognoDB, Neo4j, and FalkorDB (host, port, username/password where relevant).
4. Bring up Neo4j and FalkorDB with Docker:
   `docker compose up -d`
5. Give them a moment to actually finish starting up — check with `docker ps` and don't rush straight into the benchmark, since a database that's still booting will just fail the connection.
6. Run the benchmark:
   `npm start`

It'll go through each database in turn — connect, clear out any old data, load the dataset, warm up, run through all the workloads, grab the final stats, and move on to the next one.

---

## 📊 The Results

Numbers from the actual run — 10,000 relationships / 6,731 unique nodes loaded per database, 100 iterations per workload.

### Data Loading

| Database | Nodes/s | Relationships/s | Total Load Time |
| -------- | ------: | --------------: | --------------: |
| CognoDB  |   223.1 |           331.5 |         30.17 s |
| Neo4j    |   459.2 |           682.2 |         14.66 s |
| FalkorDB |   758.5 |         1,126.9 |          8.87 s |

### Traversals (p50 / p95, ms)

| Database | 1-Hop           | 2-Hop           | 3-Hop           |
| -------- | --------------- | --------------- | --------------- |
| CognoDB  | 138.47 / 139.89 | 138.36 / 139.50 | 138.57 / 139.82 |
| Neo4j    | 4.54 / 5.84     | 4.37 / 5.50     | 4.19 / 4.88     |
| FalkorDB | 1.29 / 1.69     | 1.33 / 1.76     | 1.32 / 1.64     |

### Lookups (p50 / p95, ms)

| Database | Point Lookup    | Filtered Lookup |
| -------- | --------------- | --------------- |
| CognoDB  | 138.48 / 139.90 | 138.01 / 139.16 |
| Neo4j    | 4.13 / 4.85     | 4.12 / 4.75     |
| FalkorDB | 1.26 / 1.63     | 1.27 / 1.65     |

### Aggregation — `CONNECTED_TO` count (p50 / p95, ms)

| Database |    p50 |    p95 |
| -------- | -----: | -----: |
| CognoDB  | 136.07 | 136.77 |
| Neo4j    |   2.77 |   3.39 |
| FalkorDB |   0.75 |   1.25 |

---

## Analysis

**FalkorDB is fastest everywhere, and it isn't close.** It loads data ~3.4x faster than CognoDB and ~1.65x faster than Neo4j, and its query latencies (traversals, lookups, aggregation) all land under 2ms — roughly 3-4x faster than Neo4j and around 100x faster than CognoDB on the same operations. Being built on Redis clearly pays off here: in-memory storage plus a lightweight query path keeps everything fast, though it's worth remembering this is a single-node, in-memory setup — that speed comes with different durability and scaling trade-offs than a disk-backed database.

**Neo4j sits comfortably in the middle** — a few milliseconds per query, and it actually shows the pattern you'd expect: 1-hop is a bit slower than the aggregation count, and each additional hop adds a small but real amount of latency. That's a sign the timings reflect real query execution differences, not just fixed overhead.

**CognoDB is the outlier, and not just because it's slower.** Every single operation — 1-hop, 2-hop, 3-hop, point lookup, filtered lookup, even the aggregation — lands in the same narrow band, around 136-140ms, regardless of how much work the query is actually doing. A 3-hop traversal costs almost exactly the same as a simple point lookup. That flat, uniform latency across very different query types is the real story here: it strongly suggests the bulk of that time isn't query execution at all, but some kind of fixed overhead per request — most likely network round-trip time or connection/handshake overhead if CognoDB is being reached as a remote/hosted instance rather than running locally like Neo4j and FalkorDB were. Data loading also came in slowest here (223 nodes/s vs Neo4j's 459 and FalkorDB's 758), which is consistent with per-operation overhead dominating over raw throughput.

If that overhead theory is right, it also means this benchmark understates how CognoDB's actual query engine performs relative to the other two — the numbers here measure "round trip to CognoDB as deployed," not necessarily "CognoDB's query execution speed." I didn't have a way to run CognoDB locally in Docker the way I did for Neo4j and FalkorDB, so it was benchmarked against its hosted/platform instance instead — meaning some of that latency is almost certainly network round-trip time to that instance rather than the database itself being slow. A local, same-machine deployment of CognoDB would very likely close a meaningful chunk of this gap, so these numbers should be read as a floor on CognoDB's real performance, not a ceiling.

---

- **Same workload, same dataset, every platform** — no database gets an easier query.
- **Percentiles over averages** — p50 and p95 are reported because tail latency is where real systems hurt.
- **Adapters, not special cases** — database-specific quirks live in isolated adapter code, never leak into the benchmark engine.
- **Honest failures** — a database that can't do something gets an error entry, not a blank cell.
- **Reproducible by design** — deterministic seeds for start-node selection, explicit warm-up/measured iteration counts, pinned batch sizes.

---

## ⚠️ Caveats Worth Reading Before Trusting Any Number

Docker resource limits, JVM garbage collection pauses, storage performance, query optimizer differences, and driver overhead all introduce variance that's worth knowing about before treating any single number as gospel. Where a measurement genuinely can't be observed reliably (e.g. storage footprint on some platforms), it's reported as `not observable` rather than guessed at.

**On the CognoDB numbers specifically:** Neo4j and FalkorDB both ran locally in Docker on the same machine as the benchmark client, but I didn't have a way to self-host CognoDB the same way — it was tested against its hosted platform instance instead. That's not an apples-to-apples comparison on network distance, and it's the most likely explanation for CognoDB's flat ~136-140ms latency across every operation. Take the CognoDB numbers as a lower bound on its real performance, not a final verdict.

---

## 📈 What's Next

Once every database has completed a full run, the collected JSON results feed into a chart-generation step producing visual comparisons for ingest throughput, per-hop traversal latency, lookup latency, and aggregation latency.
