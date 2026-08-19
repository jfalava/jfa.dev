import type { ListSnapshot, LiveListMutation } from "@jfa.dev/common/lists";
import { useCallback, useEffect, useRef, useState } from "react";

import { openRemoteListLiveSession } from "@/lib/remote-list-live";

export type RemoteListLiveStatus = "connecting" | "connected" | "disconnected";

export type RemoteListLiveHandlers = {
  onDeleted: () => void;
  onMutation: (mutation: LiveListMutation, appliedAt: string) => void;
  onSnapshot: (snapshot: ListSnapshot) => void;
};

export type RemoteListRefreshOutcome = "reconnected" | "failed";

export type RemoteListLiveSession = {
  refresh: () => Promise<RemoteListRefreshOutcome>;
  status: RemoteListLiveStatus;
};

const MAX_RECONNECT_DELAY_MS = 30_000;
const MANUAL_REFRESH_TIMEOUT_MS = 10_000;

function reconnectDelayMs(attempt: number): number {
  return Math.min(MAX_RECONNECT_DELAY_MS, 1_000 * 2 ** attempt);
}

/**
 * Opens and maintains the live WebSocket session for a remote list.
 *
 * The session reconnects automatically with exponential backoff after any
 * drop. `refresh` forces an immediate reconnection attempt (cancelling any
 * pending backoff wait) and resolves once that attempt either opens or fails,
 * so callers can surface the outcome to the user.
 *
 * A generation token invalidates async callbacks from superseded sockets so a
 * stale socket can never report state or schedule reconnects after it was
 * replaced (effect restart, manual refresh, or unmount).
 */
export function useRemoteListLiveSession(
  listId: string | undefined,
  handlers: RemoteListLiveHandlers,
): RemoteListLiveSession {
  const [status, setStatus] = useState<RemoteListLiveStatus>("connecting");
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const generationRef = useRef(0);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<number | undefined>(undefined);
  const webSocketRef = useRef<WebSocket | undefined>(undefined);
  const isDeletedRef = useRef(false);

  const connect = useCallback((): void => {
    if (!listId) {
      return;
    }
    const generation = generationRef.current;
    const webSocket = openRemoteListLiveSession(listId, {
      onOpen: () => {
        if (generation !== generationRef.current) {
          return;
        }
        reconnectAttemptRef.current = 0;
        setStatus("connected");
      },
      onSnapshot: (snapshot) => {
        if (generation === generationRef.current) {
          handlersRef.current.onSnapshot(snapshot);
        }
      },
      onMutation: (mutation, appliedAt) => {
        if (generation === generationRef.current) {
          handlersRef.current.onMutation(mutation, appliedAt);
        }
      },
      onDeleted: () => {
        if (generation !== generationRef.current) {
          return;
        }
        isDeletedRef.current = true;
        handlersRef.current.onDeleted();
      },
      onClose: () => {
        if (generation !== generationRef.current) {
          return;
        }
        setStatus("disconnected");
        if (isDeletedRef.current) {
          return;
        }
        reconnectTimerRef.current = window.setTimeout(
          connect,
          reconnectDelayMs(reconnectAttemptRef.current),
        );
        reconnectAttemptRef.current += 1;
      },
    });
    webSocketRef.current = webSocket;
  }, [listId]);

  const refresh = useCallback((): Promise<RemoteListRefreshOutcome> => {
    return new Promise((resolve) => {
      if (!listId) {
        resolve("failed");
        return;
      }

      if (reconnectTimerRef.current !== undefined) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = undefined;
      }
      reconnectAttemptRef.current = 0;

      // Supersede any in-flight socket so its late events cannot interfere.
      generationRef.current += 1;
      const previousSocket = webSocketRef.current;
      if (previousSocket && previousSocket.readyState !== WebSocket.CLOSED) {
        previousSocket.close(1000, "Manual refresh");
      }

      let settled = false;
      const settle = (outcome: RemoteListRefreshOutcome): void => {
        if (settled) {
          return;
        }
        settled = true;
        resolve(outcome);
      };

      const generation = generationRef.current;
      const webSocket = openRemoteListLiveSession(listId, {
        onOpen: () => {
          if (generation !== generationRef.current) {
            return;
          }
          reconnectAttemptRef.current = 0;
          setStatus("connected");
          settle("reconnected");
        },
        onSnapshot: (snapshot) => {
          if (generation === generationRef.current) {
            handlersRef.current.onSnapshot(snapshot);
          }
        },
        onMutation: (mutation, appliedAt) => {
          if (generation === generationRef.current) {
            handlersRef.current.onMutation(mutation, appliedAt);
          }
        },
        onDeleted: () => {
          if (generation !== generationRef.current) {
            return;
          }
          isDeletedRef.current = true;
          handlersRef.current.onDeleted();
          settle("failed");
        },
        onClose: () => {
          if (generation !== generationRef.current) {
            return;
          }
          setStatus("disconnected");
          settle("failed");
          if (isDeletedRef.current) {
            return;
          }
          reconnectTimerRef.current = window.setTimeout(
            connect,
            reconnectDelayMs(reconnectAttemptRef.current),
          );
          reconnectAttemptRef.current += 1;
        },
      });
      webSocketRef.current = webSocket;

      window.setTimeout(() => {
        settle(webSocket.readyState === WebSocket.OPEN ? "reconnected" : "failed");
      }, MANUAL_REFRESH_TIMEOUT_MS);
    });
  }, [connect, listId]);

  useEffect(() => {
    if (!listId) {
      setStatus("connecting");
      return undefined;
    }

    isDeletedRef.current = false;
    generationRef.current += 1;
    reconnectAttemptRef.current = 0;
    setStatus("connecting");
    connect();

    return () => {
      generationRef.current += 1;
      if (reconnectTimerRef.current !== undefined) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = undefined;
      }
      webSocketRef.current?.close(1000, "Leaving list");
    };
  }, [connect, listId]);

  return { refresh, status };
}
