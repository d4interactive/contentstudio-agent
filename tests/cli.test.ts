/**
 * Subprocess-style tests of the built CLI (dist/index.js).
 * Verifies --help, --version, JSON envelopes, and dry-run paths.
 *
 * Requires `npm run build` to have been run first (CI does this in a step).
 */

import { execFileSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

const CLI = path.resolve(__dirname, "..", "dist", "index.js");

function run(
  args: string[],
  envOverride: Record<string, string> = {},
): { code: number; stdout: string; stderr: string } {
  const env = {
    ...process.env,
    ...envOverride,
  };
  try {
    const stdout = execFileSync("node", [CLI, ...args], {
      env,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { code: 0, stdout, stderr: "" };
  } catch (e: any) {
    return {
      code: e.status ?? 1,
      stdout: (e.stdout ?? "").toString(),
      stderr: (e.stderr ?? "").toString(),
    };
  }
}

let tmpDir: string;
let cfgFile: string;

beforeEach(() => {
  if (!fs.existsSync(CLI)) {
    throw new Error(`dist/index.js missing — run 'npm run build' first.`);
  }
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cs-cli-"));
  cfgFile = path.join(tmpDir, "config.json");
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("CLI surface", () => {
  it("--help exits 0 and lists commands", () => {
    const r = run(["--help"], { CONTENTSTUDIO_CONFIG_PATH: cfgFile });
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("contentstudio");
    expect(r.stdout).toContain("auth:login");
    expect(r.stdout).toContain("posts:create");
  });

  it("--version prints 1.0.0", () => {
    const r = run(["--version"], { CONTENTSTUDIO_CONFIG_PATH: cfgFile });
    expect(r.code).toBe(0);
    expect(r.stdout.trim()).toMatch(/^1\./);
  });
});

describe("auth:login --no-verify", () => {
  it("persists config without HTTP call", () => {
    const r = run(
      ["--json", "auth:login", "--api-key", "cs_dummy", "--skip-verify"],
      { CONTENTSTUDIO_CONFIG_PATH: cfgFile },
    );
    expect(r.code).toBe(0);
    const data = JSON.parse(r.stdout);
    expect(data.ok).toBe(true);
    const persisted = JSON.parse(fs.readFileSync(cfgFile, "utf-8"));
    expect(persisted.api_key).toBe("cs_dummy");
  });
});

describe("posts:create shortcut requires fields", () => {
  it("missing -c/-i/-t emits ConfigError JSON envelope, exit non-zero", () => {
    fs.writeFileSync(
      cfgFile,
      JSON.stringify({
        api_key: "cs_dummy",
        active_workspace_id: "ws-x",
      }),
    );
    const r = run(
      ["--json", "posts:create", "--content", "only text"],
      { CONTENTSTUDIO_CONFIG_PATH: cfgFile },
    );
    expect(r.code).not.toBe(0);
    const data = JSON.parse(r.stdout);
    expect(data.ok).toBe(false);
    expect(data.error.type).toBe("ConfigError");
  });
});

describe("--dry-run paths never hit the network", () => {
  it("posts:create --dry-run with bogus key still succeeds", () => {
    fs.writeFileSync(
      cfgFile,
      JSON.stringify({
        api_key: "cs_INVALID",
        active_workspace_id: "ws-bogus",
      }),
    );
    const r = run(
      [
        "--json",
        "posts:create",
        "--dry-run",
        "-c",
        "hi",
        "-i",
        "acct-x",
        "-t",
        "draft",
      ],
      { CONTENTSTUDIO_CONFIG_PATH: cfgFile },
    );
    expect(r.code).toBe(0);
    const data = JSON.parse(r.stdout);
    expect(data.ok).toBe(true);
    expect(data.data.dry_run).toBe(true);
    expect(data.data.body.content.text).toBe("hi");
    expect(data.data.body.accounts).toEqual(["acct-x"]);
    expect(data.data.body.scheduling.publish_type).toBe("draft");
  });

  it("posts:delete --dry-run no network", () => {
    fs.writeFileSync(
      cfgFile,
      JSON.stringify({
        api_key: "cs_INVALID",
        active_workspace_id: "ws-bogus",
      }),
    );
    const r = run(
      ["--json", "posts:delete", "p1", "--dry-run", "--delete-from-social"],
      { CONTENTSTUDIO_CONFIG_PATH: cfgFile },
    );
    expect(r.code).toBe(0);
    const data = JSON.parse(r.stdout);
    expect(data.ok).toBe(true);
    expect(data.data.body).toEqual({ delete_from_social: true });
  });

  it("comments:add --dry-run --note --mention", () => {
    fs.writeFileSync(
      cfgFile,
      JSON.stringify({
        api_key: "cs_INVALID",
        active_workspace_id: "ws-bogus",
      }),
    );
    const r = run(
      [
        "--json",
        "comments:add",
        "p1",
        "internal FYI",
        "--note",
        "--mention",
        "u1",
        "--dry-run",
      ],
      { CONTENTSTUDIO_CONFIG_PATH: cfgFile },
    );
    expect(r.code).toBe(0);
    const data = JSON.parse(r.stdout);
    expect(data.data.body).toEqual({
      comment: "internal FYI",
      is_note: true,
      mentioned_users: ["u1"],
    });
  });
});
