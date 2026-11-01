import type { Intent } from "./types";

/**
 * MRM COMMAND PARSER
 * Understands English + Roman Urdu, mirroring the Python agent's tool set.
 */

const OPEN_VERB = /(kholo|khol do|khol|open|launch|start karo|chalu karo|nikalo)/;

const APP_ALIASES: Record<string, string> = {
  "google chrome": "chrome",
  chrome: "chrome",
  "microsoft edge": "edge",
  edge: "edge",
  firefox: "firefox",
  notepad: "notepad",
  calculator: "calculator",
  calc: "calculator",
  paint: "paint",
  "file explorer": "explorer",
  explorer: "explorer",
  "task manager": "task manager",
  taskmgr: "task manager",
  "command prompt": "cmd",
  cmd: "cmd",
  powershell: "powershell",
  "control panel": "control panel",
  "visual studio code": "vs code",
  vscode: "vs code",
  "vs code": "vs code",
};

function resultNumber(n: string): number {
  if (/pehla|pehli|first|1st/.test(n)) return 1;
  if (/doosra|dusra|dosra|second|2nd/.test(n)) return 2;
  if (/teesra|teesri|third|3rd/.test(n)) return 3;
  if (/chautha|chota|fourth|4th/.test(n)) return 4;
  if (/panchwan|fifth|5th/.test(n)) return 5;
  const m = n.match(/(\d+)/);
  return m ? Math.min(10, Math.max(1, parseInt(m[1], 10))) : 1;
}

