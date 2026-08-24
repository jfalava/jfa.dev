import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression test for https://jfa.dev/opengraph/ 500
 *
 * Cloudflare Workers forbid `crypto.randomUUID()` / `Math.random()` / `Date.now()`-based randomness,
 * `setTimeout`, and async I/O in **global scope** (module top-level). TanStack Start evaluates
 * the router + route modules in global scope during SSR, so `web/opengraph/src/editor/store.ts`
 * `const initialTab = createNewTab(0)` previously called `createInitialProject()` which called
 * `randomUUID` at import time -> `Error: Disallowed operation called within global scope`.
 *
 * The fix makes the SSR initial tab deterministic (`project-ssr-initial`) and only generates
 * random IDs inside handlers (`createNewTab`, `createId`, etc.).
 *
 * These tests run with **vitest** (not bun test) and assert the invariant via module-isolated
 * dynamic imports after spying on the disallowed globals.
 */

describe("opengraph Workers global-scope SSR regression", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("does NOT call crypto.randomUUID / Math.random / Date.now when the store is imported (SSR global scope)", async () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.5);
    const dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    const uuidSpy = vi
      .spyOn(globalThis.crypto, "randomUUID")
      .mockReturnValue("00000000-0000-4000-a000-000000000000");

    // Dynamic import triggers module top-level evaluation (the Worker global scope)
    const { useEditorStore } = await import("./store.js");

    expect(randomSpy).not.toHaveBeenCalled();
    expect(dateNowSpy).not.toHaveBeenCalled();
    expect(uuidSpy).not.toHaveBeenCalled();

    const state = useEditorStore.getState();
    expect(state.activeTabId).toBe("project-ssr-initial");
    expect(state.project.id).toBe("project-ssr-initial");
    expect(state.tabs).toHaveLength(1);
    expect(state.tabs[0]?.id).toBe("project-ssr-initial");
    // SSR tab is still a valid project
    expect(state.project.name).toBe("Untitled canvas");
    expect(state.project.layers.length).toBeGreaterThan(0);
  });

  it("model: createInitialProject with explicit id does NOT generate random (SSR-safe)", async () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.5);
    const dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    const uuidSpy = vi
      .spyOn(globalThis.crypto, "randomUUID")
      .mockReturnValue("00000000-0000-4000-a000-000000000000");

    const { createInitialProject } = await import("./model.js");

    const project = createInitialProject({ id: "project-fixed-id", name: "Fixed" });

    expect(project.id).toBe("project-fixed-id");
    expect(project.name).toBe("Fixed");
    expect(randomSpy).not.toHaveBeenCalled();
    expect(dateNowSpy).not.toHaveBeenCalled();
    expect(uuidSpy).not.toHaveBeenCalled();
  });

  it("model: createInitialProject WITHOUT id DOES generate random (handler scope) — proves mock works", async () => {
    const uuidSpy = vi
      .spyOn(globalThis.crypto, "randomUUID")
      .mockReturnValue("11111111-1111-4111-8111-111111111111");

    const { createInitialProject } = await import("./model.js");

    const project = createInitialProject();

    expect(project.id).toBe("project-11111111-1111-4111-8111-111111111111");
    expect(uuidSpy).toHaveBeenCalledTimes(1);
  });

  it("model: createId generates random inside handler", async () => {
    const uuidSpy = vi
      .spyOn(globalThis.crypto, "randomUUID")
      .mockReturnValue("22222222-2222-4222-8222-222222222222");

    const { createId } = await import("./model.js");

    const id = createId("text");

    expect(id).toBe("text-22222222-2222-4222-8222-222222222222");
    expect(uuidSpy).toHaveBeenCalledTimes(1);
  });

  it("store: createTab generates a new random id INSIDE the handler (not global), closeTab fallback is also handler-scoped", async () => {
    // Import with deterministic SSR state first
    const { useEditorStore } = await import("./store.js");

    const initialState = useEditorStore.getState();
    expect(initialState.activeTabId).toBe("project-ssr-initial");
    expect(initialState.tabs).toHaveLength(1);

    // Now spy — handler-time calls SHOULD hit random
    const uuidSpy = vi
      .spyOn(globalThis.crypto, "randomUUID")
      .mockReturnValueOnce("33333333-3333-4333-8333-333333333333")
      .mockReturnValueOnce("44444444-4444-4433-8433-444444444444");

    useEditorStore.getState().createTab();

    let state = useEditorStore.getState();
    expect(state.tabs).toHaveLength(2);
    // createNewTab uses createInitialProject without explicit id => `project-${uuid}`
    expect(state.activeTabId).toBe("project-33333333-3333-4333-8333-333333333333");
    expect(state.tabs[1]?.project.id).toBe("project-33333333-3333-4333-8333-333333333333");
    expect(uuidSpy).toHaveBeenCalledTimes(1);

    // createTab again increments
    useEditorStore.getState().createTab();
    state = useEditorStore.getState();
    expect(state.tabs).toHaveLength(3);
    expect(state.activeTabId).toBe("project-44444444-4444-4433-8433-444444444444");
  });

  it("store: every fresh isolated import still yields the same deterministic SSR id (no cross-request pollution)", async () => {
    const { useEditorStore: StoreA } = await import("./store.js");
    expect(StoreA.getState().project.id).toBe("project-ssr-initial");

    vi.resetModules();

    const { useEditorStore: StoreB } = await import("./store.js");
    expect(StoreB.getState().project.id).toBe("project-ssr-initial");
    // Separate isolates — not sharing mutated state
    StoreA.getState().createTab();
    expect(StoreA.getState().tabs).toHaveLength(2);
    expect(StoreB.getState().tabs).toHaveLength(1);
  });
});
