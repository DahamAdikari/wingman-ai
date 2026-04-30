import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store';

export function useWebSocket(onMessage) {
  const token = useAuthStore((s) => s.token);
  const wsRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    const ws = new WebSocket(`${import.meta.env.VITE_WS_URL}?token=${token}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch {
        // ignore malformed messages
      }
    };

    ws.onerror = () => console.error('WebSocket error');

    return () => {
      ws.close();
    };
  }, [token]);

  return wsRef;
}
