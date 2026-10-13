/**
 * Type declarations for untyped runtime dependencies.
 */

/**
 * `pluralize` ships no types. Only the singularising helpers that
 * `inventory-match` relies on are declared here.
 */
declare module "pluralize" {
  interface Pluralize {
    /** The singular form of `word`. */
    singular(word: string, inclusive?: boolean, replace?: boolean): string;
    /** The plural form of `word`. */
    plural(word: string, inclusive?: boolean, replace?: boolean): string;
    isSingular(word: string): boolean;
    isPlural(word: string): boolean;
    addPluralRule(rule: RegExp | string, replacement: string): void;
    addSingularRule(rule: RegExp | string, replacement: string): void;
  }

  const pluralize: Pluralize;
  export = pluralize;
}
