import * as fs from "fs";
import type { Argv } from "yargs";

import { createPost, deletePost, listPosts, postApproval } from "../api";
import { ConfigError } from "../errors";
import * as out from "../output";
import { buildClient, resolveWorkspace, run } from "../cliCtx";

export function registerPosts<T>(yargs: Argv<T>): Argv<T> {
  return yargs
    .command(
      "posts:list",
      "List posts in the active workspace.",
      (y) =>
        y
          .option("status", {
            type: "string",
            array: true,
            describe: "Filter by status (repeatable).",
          })
          .option("date-from", { type: "string", describe: "YYYY-MM-DD" })
          .option("date-to", { type: "string", describe: "YYYY-MM-DD" })
          .option("page", { type: "number" })
          .option("per-page", { type: "number" }),
      run(async (argv: any, g) => {
        const { cfg, client } = buildClient(g);
        const wid = resolveWorkspace(cfg, g);
        const resp = await listPosts(client, wid, {
          status: argv.status as string[] | undefined,
          date_from: argv["date-from"] ?? argv.dateFrom,
          date_to: argv["date-to"] ?? argv.dateTo,
          page: argv.page,
          per_page: argv["per-page"] ?? argv.perPage,
        });
        const items = (resp.data as any[]) ?? [];
        out.emitSuccess(
          resp.data,
          g,
          () =>
            out.table(
              ["ID", "Status", "Scheduled", "Text"],
              items.map((p) => [
                String(p._id ?? p.id ?? "-"),
                p.status ?? "-",
                p.scheduled_at ?? p.publish_time ?? "-",
                shortText(p),
              ]),
            ),
          { pagination: resp.pagination },
        );
      }),
    )
    .command(
      "posts:create",
      "Create a post. Either --body <file.json> or shortcut flags --content/--account/--publish-type.",
      (y) =>
        y
          .option("body", {
            type: "string",
            describe: "Path to a JSON file with the full create-post body.",
          })
          .option("content", {
            alias: "c",
            type: "string",
            describe: "Shortcut: post text.",
          })
          .option("account", {
            alias: "i",
            type: "string",
            array: true,
            describe: "Shortcut: account ID(s) to post to. Repeatable.",
          })
          .option("publish-type", {
            alias: "t",
            type: "string",
            choices: ["scheduled", "draft", "queued", "content_category"],
            describe: "Shortcut: scheduling.publish_type.",
          })
          .option("scheduled-at", {
            alias: "s",
            type: "string",
            describe: "Shortcut: scheduling.scheduled_at (YYYY-MM-DD HH:MM:SS).",
          })
          .option("image-url", {
            alias: "m",
            type: "string",
            array: true,
            describe: "Shortcut: external image URL. Repeatable.",
          })
          .option("video-url", { type: "string" })
          .option("media-id", {
            type: "string",
            array: true,
            describe: "Shortcut: media-library ID. Repeatable.",
          })
          .option("post-type", { type: "string" })
          .option("dry-run", {
            type: "boolean",
            default: false,
            describe: "Print body that would be POSTed without calling the API.",
          }),
      run(async (argv: any, g) => {
        const { cfg, client } = buildClient(g);
        const wid = resolveWorkspace(cfg, g);
        let body: Record<string, unknown>;
        if (argv.body) {
          body = readJsonFile(argv.body, "--body");
        } else {
          if (
            !argv.content ||
            !argv.account ||
            !(argv.account as string[]).length ||
            !argv["publish-type"]
          ) {
            throw new ConfigError(
              "For shortcut mode, --content, --account (one or more), and --publish-type are required.",
              {
                hint:
                  "Or pass --body <file.json> with the full create-post payload.",
              },
            );
          }
          body = buildSimplePostBody({
            text: String(argv.content),
            accounts: argv.account as string[],
            publishType: String(argv["publish-type"]),
            scheduledAt: argv["scheduled-at"] ?? argv.scheduledAt,
            imageUrls: (argv["image-url"] ?? argv.imageUrl) as string[] | undefined,
            videoUrl: argv["video-url"] ?? argv.videoUrl,
            mediaIds: (argv["media-id"] ?? argv.mediaId) as string[] | undefined,
            postType: argv["post-type"] ?? argv.postType,
          });
        }

        if (argv["dry-run"] ?? argv.dryRun) {
          out.emitSuccess(
            {
              dry_run: true,
              endpoint: `POST /workspaces/${wid}/posts`,
              body,
            },
            g,
            () => {
              out.info(`DRY RUN — would POST /workspaces/${wid}/posts`);
              console.log(JSON.stringify(body, null, 2));
            },
          );
          return;
        }

        const data: any = await createPost(client, wid, body);
        out.emitSuccess(data, g, (d: any) => {
          out.success("Post created.");
          out.status("ID", String(d?.id ?? d?._id ?? d?.post_id ?? "-"));
          if (d?.post_url) out.status("URL", d.post_url);
        });
      }),
    )
    .command(
      "posts:delete <post_id>",
      "Delete a post.",
      (y) =>
        y
          .positional("post_id", { type: "string", demandOption: true })
          .option("delete-from-social", {
            type: "boolean",
            default: false,
            describe: "Also try to delete from social platforms.",
          })
          .option("account", {
            type: "string",
            array: true,
            describe: "Limit deletion to these account IDs.",
          })
          .option("dry-run", { type: "boolean", default: false }),
      run(async (argv: any, g) => {
        const { cfg, client } = buildClient(g);
        const wid = resolveWorkspace(cfg, g);
        const dfs = !!(argv["delete-from-social"] ?? argv.deleteFromSocial);
        const accounts = argv.account as string[] | undefined;
        const body: Record<string, unknown> = {};
        if (dfs) body.delete_from_social = true;
        if (accounts && accounts.length) body.account_ids = accounts;
        if (argv["dry-run"] ?? argv.dryRun) {
          out.emitSuccess(
            {
              dry_run: true,
              endpoint: `DELETE /workspaces/${wid}/posts/${argv.post_id}`,
              body,
            },
            g,
            () => {
              out.info(`DRY RUN — would DELETE post ${argv.post_id}`);
              console.log(JSON.stringify(body, null, 2));
            },
          );
          return;
        }
        const data = await deletePost(client, wid, String(argv.post_id), {
          deleteFromSocial: dfs,
          accountIds: accounts,
        });
        out.emitSuccess(data, g, () =>
          out.success(`Deleted post ${argv.post_id}`),
        );
      }),
    )
    .command(
      "posts:approve <post_id>",
      "Approve a post awaiting review.",
      (y) =>
        y
          .positional("post_id", { type: "string", demandOption: true })
          .option("comment", { type: "string" })
          .option("dry-run", { type: "boolean", default: false }),
      run(async (argv: any, g) => approvalHandler(argv, g, "approve")),
    )
    .command(
      "posts:reject <post_id>",
      "Reject a post awaiting review.",
      (y) =>
        y
          .positional("post_id", { type: "string", demandOption: true })
          .option("comment", { type: "string" })
          .option("dry-run", { type: "boolean", default: false }),
      run(async (argv: any, g) => approvalHandler(argv, g, "reject")),
    );
}

