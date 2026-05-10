"""Screen recording to optimized GIF using mss + Pillow."""
import sys
import time
import argparse
from pathlib import Path

import mss
import numpy as np
from PIL import Image


def main():
    parser = argparse.ArgumentParser(description="Record screen region to GIF")
    parser.add_argument("--output", "-o", default="demo.gif", help="Output GIF path")
    parser.add_argument("--duration", "-d", type=int, default=20, help="Recording duration (seconds)")
    parser.add_argument("--fps", "-f", type=int, default=10, help="Frames per second")
    parser.add_argument("--monitor", "-m", type=int, default=1, help="Monitor index (1=primary)")
    parser.add_argument("--scale", "-s", type=float, default=0.5, help="Scale factor to reduce file size")
    parser.add_argument("--countdown", "-c", type=int, default=3, help="Countdown before recording starts")
    args = parser.parse_args()

    output = Path(args.output)
    fps = args.fps
    frame_interval = 1.0 / fps
    total_frames = int(args.duration * fps)

    # Countdown
    print(f"\n{'='*50}")
    print(f"  Screen GIF Recorder")
    print(f"  Duration: {args.duration}s | FPS: {fps} | Total: {total_frames} frames")
    print(f"  Output: {output.absolute()}")
    print(f"{'='*50}\n")
    for i in range(args.countdown, 0, -1):
        print(f"  Starting in {i}...")
        time.sleep(1)
    print("  RECORDING NOW!\n")

    frames = []
    with mss.mss() as sct:
        monitor = sct.monitors[args.monitor]
        # Show what region we're capturing
        print(f"  Monitor: {monitor['width']}x{monitor['height']} at ({monitor['left']},{monitor['top']})")
        if args.scale != 1.0:
            w, h = int(monitor['width'] * args.scale), int(monitor['height'] * args.scale)
            print(f"  Scaled output: {w}x{h}\n")

        start_time = time.time()
        for i in range(total_frames):
            frame_start = time.time()

            # Capture screen
            img = sct.grab(monitor)
            pil_img = Image.frombytes("RGB", img.size, img.bgra, "raw", "BGRX")

            # Resize to reduce file size
            if args.scale != 1.0:
                w, h = int(pil_img.width * args.scale), int(pil_img.height * args.scale)
                pil_img = pil_img.resize((w, h), Image.LANCZOS)

            # Quantize to 128 colors for smaller GIF
            pil_img = pil_img.quantize(colors=128, method=Image.Quantize.MEDIANCUT)
            frames.append(pil_img)

            # Progress
            elapsed = time.time() - start_time
            progress = (i + 1) / total_frames * 100
            print(f"  [{i+1}/{total_frames}] {progress:.0f}% | {elapsed:.1f}s elapsed", end="\r")

            # Maintain frame rate
            sleep_time = frame_interval - (time.time() - frame_start)
            if sleep_time > 0:
                time.sleep(sleep_time)

    print("\n  Saving GIF...")

    # Save as GIF with optimization
    output.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(
        str(output),
        save_all=True,
        append_images=frames[1:],
        duration=int(frame_interval * 1000),  # ms between frames
        loop=0,  # infinite loop
        optimize=True,
        disposal=2,
    )

    size_mb = output.stat().st_size / (1024 * 1024)
    print(f"\n  Done! Saved to: {output.absolute()}")
    print(f"  Size: {size_mb:.2f} MB | Frames: {len(frames)} | Duration: {args.duration}s\n")


if __name__ == "__main__":
    main()
