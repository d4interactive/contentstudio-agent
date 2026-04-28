import { describe, expect, it } from "vitest";

import {
  AuthError,
  BackendError,
  ContentStudioError,
  NotFoundError,
  RateLimitError,
  ValidationError,
  fromHttpStatus,
} from "../src/errors";

describe("fromHttpStatus", () => {
  it("maps 401 → AuthError with hint", () => {
    const e = fromHttpStatus(401, "bad");
    expect(e).toBeInstanceOf(AuthError);
    expect(e.httpStatus).toBe(401);
    expect(e.hint).toMatch(/auth:login/);
  });

  it("maps 403 → AuthError", () => {
    expect(fromHttpStatus(403, "x")).toBeInstanceOf(AuthError);
  });

  it("maps 404 → NotFoundError", () => {
    expect(fromHttpStatus(404, "x")).toBeInstanceOf(NotFoundError);
  });

  it("maps 422 → ValidationError", () => {
    expect(fromHttpStatus(422, "x")).toBeInstanceOf(ValidationError);
  });

  it("maps 429 → RateLimitError with hint", () => {
    const e = fromHttpStatus(429, "slow");
    expect(e).toBeInstanceOf(RateLimitError);
    expect(e.hint).toMatch(/Rate limit/);
  });

  it("maps 500 / 503 → BackendError", () => {
    expect(fromHttpStatus(500, "x")).toBeInstanceOf(BackendError);
    expect(fromHttpStatus(503, "x")).toBeInstanceOf(BackendError);
  });

  it("falls back to ContentStudioError for unmapped codes", () => {
    const e = fromHttpStatus(418, "teapot");
    expect(e).toBeInstanceOf(ContentStudioError);
    expect(e).not.toBeInstanceOf(AuthError);
  });
});

describe("ContentStudioError.toDict", () => {
  it("emits stable JSON shape", () => {
    const e = fromHttpStatus(401, "bad key");
    const d = e.toDict();
    expect(d.type).toBe("AuthError");
    expect(d.message).toBe("bad key");
    expect(d.http_status).toBe(401);
    expect(d.hint).toBeTypeOf("string");
  });

  it("omits optional fields when not provided", () => {
    const e = new ContentStudioError("simple");
    expect(e.toDict()).toEqual({ type: "ContentStudioError", message: "simple" });
  });
});
