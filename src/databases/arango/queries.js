export const arangoQueries = {
  oneHop: `
    FOR start IN users
      FILTER start._key == @nodeId

      FOR neighbor IN 1..1 ANY start relationships
        COLLECT id = neighbor._key

      COLLECT WITH COUNT INTO count

      RETURN { count }
  `,

  twoHop: `
    FOR start IN users
      FILTER start._key == @nodeId

      FOR target IN 2..2 ANY start relationships
        COLLECT id = target._key

      COLLECT WITH COUNT INTO count

      RETURN { count }
  `,

  threeHop: `
    FOR start IN users
      FILTER start._key == @nodeId

      FOR target IN 3..3 ANY start relationships
        COLLECT id = target._key

      COLLECT WITH COUNT INTO count

      RETURN { count }
  `,

  pointLookup: `
    FOR user IN users
      FILTER user._key == @nodeId

      RETURN {
        found: true,
        id: user._key
      }
  `,

  filteredLookup: `
    FOR user IN users
      FILTER user._key == @nodeId

      RETURN {
        found: true,
        id: user._key
      }
  `,

  aggregation: `
    FOR relationship IN relationships
      COLLECT WITH COUNT INTO count

    RETURN { count }
  `,
};
