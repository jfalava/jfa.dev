import {
  listLiveMessageSchema,
  type ListSnapshot,
  type LiveListMutation,
} from "@jfa.dev/common/lists";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";

import { appPath } from "@/app/lib/site-paths";

export type RemoteListLiveHandlers = {
  onSnapshot: (snapshot: ListSnapshot) => void;
  onMutation: (mutation: LiveListMutation, appliedAt: string) => void;
  onDeleted: () => void;
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
};

export function openRemoteListLiveSession(
  listId: string,
  handlers: RemoteListLiveHandlers,
): WebSocket {
  const url = new URL(
    appPath(`/api/lists/${encodeURIComponent(listId)}/live`),
    window.location.href,
  );
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  const webSocket = new WebSocket(url);

  webSocket.addEventListener("open", () => handlers.onOpen?.());
  webSocket.addEventListener("close", (event) => handlers.onClose?.(event));
  webSocket.addEventListener("message", (event) => {
    if (Object.prototype.toString.call(event.data) !== "[object String]") {
      return;
    }

    let value: unknown;
    try {
      // SAFETY: The parsed WebSocket payload is validated by listLiveMessageSchema below.
      value = JSON.parse(event.data) as unknown;
    } catch {
      return;
    }

    const message = Schema.decodeUnknownResult(listLiveMessageSchema)(value);
    if (Result.isFailure(message)) {
      return;
    }

    if (message.success.type === "snapshot") {
      handlers.onSnapshot(message.success.snapshot);
    } else if (message.success.type === "mutation") {
      handlers.onMutation(message.success.mutation, message.success.appliedAt);
    } else {
      handlers.onDeleted();
    }
  });

  return webSocket;
}