async function approvalHandler(
  argv: any,
  g: any,
  action: "approve" | "reject",
): Promise<void> {
  const { cfg, client } = buildClient(g);
  const wid = resolveWorkspace(cfg, g);
  const body: Record<string, unknown> = { action };
  if (argv.comment) body.comment = argv.comment;
  if (argv["dry-run"] ?? argv.dryRun) {
    out.emitSuccess(
      {
        dry_run: true,
        endpoint: `POST /workspaces/${wid}/posts/${argv.post_id}/approval`,
        body,
      },
      g,
      () => {
        out.info(`DRY RUN — would ${action} post ${argv.post_id}`);
        console.log(JSON.stringify(body, null, 2));
      },
    );
    return;
  }
  const data = await postApproval(
    client,
    wid,
    String(argv.post_id),
    action,
    argv.comment,
  );
  out.emitSuccess(data, g, () =>
    out.success(`${action[0].toUpperCase() + action.slice(1)}d post ${argv.post_id}`),
  );
}

function shortText(p: any, limit = 60): string {
  const text =
    p?.content?.text ?? p?.common?.content?.text ?? p?.text ?? p?.message ?? "";
  const flat = String(text).replace(/\n/g, " ").trim();
  return flat.length > limit ? flat.slice(0, limit - 1) + "…" : flat;
}

function readJsonFile(p: string, flagName: string): Record<string, unknown> {
  if (!fs.existsSync(p)) {
    throw new ConfigError(`${flagName}: file not found — ${p}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch (e) {
    throw new ConfigError(`${flagName}: invalid JSON — ${(e as Error).message}`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new ConfigError(
      `${flagName}: JSON must be an object — got ${typeof parsed}`,
    );
  }
  return parsed as Record<string, unknown>;
}

function buildSimplePostBody(opts: {
  text: string;
  accounts: string[];
  publishType: string;
  scheduledAt?: string;
  imageUrls?: string[];
  videoUrl?: string;
  mediaIds?: string[];
  postType?: string;
}): Record<string, unknown> {
  const content: Record<string, unknown> = { text: opts.text };
  const media: Record<string, unknown> = {};
  if (opts.imageUrls?.length) media.images = opts.imageUrls;
  if (opts.videoUrl) media.video = opts.videoUrl;
  if (opts.mediaIds?.length) media.media_ids = opts.mediaIds;
  if (Object.keys(media).length) content.media = media;
  const scheduling: Record<string, unknown> = { publish_type: opts.publishType };
  if (opts.scheduledAt) scheduling.scheduled_at = opts.scheduledAt;
  const body: Record<string, unknown> = {
    content,
    accounts: opts.accounts,
    scheduling,
  };
  if (opts.postType) body.post_type = opts.postType;
  return body;
}
