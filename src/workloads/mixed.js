export const mixedWorkload = {
  name: "mixed",

  concurrency: 20,

  readPercentage: 80,

  writePercentage: 20,

  operations: [
    {
      name: "read",
    },
    {
      name: "write",
    },
  ],
};
