"""
MRM LOCAL BRIDGE — Real Windows control for the MRM Web HUD
Creator: Muhammad Raza Mughal • 13 August 2026

Run:
    pip install -r backend/requirements.txt
    python backend/mrm_bridge.py

The web HUD auto-connects to ws://127.0.0.1:8765.
Protocol: {"id": "...", "tool": "...", "args": {...}}
Reply:    {"id": "...", "result": "..."} or {"id": "...", "error": "..."}

Safety:
- Listens ONLY on 127.0.0.1 (localhost).
- Shutdown executes only with confirmation == "YES".
- Vision clicks require confidence >= MRM_VISION_CONFIDENCE_MIN.
"""

import asyncio
import base64
import ctypes
import json
import os
import re
import subprocess
import time
import urllib.parse
import webbrowser
from io import BytesIO

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

load_dotenv(".env.local")

try:
    import pyautogui
    pyautogui.FAILSAFE = True
    GUI = True
except Exception:
    GUI = False

try:
    import pyperclip
    CLIP = True
except Exception:
    CLIP = False

try:
    import requests
    REQ = True
except Exception:
    REQ = False

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
GEMINI_VISION_MODEL = os.getenv("GEMINI_VISION_MODEL", "gemini-3.5-flash")
CONF_MIN = float(os.getenv("MRM_VISION_CONFIDENCE_MIN", "0.55"))
DELAY = float(os.getenv("MRM_GUI_ACTION_DELAY", "0.15"))
PORT = int(os.getenv("MRM_BRIDGE_PORT", "8765"))

APPS = {
    "chrome": r"%ProgramFiles%\Google\Chrome\Application\chrome.exe",
    "edge": r"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe",
    "firefox": r"%ProgramFiles%\Mozilla Firefox\firefox.exe",
    "notepad": "notepad.exe",
    "calculator": "calc.exe",
    "paint": "mspaint.exe",
    "explorer": "explorer.exe",
    "task manager": "taskmgr.exe",
    "cmd": "cmd.exe",
    "powershell": "powershell.exe",
    "control panel": "control.exe",
    "vs code": "code",
}

FOLDERS = {
    "desktop": "Desktop", "downloads": "Downloads", "download": "Downloads",
    "documents": "Documents", "pictures": "Pictures", "photos": "Pictures",
    "videos": "Videos", "music": "Music",
}


def sleep(d=DELAY):
    time.sleep(max(0.0, d))


def open_application(application: str) -> str:
    name = application.lower().strip()
    if name in ("whatsapp", "whatsapp desktop"):
        return open_whatsapp()
    target = APPS.get(name)
    if not target:
        return f"No configuration for {application}."
    target = os.path.expandvars(target)
    try:
        if os.path.exists(target):
            subprocess.Popen([target], shell=False)
        else:
            subprocess.Popen(target, shell=True)
        sleep(0.6)
        return f"Opened {application}."
    except Exception as e:
        return f"Could not open {application}: {e}"


def open_whatsapp() -> str:
    for p in (r"%LOCALAPPDATA%\WhatsApp\WhatsApp.exe",
              r"%LOCALAPPDATA%\Programs\WhatsApp\WhatsApp.exe",
              r"%ProgramFiles%\WhatsApp\WhatsApp.exe"):
        p = os.path.expandvars(p)
        if os.path.exists(p):
            subprocess.Popen([p])
            sleep(1.2)
            return "WhatsApp Desktop opened."
    try:
        os.startfile("whatsapp:")
        sleep(1.2)
        return "WhatsApp Desktop launch requested (URI)."
    except Exception as e:
        return f"WhatsApp launch failed: {e}"


def gui_required():
    if not GUI:
        raise RuntimeError("pyautogui not installed — pip install pyautogui")


def type_text(text: str):
    gui_required()
    if CLIP:
        pyperclip.copy(text)
        pyautogui.hotkey("ctrl", "v")
    else:
        pyautogui.write(text, interval=0.015)
    sleep()


