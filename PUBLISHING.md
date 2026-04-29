# Publishing — handoff steps

These steps require credentials (your npm + GitHub accounts).
Run them in order, from the root of this repository (`contentstudio-agent/`).

## 1. Create the GitHub repo (one-time)

```bash
# Replace <org> with your GitHub org/user (e.g. d4interactive)
gh repo create <org>/contentstudio-agent --public --source . --remote origin --push
# Or manually:
#   git init && git add . && git commit -m "Initial commit"
#   git remote add origin git@github.com:<org>/contentstudio-agent.git
#   git push -u origin main
```

If your org isn't `d4interactive`, also update three files to match:
- `package.json` → `repository.url`, `bugs.url`
- `.claude-plugin/plugin.json` → `repository`
- `README.md` → the `npx skills add d4interactive/contentstudio-agent` line

## 2. Tag the release

```bash
git tag v1.0.0
git push origin v1.0.0
gh release create v1.0.0 --title "v1.0.0" --notes-file CHANGELOG.md
```

## 3. Verify `npx skills add` works against your fresh repo

In a different directory:
```bash
cd /tmp && mkdir cs-skill-test && cd cs-skill-test
npx skills add <org>/contentstudio-agent
```
You'll be prompted for which agents to install into; pick at least one (e.g. Claude Code, Cursor) and confirm. The SKILL.md should land in the agent's skill directory.

## 4. Publish to npm

```bash
# One-time: log in to npm
npm login

# Publish
npm run build              # produces dist/index.js
npm publish --access public
```

Check the package page:
- https://www.npmjs.com/package/contentstudio-cli

## 5. Verify install from a clean machine / dir

```bash
# Throw away local install
npm uninstall -g contentstudio-cli 2>/dev/null

# Install from the npm registry
npm install -g contentstudio-cli

# Verify
which contentstudio          # → /usr/local/bin/contentstudio (or similar)
contentstudio --version
contentstudio --help
contentstudio auth:login --api-key cs_...
contentstudio --json auth:whoami
```

## 6. Optional — submit to skills marketplace / community indexes

- **awesome-claude-code-skills** (or similar curation lists) — open a PR with a one-line entry pointing at `<org>/contentstudio-agent`.
- **AI-skill / agent-CLI curation indexes** — you can list this skill in any community index once published.

## Changing the package name

If `contentstudio` ends up taken / clashes by the time you publish, swap in `package.json`:

```jsonc
{
  "name": "contentstudio-cli",     // ← change here
  "bin": {
    "contentstudio": "./dist/index.js"   // ← keep bin name (this is what users type)
  }
}
```

The `bin` field controls the command users type after install — keep it as `contentstudio` regardless of the package name.

## Re-publishing a fix

```bash
# Bump version (semver)
npm version patch          # 1.0.0 → 1.0.1
git push --follow-tags
npm run build
npm publish

# Update Claude plugin manifests too
# .claude-plugin/plugin.json    → "version"
# .claude-plugin/marketplace.json → metadata.version
# CHANGELOG.md
```
