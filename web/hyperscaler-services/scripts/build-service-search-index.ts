import { writeFile } from "node:fs/promises";

import { importServices } from "../src/data/services";
import { buildServiceSearchArtifact } from "../src/lib/service-search";

const services = await importServices();
const artifact = buildServiceSearchArtifact(services);
const outputUrl = new URL("../src/data/service-search-index.json", import.meta.url);

await writeFile(outputUrl, `${JSON.stringify(artifact)}\n`);
