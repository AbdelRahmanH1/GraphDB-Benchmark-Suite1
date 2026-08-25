import { createCognoDBAdapter } from "./congoDB.js";
import { createNeo4jAdapter } from "./neo4j.js";
import { createFalkorDBAdapter } from "./falkordb.js";

export function createDatabases() {
  return [
    createCognoDBAdapter(),
    createNeo4jAdapter(),
    createFalkorDBAdapter(),
  ];
}
