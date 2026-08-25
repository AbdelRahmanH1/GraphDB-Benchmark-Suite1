import { cypherQueries } from "./queries.js";

export function getCypherQuery(operation) {
  const query = cypherQueries[operation.name];

  if (!query) {
    throw new Error(`Unsupported operation: ${operation.name}`);
  }

  return query;
}

export function getCypherParams(operation) {
  return {
    nodeId: String(operation.parameters?.nodeId ?? ""),
  };
}