def media_play_pause() -> str:
    try:
        ctypes.windll.user32.keybd_event(0xB3, 0, 0, 0)
        ctypes.windll.user32.keybd_event(0xB3, 0, 0x0002, 0)
        return "Media play/pause toggled."
    except Exception as e:
        return f"Media control failed: {e}"


def vision_locate(target: str) -> dict:
    gui_required()
    if not REQ or not GEMINI_API_KEY:
        return {"found": False, "reason": "requests / GEMINI_API_KEY missing"}
    shot = pyautogui.screenshot()
    buf = BytesIO()
    shot.save(buf, format="PNG")
    w, h = shot.size
    prompt = (
        f"Find this target on the screenshot: {target}\n"
        f"Screen: width={width_height(w)} height={h}\n"
        "Return ONLY JSON: {\"found\":bool,\"x\":int|null,\"y\":int|null,"
        "\"confidence\":0..1,\"reason\":\"...\"}. Center coordinates, absolute pixels. "
        "Do not guess if not visible."
    )
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{GEMINI_VISION_MODEL}:generateContent?key={urllib.parse.quote(GEMINI_API_KEY)}"
    )
    payload = {
        "contents": [{"parts": [
            {"text": prompt},
            {"inline_data": {"mime_type": "image/png",
                             "data": base64.b64encode(buf.getvalue()).decode()}},
        ]}],
        "generationConfig": {"temperature": 0, "responseMimeType": "application/json"},
    }
    r = requests.post(url, json=payload, timeout=30)
    if r.status_code != 200:
        return {"found": False, "reason": f"Gemini HTTP {r.status_code}"}
    parts = r.json().get("candidates", [{}])[0].get("content", {}).get("parts", [])
    text = "".join(p.get("text", "") for p in parts)
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip())
    try:
        return json.loads(text)
    except Exception:
        m = re.search(r"\{.*\}", text, re.DOTALL)
        return json.loads(m.group(0)) if m else {"found": False, "reason": "parse error"}


def width_height(w):
    return w


def youtube_search_and_play(query: str, result_number: int = 1, new_tab: bool = False) -> str:
    gui_required()
    result_number = max(1, min(10, int(result_number)))
    search_url = "https://www.youtube.com/results?search_query=" + urllib.parse.quote_plus(query)
    video_url = search_url
    if REQ:
        try:
            r = requests.get(search_url, headers={"User-Agent": "Mozilla/5.0"}, timeout=15)
            ids = list(dict.fromkeys(re.findall(r'"videoId":"([A-Za-z0-9_-]{11})"', r.text)))
            if len(ids) >= result_number:
                video_url = f"https://www.youtube.com/watch?v={ids[result_number - 1]}"
        except Exception:
            pass
    pyautogui.hotkey("ctrl", "t" if new_tab else "l")
    sleep(0.25)
    type_text(video_url)
    pyautogui.press("enter")
    sleep(1.2)
    return f"Opened YouTube result #{result_number} for '{query}' in {'new' if new_tab else 'current'} tab."


