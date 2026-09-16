"use client";

import { useEffect, useRef } from "react";

/**
 * Calls a server action once after the page shows (count a view, mark
 * messages read). Doing it here rather than during server rendering keeps
 * link prefetching and bots from triggering it. Change `key` to run again.
 */
export function OnMount({ action }: { action: () => Promise<unknown> }) {
  const called = useRef(false);
  useEffect(() => {
    if (called.current) return;
    called.current = true;
    void action();
  }, [action]);
  return null;
}
