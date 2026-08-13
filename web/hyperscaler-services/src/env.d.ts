/**
 * Runtime type for Cloudflare environment.
 */
type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

declare namespace App {
  /**
   * App locals interface extending Cloudflare runtime.
   */
  interface Locals extends Runtime {}
}
