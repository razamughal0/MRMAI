/**
 * MRM LOCAL BRIDGE CLIENT
 * Connects to backend/mrm_bridge.py (ws://127.0.0.1:8765) for REAL
 * Windows control. When offline, MRM runs in simulation mode and
 * still performs real web actions (open YouTube / Google / tabs).
 */

export type BridgeStatus = "offline" | "checking" | "online";

let socket: WebSocket | null = null;
let status: BridgeStatus = "offline";
let pending = new Map<string, (result: string) => void>();
let counter = 0;

const URL_KEY = "mrm_bridge_url";

/** Default: jis host se HUD khula hai usi ka 8765 (localhost / LAN IP dono). */
export function getBridgeUrl(): string {
  try {
    const saved = localStorage.getItem(URL_KEY);
    if (saved) return saved;
  } catch {
    /* noop */
  }
  let host =
    typeof location !== "undefined" && location.hostname ? location.hostname : "127.0.0.1";
  // localhost IPv6 (::1) par resolve ho sakta hai — bridge IPv4 par hai
  if (host === "localhost" || host === "::1" || host === "[::1]") host = "127.0.0.1";
  return `ws://${host}:8765`;
}

export function setBridgeUrl(url: string): void {
  try {
    localStorage.setItem(URL_KEY, url.trim());
  } catch {
    /* noop */
  }
  if (socket) {
    try {
      socket.close();
    } catch {
      /* noop */
    }
    socket = null;
  }
  status = "offline";
}

export function connectBridge(onStatus: (s: BridgeStatus) => void): void {
  if (status === "online" || status === "checking") return;
  status = "checking";
  onStatus("checking");
  try {
    const ws = new WebSocket(getBridgeUrl());
    const timeout = setTimeout(() => {
      if (status !== "online") {
        try {
          ws.close();
        } catch {
          /* noop */
        }
        status = "offline";
        onStatus("offline");
      }
    }, 2500);

    ws.onopen = () => {
      clearTimeout(timeout);
      socket = ws;
      status = "online";
      onStatus("online");
    };

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        const cb = pending.get(data.id);
        if (cb) {
          pending.delete(data.id);
          cb(String(data.result ?? data.error ?? "done"));
        }
      } catch {
        /* ignore malformed */
      }
    };

    ws.onclose = () => {
      clearTimeout(timeout);
      socket = null;
      if (status !== "offline") {
        status = "offline";
        onStatus("offline");
      }
    };

    ws.onerror = () => {
      clearTimeout(timeout);
      try {
        ws.close();
      } catch {
        /* noop */
      }
      status = "offline";
      onStatus("offline");
    };
  } catch {
    status = "offline";
    onStatus("offline");
  }
}

export function bridgeStatus(): BridgeStatus {
  return status;
}

/** Returns the tool result string, or null when the bridge is offline. */
export function bridgeCall(tool: string, args: Record<string, unknown> = {}): Promise<string | null> {
  if (status !== "online" || !socket) return Promise.resolve(null);
  const id = `cmd_${++counter}`;
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      resolve(null);
    }, 20000);
    pending.set(id, (result) => {
      clearTimeout(timer);
      resolve(result);
    });
    try {
      socket!.send(JSON.stringify({ id, tool, args }));
    } catch {
      clearTimeout(timer);
      pending.delete(id);
      resolve(null);
    }
  });
}