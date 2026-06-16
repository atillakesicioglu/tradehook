'use client';

import { useEffect, useRef } from 'react';
import { useSocket } from './use-socket';

/** Poll + socket — keeps prices/data fresh without full page reload. */
export function useLiveRefresh(
  load: () => void | Promise<void>,
  options?: {
    intervalMs?: number;
    socketEvents?: string[];
  },
) {
  const loadRef = useRef(load);
  loadRef.current = load;

  const events = options?.socketEvents ?? [];
  const intervalMs = options?.intervalMs ?? 8_000;

  useSocket(events, () => {
    void loadRef.current();
  });

  useEffect(() => {
    const id = setInterval(() => {
      void loadRef.current();
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, events.join(',')]);
}
