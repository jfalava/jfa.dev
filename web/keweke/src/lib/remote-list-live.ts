import { listLiveMessageSchema, type ListSnapshot } from "@jfa.dev/common/lists";

import { appPath } from "@/lib/site-paths";

export type RemoteListLiveHandlers = {
  onSnapshot: (snapshot: ListSnapshot) => void;
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
    if (typeof event.data !== "string") {
      return;
    }

    let value: unknown;
    try {
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
    } else {
      handlers.onDeleted();
    }
  });

  return webSocket;
}
