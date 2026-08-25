export const lookupWorkload = {
  name: "lookup",

  operations: [
    {
      name: "pointLookup",
      description: "Find a node by its unique ID.",
    },
    {
      name: "filteredLookup",
      description: "Find nodes using an indexed property.",
    },
  ],

  iterations: 100,
};
