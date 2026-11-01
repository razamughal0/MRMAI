"""
MRM — URDU / HINDI REALTIME VOICE AGENT (LiveKit)
Creator: Muhammad Raza Mughal • 13 August 2026

Ye agent khaas Urdu/Hindi ke liye design hai:
- Gemini NATIVE AUDIO model (Urdu/Hindi ke liye multilingual realtime voice)
- Aoede female voice, ur-PK language hint
- Greeting: "Assalam o Alaikum! MRM par aapko khushamdeed boss..."
- Mic hamesha sunta hai (LiveKit room continuous audio)

Run (PC par):
    pip install livekit-agents livekit-plugins-google livekit-plugins-ai-coustics numpy sounddevice pyautogui requests python-dotenv
    python backend/mrm_agent_urdu.py dev

.env.local mein LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET / GEMINI_API_KEY hon.
Web HUD khud "my-agent" ko dispatch karta hai — ye file chalte hi LK LIVE ho jayega.
"""

import os
import re
import subprocess
import time
import ctypes
import urllib.parse
import webbrowser
from datetime import datetime

from dotenv import load_dotenv
from livekit import agents
from livekit.agents import AgentServer, AgentSession, Agent, RunContext, function_tool
from dotenv import load_dotenv
import os

load_dotenv("backend/.env.local")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

LIVEKIT_URL = os.getenv("LIVEKIT_URL")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")
load_dotenv(".env.local")

try:
    from livekit.plugins import google, ai_coustics
    from livekit.agents import room_io
except Exception:
    from livekit.plugins import google
    ai_coustics = None
    room_io = None

try:
    import pyautogui
    GUI = True
except Exception:
    GUI = False

try:
    import requests
    REQ = True
except Exception:
    REQ = False

REALTIME_MODEL = os.getenv("MRM_REALTIME_MODEL", "gemini-2.5-flash-native-audio-latest")
VOICE = os.getenv("MRM_VOICE", "Aoede")
LANGUAGE = os.getenv("MRM_LANGUAGE", "ur-PK")  # hi-IN bhi set kar sakte hain

APPS = {
    "chrome": r"%ProgramFiles%\Google\Chrome\Application\chrome.exe",
    "edge": r"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe",
    "notepad": "notepad.exe",
    "calculator": "calc.exe",
    "paint": "mspaint.exe",
    "explorer": "explorer.exe",
    "task manager": "taskmgr.exe",
    "vs code": "code",
}

INSTRUCTIONS = """
Aap MRM hain — Muhammad Raza Mughal ki banayi hui (13 August 2026) personal
Windows AI assistant. Aapki awaz female hai.

ZUBAN (LANGUAGE):
- Aap URDU aur HINDI ke liye specially design hui hain.
- User Urdu bole to Khalis Urdu mein jawab dein, Hindi bole to Hindi mein,
  Roman Urdu bole to Roman Urdu mein, English bole to English mein.
- Bolne ka andaz: narm, mohtram, friendly. User ko "boss" keh kar bulayein.
- Jawab MUKHTASAR rakhein (1-2 jumlay) — ye voice conversation hai.

PEHLA BOL (greeting bilkul yehi):
"Assalam o Alaikum! MRM par aapko khushamdeed boss. Main aapki kya madad kar sakti hoon?"

CREATOR: agar koi pooche kis ne banaya:
"Mujhe Muhammad Raza Mughal ne 13 August 2026 ko banaya hai, boss."

TOOLS: jab user kuch kholne/search karne/type karne ko kahe to TOOL chalayein,
sirf bol kar na taal dein. Kamyabi ka dawa sirf tool ki success par karein.
"new tab" = Ctrl+T, "close tab" = Ctrl+W, "browser band" = Alt+F4.
Shutdown sirf request_shutdown ke baad exact "YES" par.
"""


