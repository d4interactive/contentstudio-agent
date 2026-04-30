/**
 * Facebook helper commands (added v1.0.3).
 *
 *   facebook:text-backgrounds    — list FB colored-background presets
 *                                  accepted by facebook_options.facebook_background_id
 *                                  on POST /posts.
 */

import type { Argv } from "yargs";

import { listFacebookTextBackgrounds } from "../api";
import * as out from "../output";
import { buildClient, run } from "../cliCtx";

export function registerFacebook<T>(yargs: Argv<T>): Argv<T> {
  return yargs.command(
    "facebook:text-backgrounds",
    "List Facebook text-post background presets (used in facebook_options.facebook_background_id).",
    (y) => y,
    run(async (_argv, g) => {
      const { client } = buildClient(g);
      const data: any = await listFacebookTextBackgrounds(client);
      const items = (Array.isArray(data) ? data : []) as any[];
      out.emitSuccess(data, g, () =>
        out.table(
          ["ID", "Type", "Category", "Description"],
          items.map((b) => [
            String(b.id ?? "-"),
            b.type ?? "-",
            b.category ?? "-",
            b.description ?? "-",
          ]),
        ),
      );
    }),
  );
}
