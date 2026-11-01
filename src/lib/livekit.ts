/**
 * MRM LIVEKIT VOICE — real Gemini realtime voice via LiveKit Cloud.
 * Token (HS256 JWT) browser mein banta hai, room join hota hai, mic
 * publish hota hai aur "my-agent" dispatch hota hai (aapka Python agent).
 * Agent ka Aoede audio yahan subscribe hota hai; transcriptions COMMS
 * mein aati hain. Agent na ho to HUD browser-voice par fallback karta hai.
 */

import { Room, RoomEvent, Track } from "livekit-client";
import { LIVEKIT } from "./config";

export type VoiceStatus = "off" | "connecting" | "waiting" | "live" | "error";

function b64url(input: string | Uint8Array): string {
  let bin: string;
  if (typeof input === "string") {
    bin = btoa(unescape(encodeURIComponent(input)));
  } else {
    bin = btoa(String.fromCharCode(...input));
  }
  return bin.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function makeToken(identity: string): Promise<string> {
  const enc = new TextEncoder();
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const claims = {
    iss: LIVEKIT.apiKey,
    sub: identity,
    jti: `${identity}-${now}`,
    iat: now,
    nbf: now - 10,
    exp: now + 60 * 60,
    name: "Boss",
    video: {
      room: LIVEKIT.room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    },
    // Explicit agent dispatch — aapke @server.rtc_session(agent_name="my-agent") ke liye
    roomConfig: { agents: [{ agentName: LIVEKIT.agentName }] },
  };
  const data = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(LIVEKIT.apiSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return `${data}.${b64url(new Uint8Array(sig))}`;
}

export interface VoiceHandlers {
  onStatus: (status: VoiceStatus, error?: string) => void;
  onTranscript: (text: string, isFinal: boolean, fromAgent: boolean) => void;
  onNote?: (msg: string, ok: boolean) => void;
}

/** Direct AgentDispatchService/CreateDispatch — verified working with sha256 body claim. */
async function dispatchAgent(h: VoiceHandlers): Promise<void> {
  try {
    const enc = new TextEncoder();
    const body = JSON.stringify({ agentName: LIVEKIT.agentName, room: LIVEKIT.room });
    const hashBuf = await crypto.subtle.digest("SHA-256", enc.encode(body));
    const bodyHash = btoa(String.fromCharCode(...new Uint8Array(hashBuf)));
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: "HS256", typ: "JWT" };
    const claims = {
      iss: LIVEKIT.apiKey,
      sub: "mrm-hud",
      iat: now,
      nbf: now - 10,
      exp: now + 300,
      sha256: bodyHash,
      video: { roomAdmin: true, room: LIVEKIT.room },
    };
    const data = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;
    const key = await crypto.subtle.importKey(
      "raw", enc.encode(LIVEKIT.apiSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
    const token = `${data}.${b64url(new Uint8Array(sig))}`;
    const httpUrl = LIVEKIT.url.replace("wss://", "https://").replace("ws://", "http://");
    const res = await fetch(`${httpUrl}/twirp/livekit.AgentDispatchService/CreateDispatch`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body,
    });
    if (res.ok) {
      h.onNote?.(`Agent '${LIVEKIT.agentName}' dispatch request bhej di gayi`, true);
    } else {
      const err = await res.json().catch(() => ({}));
      h.onNote?.(`Dispatch: ${(err as any)?.msg || `HTTP ${res.status}`} — worker offline ho to agent chalayein`, false);
    }
  } catch (e: any) {
    h.onNote?.(`Dispatch call failed: ${e?.message || "network"}`, false);
  }
}

export async function connectVoice(h: VoiceHandlers): Promise<{ disconnect: () => void }> {
  let room: Room | null = null;
  const audioEls: HTMLElement[] = [];
  const cleanup = () => {
    audioEls.forEach((el) => el.remove());
    audioEls.length = 0;
  };

  try {
    if (!crypto?.subtle) {
      h.onStatus("error", "Secure context chahiye — HUD ko http://localhost ya HTTPS se kholein (LAN IP par voice/mic block hoti hai)");
      return { disconnect: () => undefined };
    }
    const identity = `boss-${Math.random().toString(36).slice(2, 8)}`;
    const token = await makeToken(identity);
    room = new Room({ adaptiveStream: true, dynacast: true });
    const r = room;
    let agentSeen = false;

    const markLive = () => {
      if (!agentSeen) {
        agentSeen = true;
        h.onStatus("live");
      }
    };

    r.on(RoomEvent.ParticipantConnected, () => markLive());

    r.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === Track.Kind.Audio) {
        const el = track.attach();
        el.style.display = "none";
        document.body.appendChild(el);
        audioEls.push(el);
        markLive();
      }
    });

    r.on(RoomEvent.TranscriptionReceived, ((segments: any[], participant: any) => {
      try {
        for (const seg of segments || []) {
          const fromAgent = participant ? participant.identity !== r.localParticipant?.identity : true;
          h.onTranscript(String(seg.text || ""), !!seg.final, fromAgent);
        }
      } catch {
        /* transcription optional */
      }
    }) as any);

    r.on(RoomEvent.Disconnected, () => {
      cleanup();
      h.onStatus("off");
    });

    await r.connect(LIVEKIT.url, token, { autoSubscribe: true });
    h.onNote?.("LiveKit Cloud se connected — room: " + LIVEKIT.room, true);
    // Already-present agent?
    if (r.remoteParticipants.size > 0) markLive();
    if (!agentSeen) {
      h.onStatus("waiting");
      // Belt-and-suspenders: token roomConfig dispatch + explicit CreateDispatch
      void dispatchAgent(h);
    }

    try {
      await r.localParticipant.setMicrophoneEnabled(true);
    } catch (micErr: any) {
      h.onStatus("error", `LiveKit mic denied: ${micErr?.message || "permission"}`);
      try { r.disconnect(); } catch { /* noop */ }
      cleanup();
      return { disconnect: () => undefined };
    }

    return {
      disconnect: () => {
        try { r.disconnect(); } catch { /* noop */ }
        cleanup();
      },
    };
  } catch (e: any) {
    try { room?.disconnect(); } catch { /* noop */ }
    cleanup();
    h.onStatus("error", e?.message?.slice(0, 160) || "LiveKit connection failed");
    return { disconnect: () => undefined };
  }
}