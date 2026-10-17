import type { ApplyMutationResult, ListSnapshot } from "@jfa.dev/common/lists";

/** Creates and signs each command only after the preceding write has finished. */
export class ListCommandQueue {
  private tail: Promise<void> = Promise.resolve();
  private snapshots = new Map<string, ListSnapshot>();

  commit(
    snapshot: ListSnapshot,
    apply: (base: ListSnapshot) => Promise<ApplyMutationResult>,
  ): Promise<ApplyMutationResult> {
    this.remember(snapshot);
    const result = this.tail.then(async () => {
      const base = this.snapshots.get(snapshot.id) ?? snapshot;
      const response = await apply(base);
      if (response.status === "ok" || response.status === "conflict") {
        this.remember(response.snapshot);
      }
      return response;
    });
    // A failed request must not block subsequent commands or retry an uncertain write.
    this.tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private remember(snapshot: ListSnapshot): void {
    const known = this.snapshots.get(snapshot.id);
    if (!known || snapshot.revision >= known.revision) {
      this.snapshots.set(snapshot.id, snapshot);
    }
  }
}
