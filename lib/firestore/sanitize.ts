// Strips undefined before it reaches the Firestore driver, which rejects it.
// null is preserved: it is a meaningful stored value.

type Plain = Record<string, unknown>;

function isPlainObject(value: unknown): value is Plain {
  if (value === null || typeof value !== "object") return false;
  if (Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export function stripUndefined<T>(input: T): T {
  if (Array.isArray(input)) {
    return input
      .filter((item) => item !== undefined)
      .map((item) => stripUndefined(item)) as unknown as T;
  }

  if (isPlainObject(input)) {
    const output: Plain = {};
    for (const [key, value] of Object.entries(input)) {
      if (value === undefined) continue;
      output[key] = stripUndefined(value);
    }
    return output as T;
  }

  return input;
}

