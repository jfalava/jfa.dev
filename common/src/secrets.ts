import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as SchemaGetter from "effect/SchemaGetter";

/**
 * Secrets Store binding (`env.*.get()`), resolved to a trimmed string.
 * workerd exposes `.get` on the `SecretsStoreSecret` class prototype, so an
 * own-key `Schema.Struct` rejects a valid binding (`Missing key ... get`);
 * `in` sees prototype members, which is why the guard only checks membership
 * and the transform's try/catch tolerates a non-callable `get`.
 */
const secretBinding = Schema.ObjectKeyword.pipe(
  Schema.refine((value): value is { readonly get: () => Promise<string> } => "get" in value),
);

export const secretFromBinding = Schema.decodeTo<typeof Schema.String, typeof secretBinding>(
  Schema.String,
  {
    decode: SchemaGetter.transformEffect((binding) =>
      Effect.promise(async () => {
        try {
          // SAFETY: Secrets Store bindings are exactly `{ get(): Promise<string> }`;
          // a malformed binding throws and is treated as unavailable.
          return (await binding.get()).trim();
        } catch {
          return "";
        }
      }),
    ),
    encode: SchemaGetter.transform((value: string) => ({
      get: () => Promise.resolve(value),
    })),
  },
)(secretBinding);
