import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import { useMemo } from "react";

import { TableCell } from "@/components/ui/table";
import { serviceProviders, type ServiceMapping, type ServiceProvider } from "@/data/services";
import {
  getProviderFromSearchQuery,
  searchServiceIndex,
  type ServiceSearchIndex,
} from "@/lib/service-search";
import { appPath } from "@/lib/site-paths";
import { cn } from "@/lib/utils";

const serviceTableFeatures = tableFeatures({});
const serviceColumnHelper = createColumnHelper<typeof serviceTableFeatures, ServiceMapping>();

interface ServicesTableTranslations {
  categoryColumn: string;
  awsColumn: string;
  azureColumn: string;
  gcpColumn: string;
  oracleColumn: string;
  cloudflareColumn: string;
  descriptionColumn: string;
  filteredResults: (count: number) => string;
}

/** Props for the services catalog table. */
interface ServicesTableProps {
  /** Localized labels used by the table. */
  translations: ServicesTableTranslations;
  /** Language used for category and description content. */
  currentLang: "en" | "es";
  /** Optional search query reserved for the future search UI. */
  searchQuery?: string;
  /** Search index generated from the static catalog at build time. */
  searchIndex: ServiceSearchIndex;
}

interface ProviderHeaderProps {
  label: string;
  iconPath: string;
  darkIconPath?: string;
}

const providerHeaderIcons = {
  aws: appPath("/icons/aws.svg"),
  awsDark: appPath("/icons/aws-dark.svg"),
  azure: appPath("/icons/azure.svg"),
  gcp: appPath("/icons/gcp.svg"),
  oracle: appPath("/icons/ocl.svg"),
  cloudflare: appPath("/icons/cloudflare.svg"),
} as const;

/** Renders a compact provider label with its lightly colored brand icon. */
function ProviderHeader({ label, iconPath, darkIconPath }: ProviderHeaderProps) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <img
        src={iconPath}
        alt=""
        aria-hidden="true"
        className={cn("size-3.5 object-contain", darkIconPath && "dark:hidden")}
        loading="lazy"
      />
      {darkIconPath ? (
        <img
          src={darkIconPath}
          alt=""
          aria-hidden="true"
          className="hidden size-3.5 object-contain dark:block"
          loading="lazy"
        />
      ) : null}
      <span>{label}</span>
    </span>
  );
}

/** Renders a service name as a provider documentation link when one exists. */
function ServiceLink({ name, url }: { name: string; url?: string }) {
  const isUnavailable = name === "—";

  if (isUnavailable) {
    return <span className="text-muted-foreground/45">—</span>;
  }

  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-dotted underline-offset-4 transition-colors hover:text-foreground hover:decoration-solid"
      >
        {name}
      </a>
    );
  }

  return <span>{name}</span>;
}

