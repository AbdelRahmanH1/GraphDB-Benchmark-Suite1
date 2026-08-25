export function createOperationFactory(operation, startNodes) {
  if (!Array.isArray(startNodes) || startNodes.length === 0) {
    throw new Error("startNodes must contain at least one node");
  }

  return (iteration) => {
    const nodeId = startNodes[iteration % startNodes.length];

    return {
      name: operation.name,
      type: getOperationType(operation),
      depth: operation.depth,
      parameters: {
        nodeId,
      },
    };
  };
}

function getOperationType(operation) {
  if (
    operation.name === "oneHop" ||
    operation.name === "twoHop" ||
    operation.name === "threeHop"
  ) {
    return "traversal";
  }

  if (operation.name === "pointLookup" || operation.name === "filteredLookup") {
    return "lookup";
  }

  if (operation.name === "countByRelationship") {
    return "aggregation";
  }

  return "unknown";
}

export function createMixedOperationFactory(startNodes) {
  if (!Array.isArray(startNodes) || startNodes.length === 0) {
    throw new Error("startNodes must contain at least one node");
  }

  return (iteration) => {
    const nodeId = startNodes[iteration % startNodes.length];

    const readOperations = [
      {
        name: "pointLookup",
        type: "lookup",
      },
      {
        name: "oneHop",
        type: "traversal",
        depth: 1,
      },
      {
        name: "twoHop",
        type: "traversal",
        depth: 2,
      },
    ];

    const operation = readOperations[iteration % readOperations.length];

    return {
      ...operation,

      parameters: {
        nodeId,
        targetNodeId: startNodes[(iteration + 1) % startNodes.length],
      },
    };
  };
}

export function createWriteOperation(startNodes, iteration) {
  if (!Array.isArray(startNodes) || startNodes.length === 0) {
    throw new Error("startNodes must contain at least one node");
  }

  const source = startNodes[iteration % startNodes.length];

  const target = startNodes[(iteration + 1) % startNodes.length];

  return {
    name: "createRelationship",
    type: "write",

    parameters: {
      sourceId: source,
      targetId: target,
    },
  };
}
