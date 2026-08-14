import { createServerFn } from "@tanstack/react-start";
import { v7 as uuidv7 } from "uuid";

/** Issues a shareable list identifier without exposing any Worker binding. */
export const createListId = createServerFn({ method: "POST" }).handler(() => ({
  listId: uuidv7(),
}));