def handle(tool: str, args: dict) -> str:
    a = args or {}
    if tool == "open_application":
        return open_application(a.get("application", ""))
    if tool == "open_whatsapp":
        return open_whatsapp()
    if tool == "open_folder":
        name = str(a.get("folder", "")).lower()
        sub = FOLDERS.get(name)
        path = os.path.join(os.path.expanduser("~"), sub) if sub else str(a.get("folder"))
        os.startfile(path)
        return f"Opened {path}"
    if tool == "take_screenshot":
        gui_required()
        fname = f"MRM_Screenshot_{time.strftime('%Y%m%d_%H%M%S')}.png"
        pyautogui.screenshot().save(fname)
        return f"Screenshot saved: {os.path.abspath(fname)}"
    if tool == "type_in_notepad":
        subprocess.Popen(["notepad.exe"])
        sleep(1.2)
        type_text(a.get("text", ""))
        return f"Notepad typed: {a.get('text', '')}"
    if tool == "youtube_search_and_play":
        return youtube_search_and_play(a.get("query", ""), a.get("result_number", 1), a.get("new_tab", False))
    if tool == "browser_new_tab":
        gui_required(); pyautogui.hotkey("ctrl", "t"); return "New tab opened."
    if tool in ("click_screen", "double_click_screen", "right_click_screen", "move_mouse"):
        gui_required()
        x, y = int(a.get("x", 0)), int(a.get("y", 0))
        if tool == "click_screen": pyautogui.click(x, y)
        elif tool == "double_click_screen": pyautogui.doubleClick(x, y, interval=0.12)
        elif tool == "right_click_screen": pyautogui.rightClick(x, y)
        else: pyautogui.moveTo(x, y, duration=0.25)
        sleep()
        return f"{tool} at ({x}, {y}) done."
    if tool == "click_visible_target":
        res = vision_locate(a.get("target", ""))
        if not res.get("found") or float(res.get("confidence", 0)) < CONF_MIN:
            return f"Target not clicked: {res.get('reason', 'low confidence')}"
        pyautogui.click(int(res["x"]), int(res["y"]))
        return f"Clicked '{a.get('target')}' at ({res['x']}, {res['y']})."
    if tool == "scroll_screen":
        gui_required(); pyautogui.scroll(int(a.get("amount", -5))); sleep()
        return f"Scrolled {a.get('amount')}."
    if tool == "scroll_until_target_visible":
        gui_required()
        for i in range(6):
            res = vision_locate(a.get("target", ""))
            if res.get("found") and float(res.get("confidence", 0)) >= CONF_MIN:
                return f"Found '{a.get('target')}' after {i} scrolls."
            pyautogui.scroll(-5); sleep(0.7)
        return "Target not found after 6 scroll attempts."
    if tool == "press_key":
        gui_required(); pyautogui.press(str(a.get("key", "enter")).lower()); sleep()
        return f"Pressed {a.get('key')}."
    if tool == "hotkey":
        gui_required(); pyautogui.hotkey(*[str(k).lower() for k in a.get("keys", [])]); sleep()
        return f"Hotkey {'+'.join(a.get('keys', []))} pressed."
    if tool == "video_play_pause":
        return media_play_pause()
    if tool == "shutdown":
        if str(a.get("confirmation", "")).strip().upper() != "YES":
            return "Shutdown cancelled (needs exact YES)."
        subprocess.Popen(["shutdown.exe", "/s", "/t", "5"])
        return "Confirmed. Windows shuts down in 5 seconds."
    return f"Unknown tool: {tool}"


app = FastAPI(title="MRM Bridge")


@app.websocket("/")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()
    print("[MRM] Web HUD connected.")
    try:
        while True:
            data = json.loads(await ws.receive_text())
            try:
                result = await asyncio.to_thread(handle, data.get("tool", ""), data.get("args", {}))
                await ws.send_text(json.dumps({"id": data.get("id"), "result": result}))
            except Exception as e:
                await ws.send_text(json.dumps({"id": data.get("id"), "error": str(e)}))
    except WebSocketDisconnect:
        print("[MRM] Web HUD disconnected.")


if __name__ == "__main__":
    HOST = os.getenv("MRM_BRIDGE_HOST", "127.0.0.1")
    print("=" * 60)
    print("  MRM BRIDGE — Muhammad Raza Mughal • 13 August 2026")
    print(f"  ws://{HOST}:{PORT}  |  GUI={GUI}  CLIP={CLIP}  VISION={bool(GEMINI_API_KEY)}")
    print("=" * 60)
    if not GEMINI_API_KEY:
        print("[WARNING] GEMINI_API_KEY missing in .env.local — vision disabled.")
    print("  LAN use ke liye .env.local mein MRM_BRIDGE_HOST=0.0.0.0 karein")
    uvicorn.run(app, host=HOST, port=PORT, log_level="warning")