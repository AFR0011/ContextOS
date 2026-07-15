import { expect, test } from "@playwright/test";

test("database outage classifier detects connection failures without masking data errors", async () => {
  const { isDatabaseUnavailableError } = await import("../../src/lib/database-errors");

  expect(isDatabaseUnavailableError({ code: "P1001", message: "Can't reach database server" })).toBe(true);
  expect(isDatabaseUnavailableError({ cause: { code: "ECONNREFUSED", message: "connect ECONNREFUSED 127.0.0.1:5432" } })).toBe(true);
  expect(isDatabaseUnavailableError({ code: "P2010", cause: { code: "XX000", message: "Control plane request failed" } })).toBe(true);
  expect(isDatabaseUnavailableError({ code: "P2002", message: "Unique constraint failed on the fields: (`email`)" })).toBe(false);
});
