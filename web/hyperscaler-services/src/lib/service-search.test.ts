import { describe, expect, test } from "bun:test";

import type { ServiceMapping } from "@/data/services";
import {
  buildServiceSearchArtifact,
  getProviderFromSearchQuery,
  hydrateServiceSearchIndex,
  searchServiceIndex,
  searchServices,
} from "@/lib/service-search";

function createService(overrides: Partial<ServiceMapping>): ServiceMapping {
  return {
    category: "compute",
    categoryName: "Compute",
    aws: "Amazon EC2",
    azure: "Azure Virtual Machines",
    gcp: "Compute Engine",
    oracle: "Compute",
    cloudflare: "Workers",
    description: "Virtual machines",
    ...overrides,
  };
}

describe("service search", () => {
  test("recognizes exact provider filters for the compact table view", () => {
    expect(getProviderFromSearchQuery("provider:AWS")).toBe("aws");
    expect(getProviderFromSearchQuery("provider:Azure")).toBe("azure");
    expect(getProviderFromSearchQuery("provider:aws services")).toBeUndefined();
  });

  test("finds category results when the query contains a typo", () => {
    const services = [
      createService({
        category: "storage",
        categoryName: "Storage",
        aws: "Amazon S3",
        description: "Object storage",
      }),
      createService({ aws: "Amazon EC2" }),
    ];

    expect(searchServices(services, "sroage").map(({ service }) => service.aws)).toEqual([
      "Amazon S3",
    ]);
  });

  test("keeps exact matches ahead of fuzzy matches", () => {
    const services = [
      createService({ aws: "Stroage Archive" }),
      createService({ aws: "Storage", category: "database" }),
    ];

    expect(searchServices(services, "storage").map(({ service }) => service.aws)).toEqual([
      "Storage",
      "Stroage Archive",
    ]);
  });

  test("applies fuzzy matching within a search scope", () => {
    const services = [
      createService({
        category: "storage",
        categoryName: "Storage",
        aws: "Amazon S3",
      }),
      createService({ aws: "Storage Gateway" }),
    ];

    expect(searchServices(services, "category:sroage").map(({ service }) => service.aws)).toEqual([
      "Amazon S3",
    ]);
  });

  test("hydrates a build-time artifact without changing fuzzy results", () => {
    const services = [
      createService({
        category: "storage",
        categoryName: "Storage",
        aws: "Amazon S3",
      }),
    ];
    // SAFETY: JSON serialization preserves the builder's JSON-safe shape; this test verifies hydration after that round trip.
    const artifact = JSON.parse(JSON.stringify(buildServiceSearchArtifact(services))) as ReturnType<
      typeof buildServiceSearchArtifact
    >;
    const searchIndex = hydrateServiceSearchIndex(services, artifact);

    expect(searchServiceIndex(searchIndex, "sroage").map(({ service }) => service.aws)).toEqual([
      "Amazon S3",
    ]);
  });
});
