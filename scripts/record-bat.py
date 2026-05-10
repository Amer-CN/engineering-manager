"""Launch 工程管家.bat and record its terminal window."""
import sys
import os
import time
import subprocess
from pathlib import Path

# Fix encoding for Windows console
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

import mss
import pygetwindow as gw
from PIL import Image

BAT_PATH = Path("E:/测试/工程管家.bat")
OUTPUT = Path("E:/测试/terminal-demo.gif")
DURATION = 15  # seconds
FPS = 8
SCALE = 0.6
COLORS = 64


def find_new_window(before_titles, timeout=15):
    """Find a new window that appeared after before_titles was captured."""
    for _ in range(timeout):
        time.sleep(1)
        for w in gw.getAllWindows():
            t = w.title.strip()
            if not t or t in before_titles:
                continue
            if w.width < 200 or w.height < 100:
                continue
            # CMD windows or our target
            if any(k in t.lower() for k in ['cmd', 'engineer', 'npm', '工程管家', 'dev']):
                return w, t
    return None, None


def main():
    # Record current window titles
    print("Capturing current windows...")
    before = set()
    for w in gw.getAllWindows():
        t = w.title.strip()
        if t:
            before.add(t)
    print(f"  {len(before)} existing windows")

    # Launch bat file using os.startfile (opens in new CMD window natively)
    print(f"\nLaunching: {BAT_PATH}")
    os.startfile(str(BAT_PATH))

    # Find the new window
    print("Waiting for terminal window...")
    win, title = find_new_window(before, timeout=15)
    if not win:
        print("ERROR: Could not find new terminal window!")
        print("\nCurrent windows:")
        for w in gw.getAllWindows():
            t = w.title.strip()
            if t and w.width > 100:
                print(f"  [{w.left},{w.top}] {w.width}x{w.height}: {t[:80]}")
        sys.exit(1)

    print(f"Found: [{win.left},{win.top}] {win.width}x{win.height} - {title}")

    region = {"left": win.left, "top": win.top, "width": win.width, "height": win.height}
    total_frames = int(DURATION * FPS)
    frame_interval = 1.0 / FPS
    scale_w, scale_h = int(win.width * SCALE), int(win.height * SCALE)

    print(f"\nRecording: {DURATION}s @ {FPS}fps = {total_frames} frames")
    print(f"Output: {scale_w}x{scale_h}, {COLORS} colors\n")

    for i in range(3, 0, -1):
        print(f"  Starting in {i}...")
        time.sleep(1)
    print("  RECORDING!\n")

    frames = []
    with mss.mss() as sct:
        start = time.time()
        for i in range(total_frames):
            frame_start = time.time()
            img = sct.grab(region)
            pil_img = Image.frombytes("RGB", img.size, img.bgra, "raw", "BGRX")
            if SCALE != 1.0:
                pil_img = pil_img.resize((scale_w, scale_h), Image.LANCZOS)
            pil_img = pil_img.quantize(colors=COLORS, method=Image.Quantize.MEDIANCUT)
            frames.append(pil_img)

            elapsed = time.time() - start
            print(f"  [{i+1}/{total_frames}] {elapsed:.1f}s", end="\r")

            sleep_time = frame_interval - (time.time() - frame_start)
            if sleep_time > 0:
                time.sleep(sleep_time)

    print("\n  Saving GIF...")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
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
    print(f"\n  Done! {OUTPUT}")
    print(f"  Size: {size_mb:.2f} MB | Frames: {len(frames)}\n")


if __name__ == "__main__":
    main()
