"use client";

import { useEffect, useMemo, useState } from "react";
import { initializeSocket } from "@/utils/socket";

export type Presence = { isOnline: boolean; lastSeenAt: string | null };
export type PresenceMap = Record<string, Presence>;

type PresenceChange = {
  userId: string;
  isOnline: boolean;
  lastSeenAt: string | null;
};

/**
 * Live online/last-seen state for a specific set of users.
 *
 * Presence is subscription-based rather than broadcast: the socket is told which
 * users this screen is showing, and only those changes come back. The server
 * answers a subscription with a snapshot, so a screen that opens after someone
 * came online still renders the right state without its own fetch.
 *
 * `seed` carries whatever the list API already returned, so rows are correct on
 * first paint and the socket only has to deliver changes from then on.
 */
export function usePresence(userIds: string[], seed?: PresenceMap): PresenceMap {
  const [live, setLive] = useState<PresenceMap>({});

  // Sorted + joined so the effect re-runs when the *set* changes, not on every
  // render that happens to rebuild the array.
  const key = useMemo(
    () => [...new Set(userIds.filter(Boolean))].sort().join(","),
    [userIds],
  );

  useEffect(() => {
    if (!key) return;

    const socket = initializeSocket("default");
    if (!socket) return;

    const ids = key.split(",");

    const applyChange = (change: PresenceChange) => {
      if (!change?.userId) return;
      setLive((prev) => ({
        ...prev,
        [change.userId]: {
          isOnline: Boolean(change.isOnline),
          lastSeenAt: change.lastSeenAt ?? prev[change.userId]?.lastSeenAt ?? null,
        },
      }));
    };

    const applySnapshot = (snapshot: PresenceChange[]) => {
      if (!Array.isArray(snapshot)) return;
      setLive((prev) => {
        const next = { ...prev };
        for (const entry of snapshot) {
          if (!entry?.userId) continue;
          next[entry.userId] = {
            isOnline: Boolean(entry.isOnline),
            lastSeenAt: entry.lastSeenAt ?? prev[entry.userId]?.lastSeenAt ?? null,
          };
        }
        return next;
      });
    };

    const subscribe = () => socket.emit("watchPresence", { userIds: ids });

    subscribe();
    // Re-subscribe after a reconnect: rooms are per-connection, so the old
    // subscription is gone once the socket drops.
    socket.on("connect", subscribe);
    socket.on("presenceChanged", applyChange);
    socket.on("presenceSnapshot", applySnapshot);

    return () => {
      socket.off("connect", subscribe);
      socket.off("presenceChanged", applyChange);
      socket.off("presenceSnapshot", applySnapshot);
    };
  }, [key]);

  // Merged per field, not per user. A socket update is authoritative about
  // `isOnline`, but it does not always carry `lastSeenAt` — the subscription
  // snapshot never does — so replacing the whole entry wiped the timestamp the
  // conversation list had already supplied, and "last seen ..." vanished a
  // moment after it appeared.
  return useMemo(() => {
    const merged: PresenceMap = { ...(seed ?? {}) };
    for (const [id, value] of Object.entries(live)) {
      merged[id] = {
        isOnline: value.isOnline,
        lastSeenAt: value.lastSeenAt ?? merged[id]?.lastSeenAt ?? null,
      };
    }
    return merged;
  }, [seed, live]);
}

export default usePresence;
