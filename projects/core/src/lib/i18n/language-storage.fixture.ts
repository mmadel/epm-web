/**
 * Storage doubles for tests.
 *
 * Tests use these rather than the runner's real `localStorage` so that they cannot
 * leak state into each other, and so that the failure modes this code exists to
 * survive - storage that is absent, and storage that throws - can actually be
 * exercised.
 */

/** An in-memory `Storage`. */
export function fakeStorage(initial: Record<string, string> = {}): Storage {
  const entries = new Map(Object.entries(initial));

  return {
    get length() {
      return entries.size;
    },
    clear: () => entries.clear(),
    getItem: (key: string) => entries.get(key) ?? null,
    key: (index: number) => [...entries.keys()][index] ?? null,
    removeItem: (key: string) => void entries.delete(key),
    setItem: (key: string, value: string) => void entries.set(key, value),
  };
}

/** A `Storage` that is present but refuses to work, as in a locked-down browser. */
export function throwingStorage(): Storage {
  const boom = (): never => {
    throw new DOMException('The operation is insecure.', 'SecurityError');
  };

  return {
    length: 0,
    clear: boom,
    getItem: boom,
    key: boom,
    removeItem: boom,
    setItem: boom,
  };
}
