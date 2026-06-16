'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_URL, getToken } from '@/lib/api';

type Handler = (payload: unknown) => void;

/**
 * Connects to the dashboard realtime namespace and invokes the handler whenever
 * any of the given event names fire (e.g. 'trade:executed', 'order:updated').
 */
export function useSocket(events: string[], onEvent: Handler) {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const socket: Socket = io(`${API_URL}/dashboard`, {
      transports: ['websocket'],
      auth: { token },
    });

    const listener = (payload: unknown) => handlerRef.current(payload);
    for (const event of events) socket.on(event, listener);

    return () => {
      for (const event of events) socket.off(event, listener);
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.join(',')]);
}
