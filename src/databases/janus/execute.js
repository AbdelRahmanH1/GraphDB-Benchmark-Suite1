import gremlin from "gremlin";

const { process: traversalProcess } = gremlin;

const __ = traversalProcess.statics;

export async function executeGremlinOperation(traversal, operation) {
  const nodeId = String(operation.parameters?.nodeId ?? "");

  switch (operation.name) {
    case "oneHop":
      return executeOneHop(traversal, nodeId);

    case "twoHop":
      return executeTwoHop(traversal, nodeId);

    case "threeHop":
      return executeThreeHop(traversal, nodeId);

    case "pointLookup":
      return executePointLookup(traversal, nodeId);

    case "filteredLookup":
      return executeFilteredLookup(traversal, nodeId);

    case "aggregation":
      return executeAggregation(traversal);

    default:
      throw new Error(
        `JanusGraph does not support operation: ${operation.name}`,
      );
  }
}

async function executeOneHop(traversal, nodeId) {
  const result = await traversal
    .V()
    .hasLabel("User")
    .has("id", nodeId)
    .out("CONNECTED_TO")
    .dedup()
    .count()
    .next();

  return {
    count: Number(result.value),
  };
}

async function executeTwoHop(traversal, nodeId) {
  const result = await traversal
    .V()
    .hasLabel("User")
    .has("id", nodeId)
    .repeat(__.out("CONNECTED_TO"))
    .times(2)
    .dedup()
    .count()
    .next();

  return {
    count: Number(result.value),
  };
}

async function executeThreeHop(traversal, nodeId) {
  const result = await traversal
    .V()
    .hasLabel("User")
    .has("id", nodeId)
    .repeat(__.out("CONNECTED_TO"))
    .times(3)
    .dedup()
    .count()
    .next();

  return {
    count: Number(result.value),
  };
}

async function executePointLookup(traversal, nodeId) {
  const result = await traversal
    .V()
    .hasLabel("User")
    .has("id", nodeId)
    .values("id")
    .limit(1)
    .toList();

  if (result.length === 0) {
    return {
      found: false,
      id: null,
    };
  }

  return {
    found: true,
    id: String(result[0]),
  };
}

async function executeFilteredLookup(traversal, nodeId) {
  const result = await traversal
    .V()
    .hasLabel("User")
    .has("id", nodeId)
    .values("id")
    .limit(1)
    .toList();

  if (result.length === 0) {
    return {
      found: false,
      id: null,
    };
  }

  return {
    found: true,
    id: String(result[0]),
  };
}

async function executeAggregation(traversal) {
  const result = await traversal.E().count().next();

  return {
    count: Number(result.value),
  };
}
