import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { getStageConfig } from "./src/config";
import { defineWorkers } from "./src/workers";
import { guardedSecretsStoreHttpClient } from "./src/secrets-store-guard";

const state = Cloudflare.state();

export default Alchemy.Stack(
  "jfa-dev",
  {
    providers: Cloudflare.providers().pipe(
      Layer.provideMerge(guardedSecretsStoreHttpClient),
    ),
    state,
  },
  Effect.gen(function* () {
    const stage = yield* Alchemy.Stage;
    const config = getStageConfig(stage);
    const workers = yield* defineWorkers(config);

    return {
      stage: config.stage,
      workers: {
        router: workers.router.workerName,
        landing: workers.landing.workerName,
        opengraph: workers.opengraph.workerName,
        hyperscalerMounted: workers.hyperscalerMounted.workerName,
        kewekeMounted: workers.kewekeMounted.workerName,
        redirects: workers.redirects.workerName,
      },
    };
  }).pipe(Effect.provide(state)),
);
