export function jsonSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value, (_key, next) => (
    typeof next === "bigint" ? next.toString() : next
  )));
}
