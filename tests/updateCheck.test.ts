import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  cachePath,
  isNewer,
  maybeNotifyUpdate,
  readCache,
  shouldCheckUpdate,
  writeCache,
} from "../src/updateCheck";

let tmpDir: string;
const SAVED_ENV = { ...process.env };

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cs-upchk-"));
  process.env = { ...SAVED_ENV };
  process.env.CONTENTSTUDIO_CONFIG_PATH = path.join(tmpDir, "config.json");
  // The cache lives in the same dir as config; redirect by setting XDG.
  process.env.XDG_CONFIG_HOME = tmpDir;
});

afterEach(() => {
  process.env = { ...SAVED_ENV };
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("isNewer (semver)", () => {
  it("compares major", () => {
    expect(isNewer("2.0.0", "1.9.9")).toBe(true);
    expect(isNewer("1.9.9", "2.0.0")).toBe(false);
  });

  it("compares minor when major equal", () => {
    expect(isNewer("1.2.0", "1.1.99")).toBe(true);
    expect(isNewer("1.1.99", "1.2.0")).toBe(false);
  });

  it("compares patch when major+minor equal", () => {
    expect(isNewer("1.0.5", "1.0.4")).toBe(true);
    expect(isNewer("1.0.4", "1.0.5")).toBe(false);
  });

  it("equal versions return false", () => {
    expect(isNewer("1.0.0", "1.0.0")).toBe(false);
  });

  it("strips v prefix and pre-release tags", () => {
    expect(isNewer("v1.0.1", "1.0.0")).toBe(true);
    expect(isNewer("1.0.1-beta", "1.0.0")).toBe(true);
  });

  it("missing parts default to 0", () => {
    expect(isNewer("1.1", "1.0")).toBe(true);
    expect(isNewer("1", "1.0.0")).toBe(false);
  });
});

describe("shouldCheckUpdate (gating)", () => {
  it("skips when CONTENTSTUDIO_NO_UPDATE_CHECK=1", () => {
    expect(
      shouldCheckUpdate(["workspaces:list"], { CONTENTSTUDIO_NO_UPDATE_CHECK: "1" }, true),
    ).toBe(false);
  });

  it("skips when stderr is not a TTY", () => {
    expect(shouldCheckUpdate(["workspaces:list"], {}, false)).toBe(false);
  });

  it("skips when --json is set", () => {
    expect(shouldCheckUpdate(["--json", "workspaces:list"], {}, true)).toBe(false);
  });

  it("skips on --version / -V", () => {
    expect(shouldCheckUpdate(["--version"], {}, true)).toBe(false);
    expect(shouldCheckUpdate(["-V"], {}, true)).toBe(false);
  });

  it("skips on --help / -h", () => {
    expect(shouldCheckUpdate(["--help"], {}, true)).toBe(false);
    expect(shouldCheckUpdate(["-h"], {}, true)).toBe(false);
  });

  it("runs in normal interactive mode", () => {
    expect(shouldCheckUpdate(["workspaces:list"], {}, true)).toBe(true);
  });
});

describe("cache read/write/path", () => {
  it("cachePath uses XDG_CONFIG_HOME", () => {
    expect(cachePath()).toBe(
      path.join(tmpDir, "contentstudio", ".update-check.json"),
    );
  });

  it("readCache returns null when file missing", () => {
    expect(readCache()).toBeNull();
  });

  it("writeCache → readCache round-trip", () => {
    writeCache({ checkedAt: 1234, latestVersion: "9.9.9" });
    const r = readCache();
    expect(r).toEqual({ checkedAt: 1234, latestVersion: "9.9.9" });
  });

  it("readCache returns null on corrupt JSON", () => {
    const p = cachePath();
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, "{not json");
    expect(readCache()).toBeNull();
  });

  it("readCache returns null on wrong shape", () => {
    const p = cachePath();
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify({ foo: "bar" }));
    expect(readCache()).toBeNull();
  });

  it("cache file is written 0600", () => {
    writeCache({ checkedAt: 1, latestVersion: "1.0.0" });
    const mode = fs.statSync(cachePath()).mode & 0o777;
    expect(mode).toBe(0o600);
  });
});

describe("maybeNotifyUpdate banner output", () => {
  it("prints to stderr when cached version is newer", () => {
    writeCache({ checkedAt: Date.now(), latestVersion: "9.9.9" });
    const writes: string[] = [];
    const orig = process.stderr.write;
    process.stderr.write = ((s: string) => {
      writes.push(s);
      return true;
    }) as any;
    try {
      maybeNotifyUpdate("1.0.3", ["workspaces:list"], {} as any, true);
    } finally {
      process.stderr.write = orig;
    }
    expect(writes.join("")).toContain("9.9.9");
    expect(writes.join("")).toContain("you have 1.0.3");
  });

  it("does NOT print when cache says current is up-to-date", () => {
    writeCache({ checkedAt: Date.now(), latestVersion: "1.0.3" });
    const writes: string[] = [];
    const orig = process.stderr.write;
    process.stderr.write = ((s: string) => {
      writes.push(s);
      return true;
    }) as any;
    try {
      maybeNotifyUpdate("1.0.3", ["workspaces:list"], {} as any, true);
    } finally {
      process.stderr.write = orig;
    }
    expect(writes.join("")).toBe("");
  });

  it("does NOT print when --json is in argv", () => {
    writeCache({ checkedAt: Date.now(), latestVersion: "9.9.9" });
    const writes: string[] = [];
    const orig = process.stderr.write;
    process.stderr.write = ((s: string) => {
      writes.push(s);
      return true;
    }) as any;
    try {
      maybeNotifyUpdate("1.0.3", ["--json", "workspaces:list"], {} as any, true);
    } finally {
      process.stderr.write = orig;
    }
    expect(writes.join("")).toBe("");
  });

  it("does NOT print when not a TTY", () => {
    writeCache({ checkedAt: Date.now(), latestVersion: "9.9.9" });
    const writes: string[] = [];
    const orig = process.stderr.write;
    process.stderr.write = ((s: string) => {
      writes.push(s);
      return true;
    }) as any;
    try {
      maybeNotifyUpdate("1.0.3", ["workspaces:list"], {} as any, false);
    } finally {
      process.stderr.write = orig;
    }
    expect(writes.join("")).toBe("");
  });
});
