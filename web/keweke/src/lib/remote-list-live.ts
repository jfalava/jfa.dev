import {
  listLiveMessageSchema,
  type ListSnapshot,
  type LiveListMutation,
} from "@jfa.dev/common/lists";

import { appPath } from "@/lib/site-paths";

export type RemoteListLiveHandlers = {
  onSnapshot: (snapshot: ListSnapshot) => void;
  onMutation: (mutation: LiveListMutation, appliedAt: string) => void;
  onDeleted: () => void;
  onOpen?: () => void;
  onClose?: () => void;
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
  webSocket.addEventListener("close", () => handlers.onClose?.());
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

    const message = listLiveMessageSchema.safeParse(value);
    if (!message.success) {
      return;
    }

    if (message.data.type === "snapshot") {
      handlers.onSnapshot(message.data.snapshot);
    } else if (message.data.type === "mutation") {
      handlers.onMutation(message.data.mutation, message.data.appliedAt);
    } else {
      handlers.onDeleted();
    }
  });

  return webSocket;
}
