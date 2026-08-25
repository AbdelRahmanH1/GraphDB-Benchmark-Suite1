export function createQueryResult({ count = 0, rows = [] }) {
  return {
    count,
    rows,
  };
}
