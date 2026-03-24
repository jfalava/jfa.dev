#!/usr/bin/env node
/* eslint-disable */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

interface PackageInfo {
  name: string;
  currentVersion: string;
  latestVersion: string;
  outdated: boolean;
  catalog: string;
}

async function getLatestVersion(packageName: string): Promise<string> {
  try {
    const output = execSync(`pnpm view ${packageName} version`, {
      encoding: "utf8",
      stdio: "pipe",
    }).trim();
    return output;
  } catch (error) {
    console.error(`Failed to get latest version for ${packageName}:`, error);
    return "unknown";
  }
}

function parseVersion(version: string): string {
  return version.replace(/^["']?\^?~?/, "").replace(/["']$/, "");
}

function isOutdated(current: string, latest: string): boolean {
  const currentClean = parseVersion(current);
  const latestClean = parseVersion(latest);

  if (currentClean === "unknown" || latestClean === "unknown") return false;

  const currentParts = currentClean.split(".").map(Number);
  const latestParts = latestClean.split(".").map(Number);

  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const currentPart = currentParts[i] || 0;
    const latestPart = latestParts[i] || 0;

    if (latestPart > currentPart) return true;
    if (latestPart < currentPart) return false;
  }

  return false;
}

function sortObjectKeys(obj: Record<string, any>): Record<string, any> {
  const sorted: Record<string, any> = {};
  const keys = Object.keys(obj).sort();
  for (const key of keys) {
    sorted[key] = obj[key];
  }
  return sorted;
}

function prettifyPackageJson(filePath: string): void {
  try {
    const packageJson = JSON.parse(readFileSync(filePath, "utf8"));

    if (packageJson.dependencies) {
      packageJson.dependencies = sortObjectKeys(packageJson.dependencies);
    }

    if (packageJson.devDependencies) {
      packageJson.devDependencies = sortObjectKeys(packageJson.devDependencies);
    }

    if (packageJson.scripts) {
      packageJson.scripts = sortObjectKeys(packageJson.scripts);
    }

    writeFileSync(filePath, JSON.stringify(packageJson, null, 2) + "\n");
    console.log(`✨ Prettified ${filePath}`);
  } catch (error) {
    console.error(`Failed to prettify ${filePath}:`, error);
  }
}

function findAllPackageJsonFiles(dir: string): string[] {
  const files: string[] = [];

  try {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (
        entry.isDirectory() &&
        !entry.name.startsWith(".") &&
        entry.name !== "node_modules"
      ) {
        files.push(...findAllPackageJsonFiles(fullPath));
      } else if (entry.name === "package.json") {
        files.push(fullPath);
      }
    }
  } catch {
    // Ignore permission errors
  }

  return files;
}

/**
 * Parse pnpm-workspace.yaml to extract catalogs.
 * Handles both top-level "catalog:" and "catalogs:" sections.
 */
function parsePnpmWorkspaceYaml(content: string): { catalog?: Record<string, string>; catalogs?: Record<string, Record<string, string>> } {
  const lines = content.split('\n');
  const result: { catalog?: Record<string, string>; catalogs?: Record<string, string, Record<string, string>> } = {};
  let currentSection: string | null = null;
  let currentSubSection: string | null = null;
  let indentLevel = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Calculate indent level
    const leadingSpaces = line.length - line.trimStart().length;

    // Check for section headers (no indent or low indent)
    if (leadingSpaces === 0) {
      if (trimmed === 'catalog:') {
        result.catalog = {};
        currentSection = 'catalog';
        currentSubSection = null;
        continue;
      } else if (trimmed === 'catalogs:') {
        result.catalogs = {};
        currentSection = 'catalogs';
        currentSubSection = null;
        continue;
      } else if (trimmed.endsWith(':')) {
        // Some other section, reset
        currentSection = null;
        currentSubSection = null;
        continue;
      }
    }

    // Parse entries within catalog section
    if (currentSection === 'catalog' && leadingSpaces >= 2) {
      const match = trimmed.match(/^([^:]+):\s*["']?([^"']+)["']?$/);
      if (match) {
        result.catalog![match[1]] = match[2];
      }
    }

    // Parse entries within catalogs section
    if (currentSection === 'catalogs') {
      if (leadingSpaces === 2 && trimmed.endsWith(':')) {
        // Named catalog (e.g., "build:", "react-ui:")
        currentSubSection = trimmed.slice(0, -1);
        result.catalogs![currentSubSection] = {};
      } else if (currentSubSection && leadingSpaces >= 4) {
        // Package entry within named catalog
        const match = trimmed.match(/^([^:]+):\s*["']?([^"']+)["']?$/);
        if (match) {
          result.catalogs![currentSubSection][match[1]] = match[2];
        }
      }
    }
  }

  return result;
}

async function main() {
  const workspaceYamlPath = "./pnpm-workspace.yaml";
  const workspaceContent = readFileSync(workspaceYamlPath, "utf8");
  const { catalog, catalogs } = parsePnpmWorkspaceYaml(workspaceContent);

  const allCatalogPackages: PackageInfo[] = [];

  // Collect packages from default catalog
  if (catalog) {
    for (const [name, version] of Object.entries(catalog)) {
      allCatalogPackages.push({
        name,
        currentVersion: version,
        latestVersion: "",
        outdated: false,
        catalog: "default",
      });
    }
  }

  // Collect packages from named catalogs
  if (catalogs) {
    for (const [catalogName, packages] of Object.entries(catalogs)) {
      for (const [name, version] of Object.entries(packages)) {
        allCatalogPackages.push({
          name,
          currentVersion: version,
          latestVersion: "",
          outdated: false,
          catalog: catalogName,
        });
      }
    }
  }

  if (allCatalogPackages.length === 0) {
    console.log("❌ No catalogs found in pnpm-workspace.yaml");
    process.exit(1);
  }

  console.log(`🔍 Checking ${allCatalogPackages.length} catalog packages for updates...\n`);

  // Check each package for latest version
  for (const pkg of allCatalogPackages) {
    pkg.latestVersion = await getLatestVersion(pkg.name);
    pkg.outdated = isOutdated(pkg.currentVersion, pkg.latestVersion);
  }

  const outdatedPackages = allCatalogPackages.filter((pkg) => pkg.outdated);

  if (outdatedPackages.length === 0) {
    console.log("✅ All catalog packages are up to date!");
    return;
  }

  console.log(`📦 Found ${outdatedPackages.length} outdated package(s):\n`);

  outdatedPackages.forEach((pkg) => {
    const current = parseVersion(pkg.currentVersion);
    const latest = parseVersion(pkg.latestVersion);
    console.log(`${pkg.name}: ${current} → ${latest} (catalog: ${pkg.catalog})`);
  });

  console.log("\n🎨 Prettifying all package.json files...");
  const packageJsonFiles = findAllPackageJsonFiles(".");
  for (const file of packageJsonFiles) {
    prettifyPackageJson(file);
  }
  console.log(`✨ Prettified ${packageJsonFiles.length} package.json file(s)`);
}

main().catch(console.error);
