---
name: contentstudio
description: ContentStudio is a tool to schedule social-media posts across Facebook, LinkedIn, Twitter/X, Instagram, YouTube, TikTok, Pinterest, and Google Business Profile. Use when the user wants to list/create/delete/approve posts, manage media, or audit workspaces, accounts, campaigns, labels, categories, or team-members on their ContentStudio account.
homepage: https://api.contentstudio.io/guide
metadata: {"openclaw":{"emoji":"📅","requires":{"bins":["contentstudio"],"env":["CONTENTSTUDIO_API_KEY"]}}}
---

## Install ContentStudio CLI if it doesn't exist

```bash
npm install -g contentstudio
# or
pnpm install -g contentstudio
```

npm release: https://www.npmjs.com/package/contentstudio
contentstudio-agent github: https://github.com/d4interactive/contentstudio-agent
contentstudio API docs: https://api.contentstudio.io/api-docs
official website: https://contentstudio.io

---

| Property | Value |
|----------|-------|
| **name** | contentstudio |
| **description** | Social-media automation CLI for scheduling posts and managing media/accounts via the ContentStudio public API |
| **allowed-tools** | Bash(contentstudio:*) |

---

## ⚠️ Authentication Required

**You MUST authenticate before running any contentstudio CLI command.** All commands will fail without a valid API key.

Before doing anything else, check auth status:

```bash
contentstudio auth:status
```

If `has_api_key` is `false`, ask the user for their ContentStudio API key. They can generate one from **ContentStudio Dashboard → Settings → API Keys**. Then:

```bash
contentstudio auth:login --api-key cs_...
```

Then verify a workspace is selected:

```bash
contentstudio --json workspaces:current
```

If `active_workspace_id` is `null`, list workspaces and ask the user to pick one:

```bash
contentstudio --json workspaces:list
contentstudio workspaces:use <workspace_id>
```

---

## Invocation rules for agents

- **Always pass `--json` before the subcommand** for stable, parseable output.
- **Envelope shape**:
  - Success: `{"ok": true, "data": <payload>}`
  - Error:   `{"ok": false, "error": {"type": "<ErrorType>", "message": "...", "http_status": <int>, "hint": "..."}}`
- **Exit codes** are non-zero on error. Check both `returncode` and `ok`.
- **Parse stdout only** — human messages go to stderr.
- **Before any mutating action (posts/comments/media), run it with `--dry-run`** first to verify the payload is correct. `--dry-run` never touches the API.

---

## Command Reference

All commands are invoked as `contentstudio <group>:<command>`.

### Authentication

| Command | Purpose |
|---------|---------|
| `auth:login --api-key cs_...` | Store and verify API key |
| `auth:logout` | Forget stored credentials |
| `auth:whoami` | Hit `/me` and return user info |
| `auth:status` | Show local config (key redacted) |

### Workspaces

| Command | Purpose |
|---------|---------|
| `workspaces:list` | List user's workspaces |
| `workspaces:use <id>` | Set active workspace |
| `workspaces:current` | Show active workspace |

### Social accounts (read)

| Command | Purpose |
|---------|---------|
| `accounts:list [--platform <p>] [--search <q>]` | List connected social accounts |

`--platform` values: `facebook`, `linkedin`, `twitter`, `instagram`, `youtube`, `tiktok`, `pinterest`, `gmb`.

### Posts

| Command | Purpose |
|---------|---------|
| `posts:list [--status draft\|scheduled\|...] [--date-from] [--date-to]` | List posts |
| `posts:create -c "text" -i <account> -t <publish_type> [-s "YYYY-MM-DD HH:MM:SS"] [-m <image_url>]` | Create a post (shortcut mode) |
| `posts:create --body /path/to/body.json` | Create a post with full JSON body |
| `posts:delete <post_id> [--delete-from-social]` | Delete a post |
| `posts:approve <post_id> [--comment "..."]` | Approve a pending post |
| `posts:reject <post_id> [--comment "..."]` | Reject a pending post |

