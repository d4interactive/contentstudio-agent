/**
 * Read-only "list" commands for accounts, campaigns, categories, labels,
 * team-members. Each is a one-liner over the corresponding API wrapper.
 */

import type { Argv } from "yargs";

import {
  listAccounts,
  listCampaigns,
  listContentCategories,
  listLabels,
  listTeamMembers,
} from "../api";
import * as out from "../output";
import { buildClient, resolveWorkspace, run } from "../cliCtx";

export function registerLookups<T>(yargs: Argv<T>): Argv<T> {
  return yargs
    .command(
      "accounts:list",
      "List social accounts in the active workspace.",
      (y) =>
        y
          .option("platform", {
            type: "string",
            describe:
              "Filter by platform (facebook, linkedin, twitter, instagram, youtube, tiktok, pinterest, gmb).",
          })
          .option("search", { type: "string" })
          .option("page", { type: "number" })
          .option("per-page", { type: "number" }),
      run(async (argv: any, g) => {
        const { cfg, client } = buildClient(g);
        const wid = resolveWorkspace(cfg, g);
        const data: any = await listAccounts(client, wid, {
          platform: argv.platform,
          search: argv.search,
          page: argv.page,
          per_page: argv["per-page"] ?? argv.perPage,
        });
        const items = out.listish(data) as any[];
        out.emitSuccess(data, g, () =>
          out.table(
            ["ID", "Platform", "Name", "Type"],
            items.map((a) => [
              String(a._id ?? a.platform_identifier ?? "-"),
              a.platform ?? a.channel ?? "-",
              a.account_name ?? a.name ?? a.username ?? "-",
              a.account_type ?? "-",
            ]),
          ),
        );
      }),
    )
    .command(
      "campaigns:list",
      "List campaigns (folders) in the active workspace.",
      (y) =>
        y
          .option("search", { type: "string" })
          .option("page", { type: "number" })
          .option("per-page", { type: "number" }),
      run(async (argv: any, g) => {
        const { cfg, client } = buildClient(g);
        const wid = resolveWorkspace(cfg, g);
        const data: any = await listCampaigns(client, wid, {
          search: argv.search,
          page: argv.page,
          per_page: argv["per-page"] ?? argv.perPage,
        });
        const items = out.listish(data) as any[];
        out.emitSuccess(data, g, () =>
          out.table(
            ["ID", "Name"],
            items.map((c) => [c._id ?? "-", c.name ?? "-"]),
          ),
        );
      }),
    )
    .command(
      "categories:list",
      "List content categories in the active workspace.",
      (y) =>
        y
          .option("search", { type: "string" })
          .option("page", { type: "number" })
          .option("per-page", { type: "number" }),
      run(async (argv: any, g) => {
        const { cfg, client } = buildClient(g);
        const wid = resolveWorkspace(cfg, g);
        const data: any = await listContentCategories(client, wid, {
          search: argv.search,
          page: argv.page,
          per_page: argv["per-page"] ?? argv.perPage,
        });
        const items = out.listish(data) as any[];
        out.emitSuccess(data, g, () =>
          out.table(
            ["ID", "Name"],
            items.map((c) => [c._id ?? "-", c.name ?? "-"]),
          ),
        );
      }),
    )
    .command(
      "labels:list",
      "List labels in the active workspace.",
      (y) =>
        y
          .option("search", { type: "string" })
          .option("page", { type: "number" })
          .option("per-page", { type: "number" }),
      run(async (argv: any, g) => {
        const { cfg, client } = buildClient(g);
        const wid = resolveWorkspace(cfg, g);
        const data: any = await listLabels(client, wid, {
          search: argv.search,
          page: argv.page,
          per_page: argv["per-page"] ?? argv.perPage,
        });
        const items = out.listish(data) as any[];
        out.emitSuccess(data, g, () =>
          out.table(
            ["ID", "Name"],
            items.map((l) => [l._id ?? "-", l.name ?? "-"]),
          ),
        );
      }),
    )
    .command(
      "team:list",
      "List team members of the active workspace.",
      (y) =>
        y
          .option("search", { type: "string" })
          .option("page", { type: "number" })
          .option("per-page", { type: "number" }),
      run(async (argv: any, g) => {
        const { cfg, client } = buildClient(g);
        const wid = resolveWorkspace(cfg, g);
        const data: any = await listTeamMembers(client, wid, {
          search: argv.search,
          page: argv.page,
          per_page: argv["per-page"] ?? argv.perPage,
        });
        const items = out.listish(data) as any[];
        out.emitSuccess(data, g, () =>
          out.table(
            ["ID", "Name", "Email", "Role"],
            items.map((t) => [
              t._id ?? t.user_id ?? "-",
              t.full_name ?? t.name ?? "-",
              t.email ?? "-",
              t.role ?? t.permission ?? "-",
            ]),
          ),
        );
      }),
    );
}
