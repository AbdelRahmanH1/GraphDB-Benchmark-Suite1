export const workloadConfig = {
  warmupIterations: 20,
  measuredIterations: 100,

  concurrencyLevels: [1, 10, 40],

  readWriteMix: {
    read: 80,
    write: 20,
  },
};
