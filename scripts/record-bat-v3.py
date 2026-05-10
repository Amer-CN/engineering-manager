"""Find 工程管家 terminal window and record it to GIF with a clear countdown."""
import sys
import os
import time
from pathlib import Path

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

import mss
import pygetwindow as gw
from PIL import Image

OUTPUT = Path("E:/测试/terminal-demo.gif")
DURATION = 20
FPS = 8
SCALE = 0.6
COLORS = 64


def find_target_window():
    """Find the CMD window running 工程管家."""
    candidates = []
    for w in gw.getAllWindows():
        t = w.title.strip()
        if not t or w.width < 200 or w.height < 100:
            continue
        if w.left <= -32000:
            continue

        tl = t.lower()

        # Skip the Electron app window
        if '工程管家 - 工程' in t or 'engineering manager' in tl:
            # This is the app, not the terminal
            if 'cmd' not in tl and 'terminal' not in tl and 'powershell' not in tl:
                continue

        score = 0
        # Strongly prefer CMD/terminal windows
        if ('cmd' in tl or 'command prompt' in tl) and ('工程' in t or 'npm' in tl or 'node' in tl or 'dev' in tl):
            score = 100
        elif 'cmd' in tl or 'command prompt' in tl:
            score = 80
        elif 'engineering manager' in tl and ('cmd' in tl or 'terminal' in tl):
            score = 75
        elif 'powershell' in tl or 'terminal' in tl:
            score = 60
        elif 'npm' in tl or 'node' in tl:
            score = 50
        elif '工程管家' in t:
            # Low-priority fallback — likely the app window
            score = 10

        if score > 0:
            candidates.append((score, w, t))

    candidates.sort(key=lambda x: x[0], reverse=True)

    if not candidates:
        print("No suitable terminal window found!")
        print("\nAvailable windows:")
        for w in gw.getAllWindows():
            t = w.title.strip()
            if t and w.width > 100 and w.left > -32000:
                print(f"  [{w.left},{w.top}] {w.width}x{w.height}: {t[:80]}")
        return None, None

    # Show top candidates
    print("Found candidate windows:")
    for i, (score, w, t) in enumerate(candidates[:5]):
        print(f"  [{i}] [{w.left},{w.top}] {w.width}x{w.height}: {t[:80]} (score={score})")

    best_score, best_win, best_title = candidates[0]
    print(f"\nAuto-selected: {best_title[:80]}")
    return best_win, best_title


def main():
    print("=" * 50)
    print("  工程管家 Terminal Recorder")
    print("=" * 50)

    win, title = find_target_window()
    if not win:
        sys.exit(1)

    region = {"left": win.left, "top": win.top, "width": win.width, "height": win.height}
    total_frames = int(DURATION * FPS)
    frame_interval = 1.0 / FPS
    scale_w, scale_h = int(win.width * SCALE), int(win.height * SCALE)

    print(f"\nRecording: {DURATION}s @ {FPS}fps = {total_frames} frames")
    print(f"Window: {win.width}x{win.height} -> output {scale_w}x{scale_h}")
    print()

    # Clear countdown
    for i in range(5, 0, -1):
        print(f"  >>>  Recording starts in {i}...  <<<")
        time.sleep(1)

    print("\n  >>>  RECORDING NOW!  <<<\n")

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
            remaining = DURATION - elapsed
            bar = "=" * int(elapsed / DURATION * 30) + " " * (30 - int(elapsed / DURATION * 30))
            print(f"  [{bar}] {elapsed:.0f}s / {DURATION}s (remaining: {remaining:.0f}s)", end="\r")

            sleep_time = frame_interval - (time.time() - t0)
            if sleep_time > 0:
                time.sleep(sleep_time)

    print("\n\n  Saving GIF...")
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
    print(f"  Size: {size_mb:.2f} MB | Frames: {len(frames)} | Duration: {DURATION}s\n")


if __name__ == "__main__":
    main()
