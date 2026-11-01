# MRM — Local Server Par Chalane Ka Mukammal Guide

**Creator:** Muhammad Raza Mughal • 13 August 2026

---

## ⚡ Sab Se Aasan Tareeqa (Windows)

Project folder mein **`start_mrm.bat`** par double-click karein. Ye khud:

1. Python check karta hai
2. Pehli dafa packages install karta hai (`backend/requirements.txt` + LiveKit)
3. Agar `dist/` nahi hai to frontend build karta hai
4. **MRM Bridge** kholta hai → real Windows control (`ws://127.0.0.1:8765`)
5. **MRM Urdu Agent** kholta hai → LiveKit Aoede voice
6. Browser mein **http://localhost:8080** kholta hai

> Bridge aur Agent ki 2 black windows khulengi — **unko band na karein**.

---

## 🔧 Manual Tareeqa (3 terminals)

```bash
# Terminal 1 — Real Windows control bridge
pip install -r backend/requirements.txt
python backend/mrm_bridge.py

# Terminal 2 — Urdu/Hindi LiveKit voice agent
pip install livekit-agents livekit-plugins-google livekit-plugins-ai-coustics numpy sounddevice
python backend/mrm_agent_urdu.py dev

# Terminal 3 — Frontend serve
python -m http.server 8080 --directory dist
# phir browser: http://localhost:8080
```

Development ke liye: `npm install` → `npm run dev` → `http://localhost:5173`

---

## ✅ "Nahi Chal Raha" — Ye Check Karein ( ترتيب se )

| Masla | Wajah | Hal |
|---|---|---|
| **Backend API: offline** | Bridge chalta hi nahi | `start_mrm.bat` chalayein ya `python backend/mrm_bridge.py` — console mein error parhein |
| Bridge chal raha hai phir bhi offline | Firewall block | Pehli run par Windows Firewall popup mein **Allow** karein |
| Bridge chal raha hai, HUD kisi aur PC/phone par | URL mismatch | SETUP → **Bridge Address** mein `ws://<bridge-wale-PC-ka-IP>:8765` likhein + `.env.local` mein `MRM_BRIDGE_HOST=0.0.0.0` |
| **Mic / Clap / LiveKit kaam nahi** | LAN IP (`192.168.x.x`) ya `file://` | **Secure context chahiye** — usi PC par `http://localhost:8080` kholein |
| **LK: WAITING AGENT** | Agent worker band hai | Agent wali window check karein: `python backend/mrm_agent_urdu.py dev` chal raha ho |
| Agent window mein login error | LiveKit keys | `.env.local` project root mein honi chahiye (bat yahin se chalayein) |
| **Gemini: QUOTA** | Din ka free quota khatam | Khud 60s mein retry + lite models try hote hain; kal reset ho jata hai ya billing on karein |
| Awaaz nahi aa rahi | Autoplay policy | Ek dafa screen par click karein; VOICE pill ON rakhein |
| `python` command nahi chali | PATH | Python install mein "Add to PATH" tick karein, ya `py` use karein |

**HUD ab bridge ko har 15 second khud dhoondti hai** — bridge baad mein start karein to bhi khud ONLINE ho jayega.

---

## 🖥️ Kya Local Par REAL Ho Jata Hai

- **Mouse / keyboard / scroll / apps / WhatsApp Desktop** — bridge ke through asal Windows control
- **Gemini screen vision** — asal screenshot par element locate + click
- **LiveKit Aoede Urdu voice** — agent chalte hi LK pill **LIVE**, mic hamesha on
- **Screenshot** — asal file save
- **Shutdown** — sirf exact `YES` par, 5 second delay

Browser-only mode (baghair bridge) mein bhi: Gemini brain, Urdu TTS awaaz, YouTube/Google real tabs, virtual desktop, database — sab chalta hai.

---

## 🔐 Security Notes

- `.env.local` aur `src/lib/config.ts` mein aapki keys hain — **kisi ko share na karein**, GitHub par push karne se pehle hata dein
- Bridge sirf `127.0.0.1` par listen karta hai (LAN ke liye `0.0.0.0` khud set karna parta hai)
- LAN par HUD kholne se mic/voice nahi chalegi (browser ki security) — sirf bridge control chalega

---

## 📁 Files Ka Naqsha

```
start_mrm.bat            ← ek click launcher
.env.local               ← aapki asli keys (Gemini + LiveKit)
backend/mrm_bridge.py    ← Windows control (ws://127.0.0.1:8765)
backend/mrm_agent_urdu.py← Urdu/Hindi LiveKit voice agent
backend/requirements.txt
dist/index.html          ← bana hua HUD (single file)
src/                     ← HUD source code
```