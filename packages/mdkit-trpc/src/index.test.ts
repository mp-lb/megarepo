import { describe, it, expect } from "vitest";
import { createTrpcRouter } from "./server";

describe("trpc-router package", () => {
  it("should export createTrpcRouter", () => {
    expect(createTrpcRouter).toBeDefined();
  });
});
