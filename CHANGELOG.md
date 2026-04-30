# Changelog

## 1.0.3 — account connection commands

Added 5 new commands for managing social-account connections:

- **`platforms:list`** — list all 12+ platforms available for connection, with their `connection_method` (`oauth` / `credentials` / `manual`).
- **`accounts:connect <platform>`** — generate a one-time OAuth URL for connecting a new account; `--reconnect --account-id <id>` to refresh expired accounts.
- **`accounts:add-bluesky --handle <h> --app-password <p>`** — credential-based Bluesky add (no browser). Password is redacted in `--dry-run` output.
- **`accounts:add-facebook-group --name <n> [--image <url>]`** — manual Facebook Group connection.
- **`facebook:text-backgrounds`** — list Facebook colored-background presets used in `facebook_options.facebook_background_id` on plain-text posts.

All new commands support `--json` (mutations also support `--dry-run`).

## 1.0.2 — pagination metadata for AI agents

- All `*:list` commands now surface Laravel pagination metadata (`current_page`, `per_page`, `total`, `last_page`, `from`, `to`, `has_more`) in the JSON envelope as a sibling of `data`.
- Human-mode list commands now print a "Showing X–Y of TOTAL (page N/M)" footer with a hint to fetch more pages.
- SKILL.md updated with mandatory pagination rules for AI agents — when `pagination.has_more` is true, the agent must either ask the user, auto-paginate, or filter; never silently truncate.
- 4 new pagination unit tests; total now 47 unit + 9 E2E.

## 1.0.1 — expanded README

- Full README rewrite with platform-specific examples (FB / LinkedIn / Twitter / Instagram / YouTube / TikTok / Pinterest / GMB), common workflow scripts, API endpoints table, error handling table, quick reference, and development guide.
- No code changes — docs only.

## 1.0.0 — initial release

- All 15 endpoints of the ContentStudio v1 public API exposed as `<group>:<verb>` commands.
- Human + JSON output modes (`--json`).
- `--dry-run` on every mutating command (posts:create, posts:delete, posts:approve/reject, comments:add, media:upload).
- Persistent config at `~/.config/contentstudio/config.json` (0600 perms).
- Env-var overrides: `CONTENTSTUDIO_API_KEY`, `CONTENTSTUDIO_BASE_URL`, `CONTENTSTUDIO_WORKSPACE_ID`, `CONTENTSTUDIO_CONFIG_PATH`.
- Typed errors: `AuthError`, `NotFoundError`, `ValidationError`, `RateLimitError`, `BackendError`, `ConfigError`.
- Retry on `429` and `5xx` with exponential backoff.
- 52 tests passing — unit (errors, config, API, CLI) + real-API E2E.
- SKILL.md + `.claude-plugin/` manifests for `npx skills add` and Claude Code marketplace.
