/**
 * Output rendering — JSON envelope (for agents) and human (chalk-formatted).
 */

import chalk from "chalk";

import { ContentStudioError } from "./errors";

export interface CliContext {
  useJson: boolean;
}

/**
 * Render a successful command result.
 *
 * In JSON mode: writes `{"ok": true, "data": ...}` to stdout.
 * In human mode: calls `human(data)` if provided, else pretty-prints JSON.
 */
export function emitSuccess<T>(
  data: T,
  ctx: CliContext,
  human?: (data: T) => void,
): void {
  if (ctx.useJson) {
    process.stdout.write(JSON.stringify({ ok: true, data }, null, 2));
    process.stdout.write("\n");
    return;
  }
  if (human) {
    human(data);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

/**
 * Render an error and return the exit code the CLI should use.
 */
export function emitError(e: unknown, ctx: CliContext): number {
  const exitCode = e instanceof ContentStudioError ? e.exitCode : 1;
  if (ctx.useJson) {
    let payload: Record<string, unknown>;
    if (e instanceof ContentStudioError) {
      payload = { ok: false, error: e.toDict() };
    } else if (e instanceof Error) {
      payload = { ok: false, error: { type: e.constructor.name, message: e.message } };
    } else {
      payload = { ok: false, error: { type: "Error", message: String(e) } };
    }
    process.stdout.write(JSON.stringify(payload, null, 2));
    process.stdout.write("\n");
  } else {
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write(`${chalk.red("Error:")} ${msg}\n`);
    if (e instanceof ContentStudioError && e.hint) {
      process.stderr.write(`${chalk.yellow("Hint:")} ${e.hint}\n`);
    }
  }
  return exitCode;
}

/**
 * Best-effort: ContentStudio envelopes are typically `{"data":[...]}`, but
 * after unwrap we may have a list or a dict with a nested list key.
 */
export function listish(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const k of ["items", "results", "posts", "accounts", "workspaces", "data"]) {
      if (Array.isArray(obj[k])) return obj[k] as unknown[];
    }
  }
  return [];
}

// ── small human-mode helpers (chalk-based, no external dep beyond chalk) ──

export function success(msg: string): void {
  console.log(`${chalk.green("✓")} ${msg}`);
}

export function info(msg: string): void {
  console.log(`${chalk.blue("●")} ${msg}`);
}

export function warning(msg: string): void {
  console.log(`${chalk.yellow("⚠")} ${msg}`);
}

export function status(label: string, value: string): void {
  console.log(`  ${chalk.dim(label + ":")} ${value}`);
}

export function section(title: string): void {
  console.log(`\n${chalk.bold(title)}\n${chalk.dim("─".repeat(Math.max(title.length, 12)))}`);
}

/**
 * Format a simple table without external deps. Auto-sizes columns.
 */
export function table(headers: string[], rows: string[][]): void {
  if (rows.length === 0) {
    console.log(chalk.dim("  (no rows)"));
    return;
  }
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => String(r[i] ?? "").length)),
  );
  const fmt = (cells: string[]) =>
    "  " + cells.map((c, i) => String(c ?? "").padEnd(widths[i])).join("  ");
  console.log(chalk.bold(fmt(headers)));
  console.log("  " + widths.map((w) => "─".repeat(w)).join("  "));
  for (const r of rows) console.log(fmt(r));
}
