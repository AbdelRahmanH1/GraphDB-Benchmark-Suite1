import neo4j from "neo4j-driver";

import { validateDatabaseAdapter } from "./database.js";
import { getCypherQuery, getCypherParams } from "./cypher/execute.js";

export function createNeo4jAdapter() {
  const driver = neo4j.driver(
    process.env.NEO4J_URI,
    neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD),
  );

  const database = {
    name: "Neo4j",

    async connect() {
      await driver.verifyConnectivity();
    },

    async close() {
      await driver.close();
    },

    async loadBatch(batch) {
      const session = driver.session();

      try {
        await session.run(
          `
          UNWIND $relationships AS relationship

          MERGE (source:User {
            id: relationship.source
          })

          MERGE (target:User {
            id: relationship.target
          })

          MERGE (source)-[:CONNECTED_TO]->(target)
          `,
          {
            relationships: batch,
          },
        );
      } finally {
        await session.close();
      }
    },

    async execute(operation) {
      const session = driver.session();

      try {
        const query = getCypherQuery(operation);
        const params = getCypherParams(operation);

        const result = await session.run(query, params);

        return parseResult(operation, result);
      } finally {
        await session.close();
      }
    },

    async clearDatabase() {
      const session = driver.session();

      try {
        await session.run(`
          MATCH (n)
          DETACH DELETE n
        `);
      } finally {
        await session.close();
      }
    },

    async getStats() {
      const session = driver.session();

      try {
        const result = await session.run(`
          MATCH (n)
          WITH count(n) AS nodes
          OPTIONAL MATCH ()-[r]->()
          RETURN nodes, count(r) AS relationships
        `);

        const record = result.records[0];

        return {
          nodes: record.get("nodes").toNumber(),
          relationships: record.get("relationships").toNumber(),
        };
      } finally {
        await session.close();
      }
    },
  };

  validateDatabaseAdapter(database);

  return database;
}

function parseResult(operation, result) {
  const record = result.records[0];

  if (!record) {
    if (
      operation.name === "pointLookup" ||
      operation.name === "filteredLookup"
    ) {
      return {
        found: false,
        id: null,
      };
    }

    return {
      count: 0,
    };
  }

  if (operation.type === "traversal" || operation.name === "aggregation") {
    return {
      count: record.get("count").toNumber(),
    };
  }

  if (operation.name === "pointLookup" || operation.name === "filteredLookup") {
    const id = record.get("id");

    return {
      found: id !== null && id !== undefined,
      id: id !== null && id !== undefined ? String(id) : null,
    };
  }

  return {};
}
