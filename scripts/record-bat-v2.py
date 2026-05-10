"""Kill node, launch 工程管家.bat in new terminal, record that window."""
import sys
import os
import time
import subprocess
from pathlib import Path

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

import mss
import pygetwindow as gw
from PIL import Image

OUTPUT = Path("E:/测试/terminal-demo.gif")
DURATION = 20  # seconds
FPS = 8
SCALE = 0.6
COLORS = 64


def find_window_by_title(keywords, min_w=300, min_h=200):
    for w in gw.getAllWindows():
        t = w.title.strip()
        if not t or w.width < min_w or w.height < min_h:
            continue
        if any(k.lower() in t.lower() for k in keywords):
            return w, t
    return None, None


def main():
    # Kill existing node processes so bat starts fresh
    print("Stopping existing node processes...")
    subprocess.run(
        ["powershell", "-Command", "Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force"],
        capture_output=True,
    )
    time.sleep(1)

    # Record current windows to detect new ones
    before = set()
    for w in gw.getAllWindows():
        t = w.title.strip()
        if t:
            before.add(t)

    # Launch bat via cmd /c start — opens in new window
    print("Launching 工程管家.bat in new terminal...")
    subprocess.Popen(
        ['cmd', '/c', 'start', '工程管家.bat'],
        cwd=r'E:\测试',
        shell=False,
    )
    time.sleep(2)

    # Find the terminal window - look for "工程管家", "Engineering Manager", or a new cmd window
    print("Looking for terminal window...")
    win = None
    title = None
    keywords = ['工程管家', 'engineering manager', 'npm', 'node']

    for attempt in range(20):
        for w in gw.getAllWindows():
            t = w.title.strip()
            if not t or t in before:
                continue
            if w.width < 300 or w.height < 150:
                continue
            # Check if it's a cmd/terminal window (cmd.exe or Windows Terminal)
            is_terminal = 'cmd' in t.lower() or 'terminal' in t.lower() or 'powershell' in t.lower()
            is_target = any(k.lower() in t.lower() for k in keywords)
            if is_terminal or is_target:
                win = w
                title = t
                break
        if win:
            break
        print(f"  Attempt {attempt+1}/20...")
        time.sleep(1)

    # Fallback: look for any cmd window not in before set
    if not win:
        print("Trying fallback - any new cmd window...")
        for w in gw.getAllWindows():
            t = w.title.strip()
            if t and t not in before and w.width > 300 and w.height > 150:
                if 'cmd' in t.lower() or 'terminal' in t.lower():
                    win, title = w, t
                    break

    if not win:
        print("ERROR: Terminal window not found!")
        print("Current windows:")
        for w in gw.getAllWindows():
            t = w.title.strip()
            if t and w.width > 100 and '32000' not in str(w.left):
                print(f"  [{w.left},{w.top}] {w.width}x{w.height}: {t[:80]}")
        sys.exit(1)

    print(f"Recording: [{win.left},{win.top}] {win.width}x{win.height} - {title}")

    region = {"left": win.left, "top": win.top, "width": win.width, "height": win.height}
    total_frames = int(DURATION * FPS)
    frame_interval = 1.0 / FPS
    scale_w, scale_h = int(win.width * SCALE), int(win.height * SCALE)

    print(f"\n{DURATION}s @ {FPS}fps = {total_frames} frames, output {scale_w}x{scale_h}\n")

    for i in range(3, 0, -1):
        print(f"  Starting in {i}...")
        time.sleep(1)
    print("  RECORDING!\n")

    frames = []
    with mss.mss() as sct:
        start = time.time()
        for i in range(total_frames):
            t0 = time.time()
            img = sct.grab(region)
            pil_img = Image.frombytes("RGB", img.size, img.bgra, "raw", "BGRX")
            if SCALE != 1.0:
                pil_img = pil_img.resize((scale_w, scale_h), Image.LANCZOS)
            pil_img = pil_img.quantize(colors=COLORS, method=Image.Quantize.MEDIANCUT)
            frames.append(pil_img)

            elapsed = time.time() - start
            print(f"  [{i+1}/{total_frames}] {elapsed:.1f}s", end="\r")

            sleep_time = frame_interval - (time.time() - t0)
            if sleep_time > 0:
                time.sleep(sleep_time)

    print("\n  Saving GIF...")
    frames[0].save(
        str(OUTPUT),
        save_all=True,
        append_images=frames[1:],
        duration=int(frame_interval * 1000),
        loop=0,
        optimize=True,
        disposal=2,
    )

    size_mb = OUTPUT.stat().st_size / (1024 * 1024)
    print(f"  Done! {OUTPUT}")
    print(f"  Size: {size_mb:.2f} MB | Frames: {len(frames)}\n")


if __name__ == "__main__":
    main()
