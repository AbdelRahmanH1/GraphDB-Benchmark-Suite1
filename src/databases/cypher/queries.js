export const cypherQueries = {
  oneHop: `
    MATCH (start:User {id: $nodeId})-[:CONNECTED_TO]->(neighbor)
    RETURN count(DISTINCT neighbor) AS count
  `,

  twoHop: `
    MATCH (start:User {id: $nodeId})
    -[:CONNECTED_TO*2]->(neighbor)
    RETURN count(DISTINCT neighbor) AS count
  `,

  threeHop: `
    MATCH (start:User {id: $nodeId})
    -[:CONNECTED_TO*3]->(neighbor)
    RETURN count(DISTINCT neighbor) AS count
  `,

  pointLookup: `
    MATCH (n:User {id: $nodeId})
    RETURN n.id AS id
    LIMIT 1
  `,

  filteredLookup: `
    MATCH (n:User {id: $nodeId})
    RETURN n.id AS id
    LIMIT 1
  `,

  countByRelationship: `
    MATCH ()-[r:CONNECTED_TO]->()
    RETURN count(r) AS count
  `,
};
