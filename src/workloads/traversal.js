export const traversalWorkload = {
  name: "traversal",

  operations: [
    {
      name: "oneHop",
      description: "Find direct neighbors of a randomly selected node.",
      depth: 1,
    },
    {
      name: "twoHop",
      description: "Find nodes two relationships away.",
      depth: 2,
    },
    {
      name: "threeHop",
      description: "Find nodes three relationships away.",
      depth: 3,
    },
  ],

  iterations: 100,
};
