# contentstudio

CLI for the [ContentStudio](https://contentstudio.io) public API — schedule
social-media posts, manage media, and audit your workspace from the terminal
or any AI agent (Claude Code, Cursor, OpenCode, Codex, …).

- Drives your **already-deployed ContentStudio account** over HTTPS — no local
  server needed.
- **Dual install path** for AI agents: `npm install -g contentstudio` (the CLI)
  + `npx skills add d4interactive/contentstudio-agent` (the skill).
- **JSON output mode** (`--json`) for stable, parseable agent integration.
- **`--dry-run`** on every mutation — preview the payload before sending.

## Install

```bash
# Install the CLI globally
npm install -g contentstudio
# or
pnpm install -g contentstudio
```

Verify:

```bash
contentstudio --version
contentstudio --help
```

## Install the skill (for AI agents)

If you're using an AI assistant — Claude Code, Cursor, OpenCode, Codex, Augment, IBM Bob, CodeBuddy, … — install the SKILL.md so the agent can drive this CLI on your behalf:

```bash
npx skills add d4interactive/contentstudio-agent
```

`npx skills` lets you pick which agents to install into; the SKILL.md gets dropped into each chosen agent's skill directory (e.g. `.claude/skills/`, `.cursor/skills/`).

## Quick start

```bash
# 1. Get an API key from ContentStudio Dashboard → Settings → API Keys
contentstudio auth:login --api-key cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 2. Pick a workspace
contentstudio workspaces:list
contentstudio workspaces:use <workspace_id>

# 3. List the social accounts connected in this workspace
contentstudio accounts:list --platform facebook

# 4. Create a draft post (safe — won't publish to social yet)
contentstudio posts:create \
  --content "Hello from contentstudio CLI" \
  --account <account_id> \
  --publish-type draft

# 5. Schedule a post 2 minutes from now (it will publish for real)
contentstudio posts:create \
  -c "Hello" \
  -i <account_id> \
  -t scheduled \
  -s "$(date -d '+2 minutes' '+%F %T')" \
  -m https://picsum.photos/400
```

## Commands

All commands use `<group>:<verb>` syntax.

| Group | Commands |
|-------|----------|
| `auth` | `auth:login`, `auth:logout`, `auth:whoami`, `auth:status` |
| `workspaces` | `workspaces:list`, `workspaces:use <id>`, `workspaces:current` |
| `accounts` | `accounts:list` |
| `campaigns` | `campaigns:list` |
| `categories` | `categories:list` |
| `labels` | `labels:list` |
| `team` | `team:list` |
| `media` | `media:list`, `media:upload --file ... \| --url ...` |
| `posts` | `posts:list`, `posts:create`, `posts:delete`, `posts:approve`, `posts:reject` |
| `comments` | `comments:list`, `comments:add` |

Run `contentstudio <group>:<verb> --help` for full options.

## Output modes

```bash
# Default — human-friendly tables / colored status lines
contentstudio posts:list --per-page 5

# Agent / scripting — JSON envelope
contentstudio --json posts:list --per-page 5
# → {"ok": true, "data": [...]}
```

Error envelope:
```json
{"ok": false, "error": {"type": "AuthError", "message": "...", "http_status": 401, "hint": "Run `contentstudio auth:login ...`."}}
```

## Configuration

Stored at:
```
$XDG_CONFIG_HOME/contentstudio/config.json
# falls back to ~/.config/contentstudio/config.json
```
(file mode 0600, dir 0700 — never world-readable).

Per-call env-var overrides:

| Env var | Overrides |
|---------|-----------|
| `CONTENTSTUDIO_API_KEY` | `api_key` |
| `CONTENTSTUDIO_BASE_URL` | `base_url` (default `https://api.contentstudio.io/api/v1`) |
| `CONTENTSTUDIO_WORKSPACE_ID` | `active_workspace_id` |
| `CONTENTSTUDIO_CONFIG_PATH` | path to `config.json` itself |

## Dry-run

Every mutating command supports `--dry-run`. It prints the body that would be POSTed, then exits without hitting the API:

```bash
contentstudio --json posts:create --dry-run -c "test" -i 1234 -t draft
contentstudio --json posts:delete <post_id> --dry-run
contentstudio --json comments:add <post_id> "internal note" --note --dry-run
contentstudio --json media:upload --url https://example.com/img.jpg --dry-run
```

## Posts — full body via `--body`

For platform-specific options (TikTok privacy, YouTube category, GMB topic_type, approval workflow, first comment, labels, campaigns, …) write a JSON body and pass `--body`:

```bash
cat > /tmp/post.json <<'JSON'
{
  "content": {
    "text": "Hello",
    "media": {"images": ["https://example.com/img.jpg"]}
  },
  "accounts": ["<account_id>"],
  "scheduling": {"publish_type": "scheduled", "scheduled_at": "2026-05-01 10:00:00"},
  "first_comment": {"message": "🔗 in bio", "accounts": ["<account_id>"]},
  "approval": {"approvers": ["<user_id>"], "approve_option": "anyone"}
}
JSON

contentstudio --json posts:create --body /tmp/post.json
```

Full schema lives in [`SKILL.md`](./SKILL.md).

## Tests

```bash
# Unit tests — no network
npm test

# With real API E2E (env-gated)
CONTENTSTUDIO_API_KEY=cs_... \
CONTENTSTUDIO_WORKSPACE_ID=... \
npm test
```

## Security

- API keys live in `~/.config/contentstudio/config.json` with mode `0600`.
- Keys are never echoed in CLI output (only a redacted prefix via `auth:status`).
- The `--json` error envelope never includes the key.

## License

MIT — see [LICENSE](./LICENSE).
