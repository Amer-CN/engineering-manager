#!/usr/bin/env python3
"""Generate logo PNGs for three themes."""
from PIL import Image, ImageDraw
import math

# Logo viewBox: 0 0 18 18, triangle paths
# Outer: M2 15.5 L9 2.5 L16 15.5 Z
# Inner: M5 14 L9 6 L13 14 Z

SIZE = 512
SCALE = SIZE / 18

def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def generate_logo(accent_color, violet_color, bg_color, filename):
    """Generate a logo PNG with gradient triangle."""
    img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Outer triangle
    outer = [(2*SCALE, 15.5*SCALE), (9*SCALE, 2.5*SCALE), (16*SCALE, 15.5*SCALE)]

    # Draw gradient triangle (simplified: use accent color)
    draw.polygon(outer, fill=accent_color)

    # Inner triangle (cutout)
    inner = [(5*SCALE, 14*SCALE), (9*SCALE, 6*SCALE), (13*SCALE, 14*SCALE)]
    draw.polygon(inner, fill=bg_color)

    img.save(filename, 'PNG')
    print(f"Generated: {filename}")

# White theme
generate_logo(
    accent_color=hex_to_rgb('#3b82f6'),
    violet_color=hex_to_rgb('#6366f1'),
    bg_color=hex_to_rgb('#f8fafc'),
    filename='public/logo-white.png'
)

# Graphite theme (accent: oklch(68% 0.16 38) ≈ orange)
generate_logo(
    accent_color=hex_to_rgb('#e67e22'),
    violet_color=hex_to_rgb('#8b5cf6'),
    bg_color=hex_to_rgb('#0f172a'),
    filename='public/logo-graphite.png'
)

# Sandstone theme (accent: oklch(60% 0.19 38) ≈ amber)
generate_logo(
    accent_color=hex_to_rgb('#d97706'),
    violet_color=hex_to_rgb('#f59e0b'),
    bg_color=hex_to_rgb('#1c1917'),
    filename='public/logo-sandstone.png'
)

print("Done!")
