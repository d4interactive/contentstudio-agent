import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  Config,
  DEFAULT_BASE_URL,
  clearConfig,
  configPath,
  loadConfig,
  saveConfig,
} from "../src/config";
import { ConfigError } from "../src/errors";

let tmpDir: string;
let cfgFile: string;
const SAVED_ENV = { ...process.env };

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cs-cfg-"));
  cfgFile = path.join(tmpDir, "config.json");
  process.env = { ...SAVED_ENV };
  process.env.CONTENTSTUDIO_CONFIG_PATH = cfgFile;
  delete process.env.CONTENTSTUDIO_API_KEY;
  delete process.env.CONTENTSTUDIO_BASE_URL;
  delete process.env.CONTENTSTUDIO_WORKSPACE_ID;
});

afterEach(() => {
  process.env = { ...SAVED_ENV };
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("Config defaults", () => {
  it("uses default base URL and null/empty fields", () => {
    const c = new Config();
    expect(c.baseUrl).toBe(DEFAULT_BASE_URL);
    expect(c.apiKey).toBeNull();
    expect(c.activeWorkspaceId).toBeNull();
    expect(c.user).toEqual({});
  });
});

describe("env overrides", () => {
  it("api key, base url, workspace are overridden by env", () => {
    process.env.CONTENTSTUDIO_API_KEY = "cs_env";
    process.env.CONTENTSTUDIO_BASE_URL = "https://example.test/api/v1/";
    process.env.CONTENTSTUDIO_WORKSPACE_ID = "ws-env";
    const c = new Config({ apiKey: "cs_cfg", activeWorkspaceId: "ws-cfg" });
    expect(c.effectiveApiKey()).toBe("cs_env");
    expect(c.effectiveBaseUrl()).toBe("https://example.test/api/v1");
    expect(c.effectiveWorkspaceId()).toBe("ws-env");
  });
});

describe("requireApiKey / requireWorkspaceId", () => {
  it("requireApiKey throws ConfigError with hint", () => {
    const c = new Config();
    expect(() => c.requireApiKey()).toThrowError(ConfigError);
    try {
      c.requireApiKey();
    } catch (e) {
      expect((e as ConfigError).hint).toMatch(/auth:login/);
    }
  });

  it("requireWorkspaceId — explicit override wins", () => {
    const c = new Config({ activeWorkspaceId: "ws-cfg" });
    expect(c.requireWorkspaceId("ws-arg")).toBe("ws-arg");
  });

  it("requireWorkspaceId throws when nothing set", () => {
    const c = new Config({ apiKey: "cs_x" });
    expect(() => c.requireWorkspaceId()).toThrowError(ConfigError);
  });
});

describe("save/load roundtrip", () => {
  it("persists and reloads config", () => {
    const c = new Config({
      apiKey: "cs_abc",
      activeWorkspaceId: "ws-7",
    });
    saveConfig(c);
    const back = loadConfig();
    expect(back.apiKey).toBe("cs_abc");
    expect(back.activeWorkspaceId).toBe("ws-7");
  });

  it("file is mode 0600 and dir is 0700", () => {
    saveConfig(new Config({ apiKey: "cs_secret" }));
    const fileMode = fs.statSync(cfgFile).mode & 0o777;
    expect(fileMode).toBe(0o600);
    const dirMode = fs.statSync(path.dirname(cfgFile)).mode & 0o777;
    expect(dirMode).toBe(0o700);
  });
});

describe("clear", () => {
  it("removes file and returns path", () => {
    saveConfig(new Config({ apiKey: "x" }));
    expect(fs.existsSync(cfgFile)).toBe(true);
    const ret = clearConfig();
    expect(ret).toBe(cfgFile);
    expect(fs.existsSync(cfgFile)).toBe(false);
    expect(clearConfig()).toBeNull();
  });
});

describe("corrupt file", () => {
  it("loadConfig raises ConfigError", () => {
    fs.writeFileSync(cfgFile, "{not json");
    expect(() => loadConfig()).toThrowError(ConfigError);
  });
});

describe("redacted dict", () => {
  it("hides full api key", () => {
    const c = new Config({ apiKey: "cs_supersecret_long_key_here" });
    const r = c.toRedactedDict() as Record<string, string>;
    expect(r.api_key).not.toContain("supersecret");
    expect(r.api_key).toMatch(/^cs_sup/);
  });
});

describe("configPath", () => {
  it("respects CONTENTSTUDIO_CONFIG_PATH env override", () => {
    expect(configPath()).toBe(cfgFile);
  });
});
