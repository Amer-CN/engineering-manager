"""Record a specific window by title to an optimized GIF."""
import sys
import time
import argparse
from pathlib import Path
import subprocess

import mss
import pygetwindow as gw
from PIL import Image


def find_window(title_contains):
    """Find a window whose title contains the given string."""
    for w in gw.getAllWindows():
        if title_contains.lower() in w.title.lower():
            return w
    return None


def main():
    parser = argparse.ArgumentParser(description="Record a window to GIF")
    parser.add_argument("--title", "-t", required=True, help="Window title substring to find")
    parser.add_argument("--output", "-o", default="terminal-demo.gif", help="Output GIF path")
    parser.add_argument("--duration", "-d", type=int, default=15, help="Recording duration (seconds)")
    parser.add_argument("--fps", "-f", type=int, default=8, help="Frames per second")
    parser.add_argument("--launch", "-l", help="Command to launch before recording")
    parser.add_argument("--wait", "-w", type=int, default=2, help="Seconds to wait for window to appear")
    parser.add_argument("--scale", "-s", type=float, default=0.6, help="Scale factor")
    parser.add_argument("--colors", type=int, default=64, help="Color palette size")
    args = parser.parse_args()

    # Launch the command if provided
    if args.launch:
        print(f"Launching: {args.launch}")
        subprocess.Popen(args.launch, shell=True, creationflags=subprocess.CREATE_NEW_CONSOLE)
        print(f"Waiting {args.wait}s for window...")
        time.sleep(args.wait)

    # Find the target window
    print(f"Looking for window containing: {args.title}")
    win = None
    for attempt in range(10):
        win = find_window(args.title)
        if win and win.width > 0 and win.height > 0:
            break
        print(f"  Attempt {attempt+1}/10...")
        time.sleep(1)

    if not win:
        print("ERROR: Window not found!")
        print("Available windows:")
        for w in gw.getAllWindows():
            if w.title.strip():
                print(f"  - [{w.left},{w.top}] {w.width}x{w.height} : {w.title}")
        sys.exit(1)

    print(f"Found: [{win.left},{win.top}] {win.width}x{win.height} - {win.title}")

    region = {
        "left": win.left,
        "top": win.top,
        "width": win.width,
        "height": win.height,
    }

    fps = args.fps
    frame_interval = 1.0 / fps
    total_frames = int(args.duration * fps)

    scale_w = int(win.width * args.scale)
    scale_h = int(win.height * args.scale)

    print(f"\nRecording: {args.duration}s @ {fps}fps = {total_frames} frames")
    print(f"Output size: {scale_w}x{scale_h} with {args.colors} colors\n")

    # Countdown
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

            if args.scale != 1.0:
                pil_img = pil_img.resize((scale_w, scale_h), Image.LANCZOS)

            pil_img = pil_img.quantize(colors=args.colors, method=Image.Quantize.MEDIANCUT)
            frames.append(pil_img)

            elapsed = time.time() - start
            print(f"  [{i+1}/{total_frames}] {elapsed:.1f}s", end="\r")

            sleep_time = frame_interval - (time.time() - frame_start)
            if sleep_time > 0:
                time.sleep(sleep_time)

    # Save
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)

    print("\n  Saving...")
    frames[0].save(
        str(output),
        save_all=True,
        append_images=frames[1:],
        duration=int(frame_interval * 1000),
        loop=0,
        optimize=True,
        disposal=2,
    )

    size_mb = output.stat().st_size / (1024 * 1024)
    print(f"\n  Done: {output.absolute()}")
    print(f"  Size: {size_mb:.2f} MB | Frames: {len(frames)}\n")


if __name__ == "__main__":
    main()
