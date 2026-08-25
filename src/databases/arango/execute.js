import { arangoQueries } from "./queries.js";

export async function executeArangoOperation(db, operation) {
  const query = arangoQueries[operation.name];

  if (!query) {
    throw new Error(`ArangoDB does not support operation: ${operation.name}`);
  }

  const bindVars = {
    nodeId: String(operation.parameters?.nodeId ?? ""),
  };

  const cursor = await db.query(query, bindVars);
  const result = await cursor.all();

  return parseResult(operation, result);
}

function parseResult(operation, result) {
  const row = result[0];

  if (!row) {
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
      count: Number(row.count ?? 0),
    };
  }

  if (operation.name === "pointLookup" || operation.name === "filteredLookup") {
    const id = row.id;

    return {
      found: id !== undefined && id !== null,
      id: id !== undefined && id !== null ? String(id) : null,
    };
  }

  return {};
}
