import { FalkorDB } from "falkordb";

import { validateDatabaseAdapter } from "./database.js";
import { getCypherQuery, getCypherParams } from "./cypher/execute.js";

export function createFalkorDBAdapter() {
  let client = null;
  let graph = null;

  const database = {
    name: "FalkorDB",

    async connect() {
      const host = process.env.FALKORDB_HOST || "localhost";
      const port = Number(process.env.FALKORDB_PORT || 6379);
      const graphName = process.env.FALKORDB_GRAPH_NAME || "graph-benchmark";

      console.log(`FalkorDB: connecting to ${host}:${port}`);

      client = await FalkorDB.connect({
        socket: {
          host,
          port,
        },
      });

      graph = client.selectGraph(graphName);

      await graph.query(`
        RETURN 1 AS value
      `);

      console.log(`FalkorDB: connected to graph "${graphName}"`);
    },

    async close() {
      if (client) {
        await client.close();
      }

      client = null;
      graph = null;

      console.log("FalkorDB: connection closed");
    },

    async loadBatch(batch) {
      if (!graph) {
        throw new Error("FalkorDB adapter is not connected");
      }

      if (!Array.isArray(batch) || batch.length === 0) {
        return;
      }

      const query = `
        UNWIND $relationships AS relationship

        MERGE (source:User {
          id: relationship.source
        })

        MERGE (target:User {
          id: relationship.target
        })

        MERGE (source)-[:CONNECTED_TO]->(target)
      `;

      await graph.query(query, {
        params: {
          relationships: batch,
        },
      });
    },

    async execute(operation) {
      if (!graph) {
        throw new Error("FalkorDB adapter is not connected");
      }

      const query = getCypherQuery(operation);
      const params = getCypherParams(operation);

      const result = await graph.query(query, {
        params,
      });

      return parseFalkorResult(operation, result);
    },

    async clearDatabase() {
      if (!graph) {
        throw new Error("FalkorDB adapter is not connected");
      }

      await graph.query(`
        MATCH (n)
        DETACH DELETE n
      `);
    },

    async getStats() {
      if (!graph) {
        throw new Error("FalkorDB adapter is not connected");
      }

      const nodeResult = await graph.query(`
        MATCH (n)
        RETURN count(n) AS count
      `);

      const relationshipResult = await graph.query(`
        MATCH ()-[r]->()
        RETURN count(r) AS count
      `);

      return {
        nodes: Number(nodeResult.data?.[0]?.count ?? 0),
        relationships: Number(relationshipResult.data?.[0]?.count ?? 0),
      };
    },
  };

  validateDatabaseAdapter(database);

  return database;
}

function parseFalkorResult(operation, result) {
  const row = result.data?.[0];

  if (!row) {
    if (operation.type === "traversal" || operation.name === "aggregation") {
      return {
        count: 0,
      };
    }

    return {
      found: false,
      id: null,
    };
  }

  if (operation.type === "traversal" || operation.name === "aggregation") {
    return {
      count: Number(row.count ?? 0),
    };
  }

  const id = row.id;

  return {
    found: id !== undefined && id !== null,
    id: id !== undefined && id !== null ? String(id) : null,
  };
}