export function parseCommand(raw: string): Intent {
  const text = raw.trim();
  // Urdu (اردو) / Hindi (देवनागरी) script → seedha Gemini brain route karega
  if (/[\u0600-\u06FF\u0900-\u097F]/.test(text)) {
    return { type: "unknown", raw: text };
  }
  const n = text.toLowerCase().replace(/\s+/g, " ");
  const newTab = /new tab|naya tab|naye tab/.test(n);

  // ---- shutdown ----
  if (/shutdown|shut down|pc band|system band|computer band|power off/.test(n)) {
    return { type: "shutdown_request" };
  }

  // ---- identity ----
  if (/kis ?ne banaya|kis ne banaya|who (made|created|built) you|creator|tumhe kis|banaya kis/.test(n)) {
    return { type: "creator" };
  }

  // ---- clap control ----
  if (/clap/.test(n)) {
    const off = /(off|band|disable|rok|stop)/.test(n);
    return { type: "clap", on: !off };
  }

  // ---- screenshot ----
  if (/screenshot|screen shot|screen capture/.test(n)) return { type: "screenshot" };

  // ---- time / date ----
  if (/(time kya|kya time|waqt|kitne baj|bajay|baje hain|current time|what time|date kya|tareekh|aaj ki date|today'?s date|what.*date)/.test(n)) {
    return { type: "time" };
  }

  // ---- help / greeting ----
  if (/^(help|madad|commands?)$|kya kar sakti|what can you do/.test(n)) return { type: "help" };
  if (/^(salam|assalam[\w ]*|salaam|aoa|hello|hi|hey|namaste)[!. ]*$/.test(n)) return { type: "greeting" };

  // ---- WhatsApp workflow ----
  if (/whats ?app|watsapp/.test(n)) {
    let contact: string | undefined;
    let message: string | undefined;
    const cm = text.match(/(?:aur|and|kholo|open|^)\s*([A-Za-z][A-Za-z .]{0,20}?)\s+ko\s+(?:message|msg|whatsapp)/i);
    if (cm) contact = cm[1].replace(/^(aur|and|open|kholo)\s+/i, "").trim();
    const mm =
      text.match(/(?:message|msg|likho|type karo|bhejo|send karo)(?:\s+(?:karo|bhejo|send))?\s*[:=]\s*["“]?(.+?)["”]?$/i) ||
      text.match(/:\s*(.+)$/) ||
      text.match(/(?:message|msg)\s+(?:karo\s*[:=]?\s*)?["“]([^"”]+)["”]/i);
    if (mm && mm[1] && !/^(karo|do|karna)$/i.test(mm[1].trim())) message = mm[1].trim();
    const send = /bhejo|bhej do|send|kar do|karo/.test(n) && !!message;
    return { type: "whatsapp", contact, message, send };
  }

  // ---- Notepad typing ----
  if (/notepad/.test(n) && /(likho|likh do|type|write)/.test(n)) {
    const m =
      text.match(/(?:likho|likh do|type karo|type|write)\s*[:=]\s*["“]?(.+?)["”]?$/i) ||
      text.match(/(?:aur|and|mein|me)\s+(.+?)\s+(?:likho|likh do|type karo|write)$/i) ||
      text.match(/notepad\s+(.+?)\s+(?:likho|likh do|type karo|write)$/i) ||
      text.match(/(?:likho|type karo|write)\s+["“]([^"”]+)["”]/i);
    if (m) {
      const t = m[1].replace(/^(kholo|khol do|open)\s+(aur\s+|and\s+)?/i, "").trim();
      if (t) return { type: "notepad_type", text: t };
    }
  }

  // ---- YouTube ----
  if (/youtube|yt\b|video/.test(n)) {
    const numMatch = n.match(/pehla|pehli|first|1st|doosra|dusra|dosra|second|2nd|teesra|teesri|third|3rd|chautha|fourth|4th|panchwan|fifth|5th|\d+(?:st|nd|rd|th|number|no|wala)?/);
    let query = "";
    const qm =
      text.match(/youtube\s+(?:par|pe|on)\s+(.+?)\s+(?:search|dhoondo|talash|dhundo)/i) ||
      text.match(/^(.+?)\s+(?:ka|ki|ke)\s+(?:pehla|pehli|doosra|dusra|teesra|first|second|third|\d+\w*)\s+video/i) ||
      text.match(/(?:search|play|chalao)\s+(?:karo\s+)?["“]?(.+?)["”]?\s+(?:on|par|pe)\s+youtube/i) ||
      text.match(/youtube\s+(?:search|par search)\s*[:=]?\s*(.+)$/i);
    if (qm) {
      query = qm[1]
        .replace(/\s*(search karo|karo|aur|and).*$/i, "")
        .replace(/^(new tab|naya tab|naye tab|current tab|isi tab)\s+(mein\s+|me\s+)?/i, "")
        .trim();
    }

    const wantsPlay = /(chalao|chala do|play|bajao|laga do|click)/.test(n) && !!numMatch;
    if (wantsPlay) {
      return { type: "youtube_play", query: query || "", result: resultNumber(numMatch![0]), newTab };
    }
    if (query && /(search|dhoondo|talash|dhundo)/.test(n)) {
      return { type: "youtube_search", query, newTab };
    }
    if (OPEN_VERB.test(n) && /youtube|yt\b/.test(n) && !query) {
      return { type: "open_url", url: "https://www.youtube.com", label: "YouTube", newTab };
    }
    if (query) return { type: "youtube_search", query, newTab };
  }

  // ---- Google search ----
  if (/google/.test(n) && /(search|dhoondo|talash|dhundo)/.test(n)) {
    const m =
      text.match(/google\s+(?:par|pe|on)\s+(.+?)\s*(?:search|dhoondo|talash)?\s*(?:karo|kar do)?$/i) ||
      text.match(/^(.+?)\s+(?:ko\s+)?google\s+(?:par|pe)/i);
    const q = m ? m[1].replace(/(search karo|search|karo)$/i, "").trim() : "";
    if (q) return { type: "google_search", query: q, newTab };
  }
  {
    const m = text.match(/^(.+?)\s+(?:search karo|search kar do|dhoondo|talash karo)$/i);
    if (m && !/youtube|google|tab|video/.test(m[1].toLowerCase())) {
      return { type: "google_search", query: m[1].trim(), newTab };
    }
  }

  // ---- Browser tabs ----
  if (/new window|nayi window|naya window/.test(n)) return { type: "tab", action: "new_window" };
  if (/(browser|window)\s+(band|close)|close (the )?browser/.test(n)) return { type: "tab", action: "close_window" };
  if (/tab/.test(n)) {
    if (/new tab|naya tab|naye tab/.test(n)) return { type: "tab", action: "new" };
    if (/(next|agla|agla wala)/.test(n)) return { type: "tab", action: "next" };
    if (/(previous|pichla|peeche|prev)/.test(n)) return { type: "tab", action: "prev" };
    const goto = n.match(/tab\s*(?:number\s*)?(\d)/);
    if (goto && !/close|band/.test(n)) return { type: "tab", action: "goto", number: parseInt(goto[1], 10) };
    const named = text.match(/([A-Za-z0-9 ]+?)\s+(?:wala|wale|wali)?\s*tab\s+(?:ko\s+)?(close|band|kholo|select|par jao)/i);
    if (named) {
      const name = named[1].replace(/^(ye|yeh|the|aur|and)\s+/i, "").trim();
      if (/close|band/.test(named[2])) return { type: "tab", action: "close_name", name };
      return { type: "tab", action: "select_name", name };
    }
    if (/(close|band)/.test(n)) return { type: "tab", action: "close_current" };
    if (/(select|kholo|par jao|switch)/.test(n)) {
      const nm = text.match(/(.+?)\s+(?:wala\s+)?tab/i);
      if (nm) return { type: "tab", action: "select_name", name: nm[1].trim() };
    }
  }

  // ---- Mouse with coordinates ----
  {
    const coords = n.match(/(\d{1,4})\s*[, ]\s*(\d{1,4})/);
    if (coords && /(click|mouse|point|cursor|jao)/.test(n)) {
      const x = parseInt(coords[1], 10);
      const y = parseInt(coords[2], 10);
      if (/double/.test(n)) return { type: "mouse", action: "double", x, y };
      if (/right/.test(n)) return { type: "mouse", action: "right", x, y };
      if (/(move|le jao|leja|le jaye|jao)/.test(n) && !/click/.test(n)) return { type: "mouse", action: "move", x, y };
      return { type: "mouse", action: "click", x, y };
    }
    if (/mouse (position|kahan)|kahan hai mouse|cursor position/.test(n)) return { type: "mouse", action: "position" };
  }

  // ---- Vision click (named target) ----
  {
    const vm = text.match(/(.+?)\s+(?:button|par|pe|ko)?\s*(?:par|pe)?\s*click (karo|kar do|karein)/i);
    if (vm && !/\d/.test(vm[1])) {
      return { type: "vision_click", target: vm[1].replace(/^(jahan|where)\s+/i, "").trim() };
    }
  }

  // ---- Scroll ----
  if (/(scroll|upar jao|neeche jao|niche jao|page down|page up)/.test(n)) {
    const until = text.match(/(.+?)\s+(?:tak|jab tak)\s+scroll/i);
    if (until) return { type: "scroll", amount: -5, target: until[1].trim() };
    const am = n.match(/(\d+)/);
    const amount = am ? Math.min(20, parseInt(am[1], 10)) : 5;
    const up = /(upar|up|uper)/.test(n);
    return { type: "scroll", amount: up ? amount : -amount };
  }

  // ---- Keyboard ----
  {
    const hk = n.match(/(ctrl|control|alt|win|shift)\s*\+?\s*(shift)?\s*\+?\s*([a-z0-9]{1,4})\b/);
    if (hk && /(press|dabao|hotkey|ctrl|alt|shift|win)/.test(n)) {
      const keys = [hk[1] === "control" ? "ctrl" : hk[1]];
      if (hk[2]) keys.push(hk[2]);
      keys.push(hk[3]);
      return { type: "key", keys };
    }
    const km = n.match(/(?:press|dabao)\s+([a-z0-9 ]{1,12})|([a-z0-9]{1,12})\s+dabao/);
    if (km) {
      const key = (km[1] || km[2]).trim().split(" ")[0];
      return { type: "key", keys: [key] };
    }
  }

  // ---- Typing ----
  {
    const tm = text.match(/^(?:likho|type karo|type|write)\s*[:=]?\s*["“]?(.+?)["”]?$/i);
    if (tm) return { type: "type_text", text: tm[1].trim() };
  }

  // ---- Media play/pause ----
  if (/^(pause|play)$|pause karo|play pause|play\/pause|video (pause|rok)|music (pause|rok|band)|gaana (band|pause)|resume karo/.test(n)) {
    return { type: "media_toggle" };
  }

  // ---- Folders ----
  {
    const fm = n.match(/(downloads?|desktop|documents?|pictures?|photos|videos?|music)\s+(?:folder\s+)?(?:kholo|open|dikhao)/);
    if (fm) return { type: "open_folder", folder: fm[1] };
  }

  // ---- Known websites ----
  if (/github/.test(n) && (OPEN_VERB.test(n) || n === "github")) {
    return { type: "open_url", url: "https://github.com", label: "GitHub", newTab };
  }
  if (/google/.test(n) && OPEN_VERB.test(n)) {
    return { type: "open_url", url: "https://www.google.com", label: "Google", newTab };
  }
  if (/(youtube|yt)/.test(n) && OPEN_VERB.test(n)) {
    return { type: "open_url", url: "https://www.youtube.com", label: "YouTube", newTab };
  }

  // ---- Applications ----
  for (const alias of Object.keys(APP_ALIASES).sort((a, b) => b.length - a.length)) {
    if (n.includes(alias)) {
      if (OPEN_VERB.test(n) || n === alias || /^(calc|calculator|notepad)$/.test(alias)) {
        return { type: "open_app", app: APP_ALIASES[alias] };
      }
    }
  }

  // ---- generic URL ----
  {
    const um = text.match(/((?:https?:\/\/)?[\w-]+\.(?:com|org|net|io|dev|pk)(?:\/\S*)?)/i);
    if (um && OPEN_VERB.test(n)) {
      const url = um[1].startsWith("http") ? um[1] : `https://${um[1]}`;
      return { type: "open_url", url, label: um[1], newTab };
    }
  }

  return { type: "unknown", raw: text };
}