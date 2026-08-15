/**
 * Type definitions for cloud service comparison data.
 *
 * These types define structure of service data loaded from
 * /src/data/services.json. The JSON file can be replaced with an
 * API endpoint to fetch data from a database in future.
 */

/**
 * Text content available in multiple languages.
 */
export interface ServiceTranslations {
  en: string;
  es: string;
}

/**
 * Represents a mapping between equivalent cloud services across providers.
 *
 * Each service includes category information, service names from all
 * providers, and localized descriptions to help users understand
 * purpose and equivalence of services.
 */
export interface ServiceMapping {
  category: string;
  categoryName: ServiceTranslations;
  aws: string;
  awsUrl?: string;
  azure: string;
  azureUrl?: string;
  gcp: string;
  gcpUrl?: string;
  oracle: string;
  oracleUrl?: string;
  cloudflare: string;
  cloudflareUrl?: string;
  description: ServiceTranslations;
}

/** Providers supported by the catalog and their stable display labels. */
export const serviceProviders = [
  { key: "aws", label: "AWS" },
  { key: "azure", label: "Azure" },
  { key: "gcp", label: "GCP" },
  { key: "oracle", label: "Oracle" },
  { key: "cloudflare", label: "Cloudflare" },
] as const;

export type ServiceProvider = (typeof serviceProviders)[number]["key"];

type JsonValue = null | boolean | number | string | JsonObject | readonly JsonValue[];

interface JsonObject {
  readonly [key: string]: JsonValue;
}

function isRecord(value: JsonValue): value is JsonObject {
  return Object.prototype.toString.call(value) === "[object Object]";
}

function isString(value: JsonValue): value is string {
  return Object.prototype.toString.call(value) === "[object String]";
}

function hasStringProperties(value: JsonObject, properties: readonly string[]): boolean {
  return properties.every((property) => isString(value[property]));
}

function isServiceTranslations(value: JsonValue): value is JsonObject & ServiceTranslations {
  return isRecord(value) && hasStringProperties(value, ["en", "es"]);
}

function isOptionalString(value: JsonValue | undefined): value is string | undefined {
  return value === undefined || isString(value);
}

function isServiceMapping(value: JsonValue): value is JsonObject & ServiceMapping {
  if (!isRecord(value)) {
    return false;
  }

  const serviceProperties = ["category", "aws", "azure", "gcp", "oracle", "cloudflare"];
  const urlProperties = ["awsUrl", "azureUrl", "gcpUrl", "oracleUrl", "cloudflareUrl"];

  return (
    hasStringProperties(value, serviceProperties) &&
    isServiceTranslations(value.categoryName) &&
    urlProperties.every((property) => isOptionalString(value[property])) &&
    isServiceTranslations(value.description)
  );
}

/**
 * Fetch cloud service mappings from JSON file or API.
 *
 * Currently loads data from /public/services.json. This function
 * can be modified to fetch from a database API endpoint in future
 * without changing the consuming code.
 *
 * @param baseUrl - Base URL for fetching (e.g., Astro.url.origin)
 * @returns Promise resolving to array of service mappings
 *
 * @example
 * const services = await fetchServices(Astro.url.origin);
 * console.log(services.find(s => s.aws === 'EC2'));
 */
export async function fetchServices(baseUrl: string): Promise<ServiceMapping[]> {
  const response = await fetch(`${baseUrl}/services.json`);
  if (!response.ok) {
    throw new Error(`Failed to fetch services: ${response.statusText}`);
  }
  // SAFETY: The value is checked by isServiceMapping for every array element before it is returned.
  const data = JSON.parse(await response.text()) as JsonValue;

  if (!Array.isArray(data) || !data.every(isServiceMapping)) {
    throw new Error("Failed to fetch services: response has an invalid structure");
  }

  return data;
}

/**
 * Import services data from separate JSON files per category.
 * This is used in the React/SSR context.
 */
export async function importServices(): Promise<ServiceMapping[]> {
  // Import all JSON files statically to avoid bundling issues
  const [
    accountManagement,
    aiServices,
    bigData,
    businessIntelligence,
    communication,
    compute,
    containers,
    dataGovernance,
    dataIntegration,
    dataLake,
    dataMigration,
    dataWarehouse,
    database,
    generativeAi,
    governance,
    infrastructure,
    iot,
    machineLearning,
    messaging,
    monitoring,
    networking,
    security,
    storage,
  ] = await Promise.all([
    import("./account-management.json"),
    import("./ai-services.json"),
    import("./big-data.json"),
    import("./business-intelligence.json"),
    import("./communication.json"),
    import("./compute.json"),
    import("./containers.json"),
    import("./data-governance.json"),
    import("./data-integration.json"),
    import("./data-lake.json"),
    import("./data-migration.json"),
    import("./data-warehouse.json"),
    import("./database.json"),
    import("./generative-ai.json"),
    import("./governance.json"),
    import("./infrastructure.json"),
    import("./iot.json"),
    import("./machine-learning.json"),
    import("./messaging.json"),
    import("./monitoring.json"),
    import("./networking.json"),
    import("./security.json"),
    import("./storage.json"),
  ]);

  const allServices: ServiceMapping[] = [
    ...accountManagement.default,
    ...aiServices.default,
    ...bigData.default,
    ...businessIntelligence.default,
    ...communication.default,
    ...compute.default,
    ...containers.default,
    ...dataGovernance.default,
    ...dataIntegration.default,
    ...dataLake.default,
    ...dataMigration.default,
    ...dataWarehouse.default,
    ...database.default,
    ...generativeAi.default,
    ...governance.default,
    ...infrastructure.default,
    ...iot.default,
    ...machineLearning.default,
    ...messaging.default,
    ...monitoring.default,
    ...networking.default,
    ...security.default,
    ...storage.default,
  ];

  return allServices;
}