class Assistant(Agent):
    def __init__(self):
        super().__init__(instructions=INSTRUCTIONS)

    @function_tool()
    async def open_application(self, context: RunContext, application: str) -> str:
        """Windows application kholo (chrome, edge, notepad, calculator...)."""
        name = application.lower().strip()
        if name in ("whatsapp", "whatsapp desktop"):
            try:
                os.startfile("whatsapp:")
                return "WhatsApp Desktop khol diya boss."
            except Exception as e:
                return f"WhatsApp nahi khula: {e}"
        target = APPS.get(name)
        if not target:
            return f"{application} ki configuration nahi hai."
        target = os.path.expandvars(target)
        try:
            if os.path.exists(target):
                subprocess.Popen([target])
            else:
                subprocess.Popen(target, shell=True)
            return f"{application} khol diya boss."
        except Exception as e:
            return f"Nahi khula: {e}"

    @function_tool()
    async def google_search(self, context: RunContext, query: str) -> str:
        """Google par search karo."""
        webbrowser.open("https://www.google.com/search?q=" + urllib.parse.quote_plus(query))
        return f"Google par {query} search kar diya boss."

    @function_tool()
    async def youtube_search_and_play(self, context: RunContext, query: str, result_number: int = 1) -> str:
        """YouTube par search karke pehla/doosra/teesra video direct chalao."""
        if not GUI:
            return "pyautogui install nahi hai."
        url = "https://www.youtube.com/results?search_query=" + urllib.parse.quote_plus(query)
        n = max(1, min(10, int(result_number)))
        if REQ:
            try:
                r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=15)
                ids = list(dict.fromkeys(re.findall(r'"videoId":"([A-Za-z0-9_-]{11})"', r.text)))
                if len(ids) >= n:
                    url = f"https://www.youtube.com/watch?v={ids[n - 1]}"
            except Exception:
                pass
        webbrowser.open(url)
        time.sleep(1.0)
        return f"YouTube par {query} ka result number {n} chala diya boss."

    @function_tool()
    async def type_text(self, context: RunContext, text: str) -> str:
        """Focused window mein text type karo."""
        if not GUI:
            return "pyautogui install nahi hai."
        try:
            import pyperclip
            pyperclip.copy(text)
            pyautogui.hotkey("ctrl", "v")
        except Exception:
            pyautogui.write(text, interval=0.015)
        return f"Type kar diya boss: {text}"

    @function_tool()
    async def press_key(self, context: RunContext, key: str) -> str:
        """Keyboard key dabao (enter, esc, tab...)."""
        if not GUI:
            return "pyautogui install nahi hai."
        pyautogui.press(key.lower())
        return f"{key} press kar diya boss."

    @function_tool()
    async def current_time(self, context: RunContext) -> str:
        """Abhi ka waqt aur tareekh batao."""
        now = datetime.now()
        return now.strftime("Boss abhi %I:%M %p baj rahe hain, %A %d %B %Y.")

    @function_tool()
    async def media_play_pause(self, context: RunContext) -> str:
        """Video/music play pause karo."""
        try:
            ctypes.windll.user32.keybd_event(0xB3, 0, 0, 0)
            ctypes.windll.user32.keybd_event(0xB3, 0, 0x0002, 0)
            return "Play pause kar diya boss."
        except Exception as e:
            return f"Media control failed: {e}"

    @function_tool()
    async def take_screenshot(self, context: RunContext) -> str:
        """Screen ka screenshot lo."""
        if not GUI:
            return "pyautogui install nahi hai."
        f = f"MRM_Screenshot_{time.strftime('%Y%m%d_%H%M%S')}.png"
        pyautogui.screenshot().save(f)
        return f"Screenshot le liya boss: {f}"

    @function_tool()
    async def request_shutdown(self, context: RunContext) -> str:
        """Shutdown se pehle confirmation maango."""
        return 'User se exactly poochein: "PC shutdown karna hai boss? Please say YES to confirm." Sirf exact YES par confirm_shutdown chalayein.'

    @function_tool()
    async def confirm_shutdown(self, context: RunContext, confirmation: str) -> str:
        """Sirf exact YES par Windows shutdown."""
        if confirmation.strip().upper() != "YES":
            return "Shutdown cancelled boss."
        subprocess.Popen(["shutdown.exe", "/s", "/t", "5"])
        return "Confirmed boss, 5 second mein shutdown."


server = AgentServer()


@server.rtc_session(agent_name="my-agent")
async def my_agent(ctx: agents.JobContext):
    kwargs = dict(model=REALTIME_MODEL, voice=VOICE)
    try:
        llm = google.realtime.RealtimeModel(language=LANGUAGE, **kwargs)
    except TypeError:
        # Purane plugin version mein language param na ho to
        llm = google.realtime.RealtimeModel(**kwargs)

    session = AgentSession(llm=llm)

    if room_io is not None and ai_coustics is not None:
        await session.start(
            room=ctx.room,
            agent=Assistant(),
            room_options=room_io.RoomOptions(
                audio_input=room_io.AudioInputOptions(
                    noise_cancellation=ai_coustics.audio_enhancement(
                        model=ai_coustics.EnhancerModel.QUAIL_VF_S
                    )
                )
            ),
        )
    else:
        await session.start(room=ctx.room, agent=Assistant())

    await session.generate_reply(
        instructions=(
            "Greet the user in clear, warm Urdu. Say exactly: "
            "'Assalam o Alaikum! MRM par aapko khushamdeed boss. "
            "Main aapki kya madad kar sakti hoon?' Keep it short."
        )
    )


if __name__ == "__main__":
    print("=" * 60)
    print("  MRM URDU/HINDI VOICE AGENT — Muhammad Raza Mughal")
    print(f"  Model: {REALTIME_MODEL} | Voice: {VOICE} | Lang: {LANGUAGE}")
    print("=" * 60)
    agents.cli.run_app(server)