#!/usr/bin/env python3
"""Generate logo PNGs for three themes - centered version."""
from PIL import Image, ImageDraw

SIZE = 512

def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def generate_logo(accent_color, bg_color, filename):
    """Generate a logo PNG with centered triangle."""
    img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # SVG viewBox is 0 0 18 18
    # Original triangle coordinates
    # Outer: M2 15.5 L9 2.5 L16 15.5 Z
    # Inner: M5 14 L9 6 L13 14 Z

    # Calculate offset to center the triangle visually
    # Original bounding box center: y = (2.5 + 15.5) / 2 = 9
    # But visually the triangle is bottom-heavy, so shift up by ~1.5 units
    y_offset = 1.5  # Shift up by 1.5 SVG units

    # Outer triangle with offset
    outer = [
        (int(2 * SIZE / 18), int((15.5 - y_offset) * SIZE / 18)),  # bottom-left
        (int(9 * SIZE / 18), int((2.5 - y_offset) * SIZE / 18)),   # top-center
        (int(16 * SIZE / 18), int((15.5 - y_offset) * SIZE / 18))   # bottom-right
    ]

    # Inner triangle with offset
    inner = [
        (int(5 * SIZE / 18), int((14 - y_offset) * SIZE / 18)),    # bottom-left
        (int(9 * SIZE / 18), int((6 - y_offset) * SIZE / 18)),     # top-center
        (int(13 * SIZE / 18), int((14 - y_offset) * SIZE / 18))    # bottom-right
    ]

    # Draw outer triangle with accent color
    draw.polygon(outer, fill=accent_color)

    # Draw inner triangle with background color (cutout effect)
    draw.polygon(inner, fill=bg_color)

    img.save(filename, 'PNG')
    print(f"Generated: {filename}")

# White theme: blue accent, light background
generate_logo(
    accent_color=hex_to_rgb('#3b82f6'),
    bg_color=hex_to_rgb('#f8fafc'),
    filename='public/logo-white.png'
)

# Graphite theme: orange accent, dark background
generate_logo(
    accent_color=hex_to_rgb('#e67e22'),
    bg_color=hex_to_rgb('#0f172a'),
    filename='public/logo-graphite.png'
)

# Sandstone theme: amber accent, warm dark background
generate_logo(
    accent_color=hex_to_rgb('#d97706'),
    bg_color=hex_to_rgb('#1c1917'),
    filename='public/logo-sandstone.png'
)

print("Done!")