`-t / --publish-type` values: `draft`, `scheduled`, `queued`, `content_category`.

### Comments / Internal notes

| Command | Purpose |
|---------|---------|
| `comments:list <post_id>` | List comments on a post |
| `comments:add <post_id> "message" [--note] [--mention <user_id>]` | Add public comment or internal note |

### Media library

| Command | Purpose |
|---------|---------|
| `media:list [--type images\|videos] [--sort recent\|...]` | List media assets |
| `media:upload --file <local_path>` | Upload a local file |
| `media:upload --url <external_url>` | Import from external URL |

### Lookup tables

| Command | Purpose |
|---------|---------|
| `campaigns:list` | List campaigns (folders) |
| `categories:list` | List content categories |
| `labels:list` | List labels |
| `team:list` | List workspace team members |

---

## Examples

### Verify the stored key is valid

```bash
contentstudio --json auth:whoami
# → {"ok": true, "data": {"_id": "...", "email": "...", "full_name": "..."}}
```

### Find a Facebook account to post to

```bash
contentstudio --json accounts:list --platform facebook --per-page 10
# Pick an _id, e.g. <account_id>
```

### Safely preview a post before creating it

```bash
contentstudio --json posts:create --dry-run \
  -c "Our new blog is live! https://example.com/post" \
  -i <account_id> \
  -t scheduled \
  -s "2026-05-01 10:00:00" \
  -m https://example.com/hero.jpg
# Returns: {"ok": true, "data": {"dry_run": true, "endpoint": "...", "body": {...}}}
```

### Actually create the post (drop --dry-run)

```bash
contentstudio --json posts:create \
  -c "Our new blog is live!" \
  -i <account_id> \
  -t draft
```

### Create a post with a complex body (platform options, approval workflow)

Write a JSON body and pass via `--body`:

```jsonc
{
  "content": {
    "text": "Hello world",
    "media": {"images": ["https://example.com/img.jpg"]}
  },
  "accounts": ["<account_id>"],
  "scheduling": {
    "publish_type": "scheduled",
    "scheduled_at": "2026-05-01 10:00:00"
  },
  "first_comment": {"message": "🔗 link in bio", "accounts": ["<account_id>"]},
  "labels": ["<label_id>"],
  "campaign_id": "<campaign_id>",
  "approval": {
    "approvers": ["<user_id>"],
    "approve_option": "anyone",
    "notes": "please review"
  }
}
```

```bash
contentstudio --json posts:create --body /tmp/post.json
```

### List recent draft posts

```bash
contentstudio --json posts:list --status draft --per-page 5
```

### Delete a post (and from social)

```bash
contentstudio --json posts:delete <post_id> --delete-from-social
```

### Add an internal note on a post (private)

```bash
contentstudio --json comments:add <post_id> "Double-check the link" --note
```

### Override workspace for a single call

```bash
contentstudio --json --workspace <other_ws_id> posts:list --per-page 3
```

---

## Error handling

| `error.type` | `http_status` | Typical hint |
|--------------|---------------|--------------|
| `AuthError` | 401, 403 | Run `auth:login` with a valid key. |
| `NotFoundError` | 404 | The resource doesn't exist or isn't in this workspace. |
| `ValidationError` | 422 | Flattened Laravel-style field errors from the API. |
| `RateLimitError` | 429 | Wait a moment and retry. |
| `BackendError` | 5xx or network | Retry after a short backoff. |
| `ConfigError` | — (local) | Missing API key / workspace; run `auth:login` or pass flags. |

---

## When NOT to use this skill

- The user is asking about running their own ContentStudio backend (Laravel source); this CLI only talks to the deployed API.
- Tasks not exposed by the v1 API (e.g., billing changes, first-time social account connection — those happen in the ContentStudio web UI).

---

## Version

1.0.0
