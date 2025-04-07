export const maybe =
  <T, U>(fn: (value: T) => U) =>
  (value: T | undefined) =>
    value ? fn(value) : undefined;