/** Builds the stable TanStack column definitions for the services catalog. */
function createServiceColumns(
  currentLang: "en" | "es",
  translations: ServicesTableTranslations,
  selectedProvider?: ServiceProvider,
) {
  const allColumns = serviceColumnHelper.columns([
    serviceColumnHelper.accessor((row) => row.categoryName[currentLang], {
      id: "category",
      header: translations.categoryColumn,
      cell: ({ getValue, row }) => (
        <div className="min-w-44">
          <div className="font-medium text-foreground">{getValue()}</div>
          <div className="mt-1 font-mono text-[11px] text-muted-foreground/75">
            {row.original.category}
          </div>
        </div>
      ),
    }),
    serviceColumnHelper.accessor("aws", {
      header: () => (
        <ProviderHeader
          label={translations.awsColumn}
          iconPath={providerHeaderIcons.aws}
          darkIconPath={providerHeaderIcons.awsDark}
        />
      ),
      cell: ({ getValue, row }) => <ServiceLink name={getValue()} url={row.original.awsUrl} />,
    }),
    serviceColumnHelper.accessor("azure", {
      header: () => (
        <ProviderHeader label={translations.azureColumn} iconPath={providerHeaderIcons.azure} />
      ),
      cell: ({ getValue, row }) => <ServiceLink name={getValue()} url={row.original.azureUrl} />,
    }),
    serviceColumnHelper.accessor("gcp", {
      header: () => (
        <ProviderHeader label={translations.gcpColumn} iconPath={providerHeaderIcons.gcp} />
      ),
      cell: ({ getValue, row }) => <ServiceLink name={getValue()} url={row.original.gcpUrl} />,
    }),
    serviceColumnHelper.accessor("oracle", {
      header: () => (
        <ProviderHeader label={translations.oracleColumn} iconPath={providerHeaderIcons.oracle} />
      ),
      cell: ({ getValue, row }) => <ServiceLink name={getValue()} url={row.original.oracleUrl} />,
    }),
    serviceColumnHelper.accessor("cloudflare", {
      header: () => (
        <ProviderHeader
          label={translations.cloudflareColumn}
          iconPath={providerHeaderIcons.cloudflare}
        />
      ),
      cell: ({ getValue, row }) => (
        <ServiceLink name={getValue()} url={row.original.cloudflareUrl} />
      ),
    }),
    serviceColumnHelper.accessor((row) => row.description[currentLang], {
      id: "description",
      header: translations.descriptionColumn,
      cell: ({ getValue }) => <span className="text-muted-foreground">{getValue()}</span>,
    }),
  ]);

  if (!selectedProvider) {
    return allColumns;
  }

  const providerIndex = serviceProviders.findIndex(({ key }) => key === selectedProvider);

  return serviceColumnHelper.columns([
    allColumns[0],
    allColumns[providerIndex + 1],
    allColumns[allColumns.length - 1],
  ]);
}

/** Renders the dense, responsive services catalog using TanStack Table v9. */
export function ServicesTable({
  translations,
  currentLang,
  searchQuery = "",
  searchIndex,
}: ServicesTableProps) {
  const selectedProvider = getProviderFromSearchQuery(searchQuery);
  const columns = useMemo(
    () => createServiceColumns(currentLang, translations, selectedProvider),
    [currentLang, selectedProvider, translations],
  );
  const visibleServices = useMemo(
    () => searchServiceIndex(searchIndex, searchQuery).map(({ service }) => service),
    [searchIndex, searchQuery],
  );
  const table = useTable({
    features: serviceTableFeatures,
    data: visibleServices,
    columns,
  });

  return (
    <div className="catalog-scroll">
      {searchQuery.trim() ? (
        <output className="block border-b border-border bg-muted/20 px-4 py-2 text-[11px] text-muted-foreground sm:px-6">
          {translations.filteredResults(visibleServices.length)}
        </output>
      ) : null}
      <table
        className={cn("w-full border-collapse", selectedProvider ? "min-w-[42rem]" : "min-w-310")}
      >
        {selectedProvider ? (
          <colgroup>
            <col className="w-[28%]" />
            <col className="w-[32%]" />
            <col className="w-[40%]" />
          </colgroup>
        ) : (
          <colgroup>
            <col className="w-[16%]" />
            <col className="w-[13%]" />
            <col className="w-[13%]" />
            <col className="w-[13%]" />
            <col className="w-[13%]" />
            <col className="w-[13%]" />
            <col className="w-[19%]" />
          </colgroup>
        )}
        <thead className="bg-background">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className={cn(
                    "relative sticky top-0 z-10 h-10 bg-background px-3 text-left align-middle text-[13px] font-semibold tracking-widest text-muted-foreground uppercase after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-border sm:px-4",
                    header.index === 0 && "pl-4 sm:pl-6",
                  )}
                >
                  {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className="group border-b border-border/70 transition-colors hover:bg-muted/35"
            >
              {row.getAllCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  className={cn(
                    "max-w-65 px-3 py-2.5 align-top text-[15px] leading-5 whitespace-normal text-foreground sm:px-4",
                    cell.column.id === "category" && "pl-4 sm:pl-6",
                    cell.column.id === "description" && "pr-5",
                  )}
                >
                  <table.FlexRender cell={cell} />
                </TableCell>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
