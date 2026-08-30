// Payload hygiene for every write that reaches a Firestore SDK.
//
// The Firestore driver throws on `undefined` unless ignoreUndefinedProperties
// is on — and we deliberately leave that off (lib/firebase/admin.ts) so a
// mistake surfaces loudly instead of silently dropping a field. This sanitizer
// is the front line: it strips undefined recursively before the driver ever
// sees the object, per the zero-crash payload directive.
//
// null is preserved: it is a meaningful stored value. undefined is not.

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

// Convenience for write paths: strips undefined and rejects an empty result,
// so an all-undefined update can never fire a no-op write that looks like it
// succeeded.
export function sanitizeWrite<T extends Plain>(input: T): T {
  const cleaned = stripUndefined(input);
  if (Object.keys(cleaned as Plain).length === 0) {
    throw new Error("empty_payload");
  }
  return cleaned;
}
