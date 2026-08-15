import { z } from "zod";

const IDENTITY_ID_PATTERN = /^[a-z]{5}$/;

export const listIdentityIdSchema = z
  .string()
  .regex(IDENTITY_ID_PATTERN, "Expected a five-letter identity identifier")
  .transform((value) => value.toLowerCase());

export const listIdentitySchema = z.object({
  id: listIdentityIdSchema,
  username: z.string().trim().min(1).max(48).nullable(),
});

export type ListIdentity = z.infer<typeof listIdentitySchema>;
