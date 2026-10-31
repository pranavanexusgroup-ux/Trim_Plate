import { useEffect, useRef } from 'react';

export interface RealtimeMessage {
  event: string;
  payload: any;
  timestamp: string;
}

/**
 * Resilient WebSocket hook that keeps a stable connection across re-renders
 * and reconnects cleanly with backoff if interrupted.
 */
export function useRealtime(onEvent: (msg: RealtimeMessage) => void) {
  const callbackRef = useRef(onEvent);
  callbackRef.current = onEvent;

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    let socket: WebSocket | null = null;
    let closedByUnmount = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;

    const connect = () => {
      if (closedByUnmount) return;
      try {
        socket = new WebSocket(wsUrl);
        socket.onopen = () => {
          attempt = 0;
        };
        socket.onmessage = (e) => {
          try {
            const parsed = JSON.parse(e.data) as RealtimeMessage;
            callbackRef.current(parsed);
          } catch {
            // ignore malformed messages
          }
        };
        socket.onclose = () => {
          if (closedByUnmount) return;
          const delay = Math.min(8000, 1200 * Math.pow(1.6, attempt));
          attempt += 1;
          reconnectTimer = setTimeout(connect, delay);
        };
      } catch {
        // ignore ws connection errors in restricted frames
      }
    };

    connect();

    return () => {
      closedByUnmount = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (
        socket &&
        (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)
      ) {
        socket.close();
      }
    };
  }, []);
}
