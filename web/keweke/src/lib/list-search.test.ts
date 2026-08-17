import { describe, expect, test } from "bun:test";

import type { ListSummary } from "@jfa.dev/common/lists";

import { buildListSearchIndex, normalizeSearchText, searchListIndex } from "@/lib/list-search";

function createList(overrides: Partial<ListSummary>): ListSummary {
  return {
    id: "01900000-0000-7000-8000-000000000001",
    alias: "groceries-apple",
    title: "Groceries",
    itemCount: 0,
    completedCount: 0,
    deletedItemCount: 0,
    updatedAt: "2026-08-17T00:00:00.000Z",
    backend: "local",
    ...overrides,
  };
}

function search(query: string, lists: readonly ListSummary[]): ListSummary[] {
  return searchListIndex(buildListSearchIndex(lists), query).map(({ list }) => list);
}

describe("list search", () => {
  test("finds a list when the alias query contains a typo", () => {
    const lists = [
      createList({}),
      createList({
        id: "01900000-0000-7000-8000-000000000002",
        alias: "bookshelf-green",
        title: "Bookshelf",
      }),
    ];

    expect(search("groceres", lists).map((list) => list.alias)).toEqual(["groceries-apple"]);
  });

  test("ranks an exact alias match above fuzzy matches", () => {
    const lists = [
      createList({
        id: "01900000-0000-7000-8000-000000000002",
        alias: "storage-hanoi",
        title: "Storage",
      }),
      createList({
        id: "01900000-0000-7000-8000-000000000003",
        alias: "storages-kampala",
        title: "Storages",
      }),
    ];

    expect(search("storage", lists).map((list) => list.alias)).toEqual([
      "storage-hanoi",
      "storages-kampala",
    ]);
  });

  test("matches by list title too", () => {
    const lists = [
      createList({
        id: "01900000-0000-7000-8000-000000000002",
        alias: "garden-lima",
        title: "Garden",
      }),
      createList({ id: "01900000-0000-7000-8000-000000000003", alias: "work-oslo", title: "Work" }),
    ];

    expect(search("gardn", lists).map((list) => list.alias)).toEqual(["garden-lima"]);
  });

  test("skips lists without a title match when only their alias differs", () => {
    const lists = [
      createList({ id: "01900000-0000-7000-8000-000000000002", alias: null, title: "Fitness" }),
      createList({ id: "01900000-0000-7000-8000-000000000003", alias: null, title: "Reading" }),
    ];

    expect(search("fitness", lists).map((list) => list.title)).toEqual(["Fitness"]);
    expect(search("xyzzy", lists)).toEqual([]);
  });

  test("returns all lists for an empty query", () => {
    const lists = [createList({}), createList({ id: "01900000-0000-7000-8000-000000000002" })];

    expect(search("", lists).map((list) => list.id)).toEqual(lists.map((list) => list.id));
  });

  test("normalizes punctuation and diacritics", () => {
    expect(normalizeSearchText("  Groceries–applé!  ")).toBe("groceries apple");
  });
});
