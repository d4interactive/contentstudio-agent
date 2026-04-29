import type { Argv } from "yargs";

import { Client, listWorkspaces } from "../api";
import { loadConfig, saveConfig } from "../config";
import * as out from "../output";
import { buildClient, run } from "../cliCtx";

export function registerWorkspaces<T>(yargs: Argv<T>): Argv<T> {
  return yargs
    .command(
      "workspaces:list",
      "List workspaces visible to the authenticated user.",
      (y) =>
        y
          .option("page", { type: "number" })
          .option("per-page", { type: "number" }),
      run(async (argv: any, g) => {
        const { client } = buildClient(g);
        const resp = await listWorkspaces(client, {
          page: argv.page,
          per_page: argv["per-page"] ?? argv.perPage,
        });
        const items = (resp.data as any[]) ?? [];
        out.emitSuccess(
          resp.data,
          g,
          () =>
            out.table(
              ["ID", "Name", "Slug", "Timezone"],
              items.map((w) => [
                w._id ?? "-",
                w.name ?? "-",
                w.slug ?? "-",
                w.timezone ?? "-",
              ]),
            ),
          { pagination: resp.pagination },
        );
      }),
    )
    .command(
      "workspaces:use <workspace_id>",
      "Set the active workspace ID (persisted in config.json).",
      (y) => y.positional("workspace_id", { type: "string", demandOption: true }),
      run(async (argv: any, g) => {
        const cfg = loadConfig();
        let name: string | null = null;
        try {
          cfg.requireApiKey();
          const client = new Client(cfg);
          const list = await listWorkspaces(client, { per_page: 100 });
          const items = (list.data as any[]) ?? [];
          const hit = items.find((w) => w._id === argv.workspace_id);
          if (hit) name = hit.name ?? null;
        } catch {
          /* best-effort name lookup */
        }
        cfg.activeWorkspaceId = argv.workspace_id;
        cfg.activeWorkspaceName = name;
        const path = saveConfig(cfg);
        const data = {
          active_workspace_id: cfg.activeWorkspaceId,
          active_workspace_name: cfg.activeWorkspaceName,
          config_path: path,
        };
        out.emitSuccess(data, g, (d) =>
          out.success(
            `Active workspace set to ${d.active_workspace_id}` +
              (d.active_workspace_name ? ` (${d.active_workspace_name})` : ""),
          ),
        );
      }),
    )
    .command(
      "workspaces:current",
      "Show the currently active workspace.",
      (y) => y,
      run(async (_argv, g) => {
        const cfg = loadConfig();
        const data = {
          active_workspace_id: cfg.effectiveWorkspaceId(),
          active_workspace_name: cfg.activeWorkspaceName,
        };
        out.emitSuccess(data, g, (d) => {
          out.status("Workspace ID", d.active_workspace_id ?? "(none)");
          out.status("Name", d.active_workspace_name ?? "-");
        });
      }),
    );
}
