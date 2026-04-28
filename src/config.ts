/**
 * Configuration persistence for the contentstudio CLI.
 *
 * Stores API key, base URL, and active workspace at:
 *   $XDG_CONFIG_HOME/contentstudio/config.json   (or ~/.config/contentstudio/...)
 *
 * Permissions: 0700 dir / 0600 file. Atomic writes use exclusive file
 * locking via a "write to tmp + rename" dance (POSIX `rename(2)` is atomic
 * on the same filesystem).
 *
 * Env-var overrides:
 *   CONTENTSTUDIO_API_KEY      overrides `apiKey` per-call
 *   CONTENTSTUDIO_BASE_URL     overrides `baseUrl` per-call
 *   CONTENTSTUDIO_WORKSPACE_ID overrides `activeWorkspaceId` per-call
 *   CONTENTSTUDIO_CONFIG_PATH  overrides the file location entirely
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { ConfigError } from "./errors";

export const DEFAULT_BASE_URL = "https://api.contentstudio.io/api/v1";

export interface UserInfo {
  id?: string | null;
  email?: string | null;
  full_name?: string | null;
}

export interface ConfigShape {
  api_key?: string | null;
  base_url?: string;
  active_workspace_id?: string | null;
  active_workspace_name?: string | null;
  user?: UserInfo;
}

export function configDir(): string {
  const xdg = process.env.XDG_CONFIG_HOME;
  const base = xdg ? xdg : path.join(os.homedir(), ".config");
  return path.join(base, "contentstudio");
}

export function configPath(): string {
  const override = process.env.CONTENTSTUDIO_CONFIG_PATH;
  if (override) return override;
  return path.join(configDir(), "config.json");
}

export class Config {
  apiKey: string | null;
  baseUrl: string;
  activeWorkspaceId: string | null;
  activeWorkspaceName: string | null;
  user: UserInfo;

  constructor(opts: {
    apiKey?: string | null;
    baseUrl?: string;
    activeWorkspaceId?: string | null;
    activeWorkspaceName?: string | null;
    user?: UserInfo;
  } = {}) {
    this.apiKey = opts.apiKey ?? null;
    this.baseUrl = opts.baseUrl ?? DEFAULT_BASE_URL;
    this.activeWorkspaceId = opts.activeWorkspaceId ?? null;
    this.activeWorkspaceName = opts.activeWorkspaceName ?? null;
    this.user = opts.user ?? {};
  }

  effectiveApiKey(): string | null {
    return process.env.CONTENTSTUDIO_API_KEY || this.apiKey;
  }

  effectiveBaseUrl(): string {
    const v = process.env.CONTENTSTUDIO_BASE_URL || this.baseUrl || DEFAULT_BASE_URL;
    return v.replace(/\/+$/, "");
  }

  effectiveWorkspaceId(): string | null {
    return process.env.CONTENTSTUDIO_WORKSPACE_ID || this.activeWorkspaceId;
  }

  requireApiKey(): string {
    const k = this.effectiveApiKey();
    if (!k) {
      throw new ConfigError("No API key configured.", {
        hint:
          "Run `contentstudio auth:login --api-key cs_...` or set CONTENTSTUDIO_API_KEY in your environment.",
      });
    }
    return k;
  }

  requireWorkspaceId(override?: string | null): string {
    const wid = override || this.effectiveWorkspaceId();
    if (!wid) {
      throw new ConfigError("No active workspace.", {
        hint:
          "Run `contentstudio workspaces:list` and then `workspaces:use <id>`, or pass `--workspace <id>` on the command.",
      });
    }
    return wid;
  }

  toRedactedDict(): Record<string, unknown> {
    const d = {
      api_key: this.apiKey,
      base_url: this.baseUrl,
      active_workspace_id: this.activeWorkspaceId,
      active_workspace_name: this.activeWorkspaceName,
      user: this.user,
    } as Record<string, unknown>;
    if (typeof d.api_key === "string" && d.api_key.length > 0) {
      const k = d.api_key as string;
      d.api_key = `${k.slice(0, 6)}…(${k.length} chars)`;
    }
    return d;
  }

  toJson(): ConfigShape {
    return {
      api_key: this.apiKey,
      base_url: this.baseUrl,
      active_workspace_id: this.activeWorkspaceId,
      active_workspace_name: this.activeWorkspaceName,
      user: this.user,
    };
  }
}

/**
 * Atomically write JSON: write to a sibling temp file with 0600 mode, then
 * rename onto the target. POSIX `rename(2)` is atomic on the same filesystem.
 */
function lockedSaveJson(target: string, data: unknown): void {
  const dir = path.dirname(path.resolve(target));
  fs.mkdirSync(dir, { mode: 0o700, recursive: true });
  try {
    fs.chmodSync(dir, 0o700);
  } catch {
    /* best-effort */
  }

  const tmp = `${target}.tmp.${process.pid}.${Date.now()}`;
  // O_WRONLY | O_CREAT | O_EXCL with 0600 — refuses to overwrite existing tmp.
  const fd = fs.openSync(tmp, "wx", 0o600);
  try {
    fs.writeSync(fd, JSON.stringify(data, null, 2));
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  try {
    fs.chmodSync(tmp, 0o600);
  } catch {
    /* best-effort */
  }
  fs.renameSync(tmp, target);
}

export function loadConfig(): Config {
  const p = configPath();
  if (!fs.existsSync(p)) {
    return new Config();
  }
  let raw: any;
  try {
    raw = JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch (e) {
    throw new ConfigError(
      `Config file at ${p} is corrupt: ${(e as Error).message}`,
      { hint: "Delete it and run `auth:login` again." },
    );
  }
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new ConfigError(`Config file at ${p} must be a JSON object.`);
  }
  return new Config({
    apiKey: raw.api_key ?? null,
    baseUrl: raw.base_url ?? DEFAULT_BASE_URL,
    activeWorkspaceId: raw.active_workspace_id ?? null,
    activeWorkspaceName: raw.active_workspace_name ?? null,
    user: raw.user ?? {},
  });
}

export function saveConfig(cfg: Config): string {
  const p = configPath();
  lockedSaveJson(p, cfg.toJson());
  return p;
}

export function clearConfig(): string | null {
  const p = configPath();
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
    return p;
  }
  return null;
}
