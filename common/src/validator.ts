import * as Schema from "effect/Schema";

/**
 * Structural contract TanStack Start accepts as a server-function validator
 * (`ValidatorAdapter`): `types` declares the call-site input/output types and
 * `parse` runs server-side, throwing on invalid input like the previous zod
 * validators did.
 */
interface EffectValidator<S extends Schema.Codec<unknown, unknown>> {
  readonly types: {
    readonly input: Schema.Codec.Encoded<S>;
    readonly output: S["Type"];
  };
  // `parse` is the I/O boundary itself: TanStack hands over raw deserialized
  // input and the Effect schema decodes it.
  // oxlint-disable-next-line anti-slop/no-unknown-parameters
  readonly parse: (input: unknown) => S["Type"];
}

export function effectValidator<S extends Schema.Codec<unknown, unknown>>(
  schema: S,
): EffectValidator<S> {
  return {
    // SAFETY: TanStack reads `types` only for static inference at call sites;
    // the runtime values are never used, so `never` placeholders are safe.
    types: {
      input: undefined as never,
      output: undefined as never,
    },
    parse: Schema.decodeUnknownSync(schema),
  };
}
