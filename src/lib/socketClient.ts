/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useTradingStore } from '../store';

let reconnectTimeout: any = null;
let reconnectDelay = 2000;

export function initWebSocket(url: string) {
  // Clear any existing reconnect timers
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  // Close any existing connection
  const oldWs = (window as any).aegisWsClient;
  if (oldWs) {
    try {
      oldWs.onclose = null;
      oldWs.onerror = null;
      oldWs.close();
    } catch (e) {}
  }

  console.log(`[WebSocket] Connecting to ${url}...`);
  useTradingStore.setState({ wsStatus: 'connecting' });

  let ws: WebSocket;
  try {
    ws = new WebSocket(url);
  } catch (err) {
    console.error(`[WebSocket] Initialization error for ${url}:`, err);
    useTradingStore.setState({ wsStatus: 'disconnected' });
    scheduleReconnect(url);
    return {
      close: () => {}
    };
  }

  (window as any).aegisWsClient = ws;

  ws.onopen = () => {
    console.log(`[WebSocket] Connected to ${url}`);
    useTradingStore.setState({ wsStatus: 'connected' });
    reconnectDelay = 2000; // Reset reconnect delay on successful connection
    useTradingStore.getState().addNotification(`Secure WebSocket bridge established with ${url}.`, 'info');
  };

  ws.onmessage = (event) => {
    try {
      const parsed = JSON.parse(event.data);
      const { type, payload } = parsed;

      switch (type) {
        case 'INIT_STATE':
        case 'TICK':
        case 'STATE_UPDATE': {
          useTradingStore.setState(payload);
          break;
        }
        default:
          console.warn(`[WebSocket] Unknown message type: ${type}`);
      }
    } catch (err) {
      console.error('[WebSocket] Failed to parse message:', err);
    }
  };

  ws.onclose = (e) => {
    console.log(`[WebSocket] Closed connection to ${url}. Code: ${e.code}`);
    useTradingStore.setState({ wsStatus: 'disconnected' });
    scheduleReconnect(url);
  };

  ws.onerror = (err) => {
    console.error('[WebSocket] Connection error:', err);
    useTradingStore.setState({ wsStatus: 'disconnected' });
  };

  return {
    close: () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      ws.onclose = null;
      ws.onerror = null;
      try {
        ws.close();
      } catch (e) {}
      if ((window as any).aegisWsClient === ws) {
        (window as any).aegisWsClient = null;
      }
      useTradingStore.setState({ wsStatus: 'disconnected' });
    }
  };
}

function scheduleReconnect(url: string) {
  if (reconnectTimeout) return;

  console.log(`[WebSocket] Scheduling reconnect in ${reconnectDelay}ms`);
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    // Cap backoff at 30 seconds
    reconnectDelay = Math.min(reconnectDelay * 1.5, 30000);
    initWebSocket(url);
  }, reconnectDelay);
}
