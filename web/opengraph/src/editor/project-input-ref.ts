export const projectInputRef = {
  // SAFETY: null is the initial empty ref before the input mounts; type widening is intentional for mutable ref
  current: null as HTMLInputElement | null,
} satisfies { current: HTMLInputElement | null };
