export const operations = {
  oneHop: {
    name: "oneHop",
    type: "traversal",
    depth: 1,
  },

  twoHop: {
    name: "twoHop",
    type: "traversal",
    depth: 2,
  },

  threeHop: {
    name: "threeHop",
    type: "traversal",
    depth: 3,
  },

  pointLookup: {
    name: "pointLookup",
    type: "lookup",
    lookupType: "point",
  },

  filteredLookup: {
    name: "filteredLookup",
    type: "lookup",
    lookupType: "filtered",
  },

  aggregation: {
    name: "aggregation",
    type: "aggregation",
  },

  write: {
    name: "write",
    type: "write",
  },
};

export function createOperation(operation, parameters = {}) {
  return {
    ...operation,
    parameters,
  };
}
