// tests/test-globals.d.ts
// Global type declarations for test suites

declare function describe(name: string, fn: () => void): void;
declare function it(name: string, fn: () => void | Promise<void>): void;
declare function test(name: string, fn: () => void | Promise<void>): void;
declare function expect(actual: unknown): {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  not: {
    toBe(expected: unknown): void;
    toEqual(expected: unknown): void;
  };
};
