"""Optimize an existing GIF for sharing."""
import sys
from pathlib import Path
from PIL import Image, ImageSequence


def main():
    input_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("E:/测试/demo.gif")
    output_path = input_path.parent / f"{input_path.stem}_opt{input_path.suffix}"

    print(f"Loading: {input_path}")
    img = Image.open(input_path)

    frames = []
    durations = []
    i = 0
    for frame in ImageSequence.Iterator(img):
        i += 1
        # Skip every other frame to reduce FPS from 10 to 5
        if i % 2 == 0:
            continue
        # Convert to RGB then quantize to fewer colors
        converted = frame.convert("RGB")
        # Resize to 75% of current size
        w, h = int(converted.width * 0.7), int(converted.height * 0.7)
        converted = converted.resize((w, h), Image.LANCZOS)
        # Quantize to 64 colors
        quantized = converted.quantize(colors=64, method=Image.Quantize.MEDIANCUT)
        frames.append(quantized)
        durations.append(img.info.get('duration', 100) * 2)  # double duration for skipped frames

        if i % 20 == 0:
            print(f"  Processing frame {i}...")

    print(f"Saving {len(frames)} frames to {output_path}...")
    frames[0].save(
        output_path,
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        optimize=True,
        disposal=2,
    )

    size_mb = output_path.stat().st_size / (1024 * 1024)
    print(f"Done! {size_mb:.2f} MB")


if __name__ == "__main__":
    main()
