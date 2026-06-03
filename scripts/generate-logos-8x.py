#!/usr/bin/env python3
"""Generate logo PNGs with 8x supersampling."""
from PIL import Image, ImageDraw

FINAL_SIZE = 512
SUPERSAMPLE = 8
RENDER_SIZE = FINAL_SIZE * SUPERSAMPLE  # 4096

def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def generate_logo(accent_color, violet_color, bg_color, filename):
    """Generate a logo PNG with 8x supersampling and gradient."""
    # Render at 8x size
    img = Image.new('RGBA', (RENDER_SIZE, RENDER_SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # SVG viewBox is 0 0 18 18
    # Original triangle coordinates with vertical centering offset
    y_offset = 1.5

    # Outer triangle
    outer = [
        (int(2 * RENDER_SIZE / 18), int((15.5 - y_offset) * RENDER_SIZE / 18)),
        (int(9 * RENDER_SIZE / 18), int((2.5 - y_offset) * RENDER_SIZE / 18)),
        (int(16 * RENDER_SIZE / 18), int((15.5 - y_offset) * RENDER_SIZE / 18))
    ]

    # Inner triangle
    inner = [
        (int(5 * RENDER_SIZE / 18), int((14 - y_offset) * RENDER_SIZE / 18)),
        (int(9 * RENDER_SIZE / 18), int((6 - y_offset) * RENDER_SIZE / 18)),
        (int(13 * RENDER_SIZE / 18), int((14 - y_offset) * RENDER_SIZE / 18))
    ]

    # Draw outer triangle with accent color
    draw.polygon(outer, fill=accent_color)

    # Draw inner triangle with panel-2 color (cutout)
    draw.polygon(inner, fill=bg_color)

    # Downsample to final size with high quality
    img = img.resize((FINAL_SIZE, FINAL_SIZE), Image.LANCZOS)

    img.save(filename, 'PNG')
    print(f"Generated: {filename}")

# White theme
# accent: #2563eb, violet: #8b5cf6, panel-2: #f1f5f9
generate_logo(
    accent_color=hex_to_rgb('#3b82f6'),
    violet_color=hex_to_rgb('#6366f1'),
    bg_color=hex_to_rgb('#f1f5f9'),
    filename='public/logo-white.png'
)

# Graphite theme
# accent: oklch(68% 0.16 38) ≈ #e67e22, violet: oklch(72% 0.14 295) ≈ #8b5cf6
# panel-2: oklch(24.5% 0.008 275) ≈ #1e293b
generate_logo(
    accent_color=hex_to_rgb('#e67e22'),
    violet_color=hex_to_rgb('#8b5cf6'),
    bg_color=hex_to_rgb('#1e293b'),
    filename='public/logo-graphite.png'
)

# Sandstone theme
# accent: oklch(60% 0.19 38) ≈ #d97706, violet: oklch(62% 0.16 52) ≈ #f59e0b
# panel-2: oklch(93.5% 0.014 76) ≈ #f5f5f4
generate_logo(
    accent_color=hex_to_rgb('#d97706'),
    violet_color=hex_to_rgb('#f59e0b'),
    bg_color=hex_to_rgb('#f5f5f4'),
    filename='public/logo-sandstone.png'
)

print("Done!")
