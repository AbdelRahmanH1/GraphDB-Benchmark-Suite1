export function validateDatabaseAdapter(database) {
  const requiredMethods = ["connect", "close", "loadBatch", "execute"];

  for (const method of requiredMethods) {
    if (typeof database[method] !== "function") {
      throw new Error(`Database "${database.name}" must implement ${method}()`);
    }
  }

  return true;
}
