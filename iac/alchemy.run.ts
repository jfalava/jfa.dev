import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Effect from "effect/Effect";

import { getStageConfig } from "./src/config";
import { defineWorkers } from "./src/workers";

export default Alchemy.Stack(
  "jfa-dev",
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
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
        ogImgGen: workers.ogImgGen.workerName,
        hyperscalerMounted: workers.hyperscalerMounted.workerName,
        kewekeMounted: workers.kewekeMounted.workerName,
        redirects: workers.redirects.workerName,
      },
    };
  }),
);
