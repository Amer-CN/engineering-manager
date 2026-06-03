#!/usr/bin/env python3
"""Generate gradient logo PNGs for three themes."""
from PIL import Image, ImageDraw
import math

SIZE = 512
SCALE = SIZE / 18

def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def lerp_color(c1, c2, t):
    """Linear interpolate between two RGB colors."""
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))

def generate_gradient_triangle(img, points, color1, color2, direction='diagonal'):
    """Draw a gradient-filled triangle."""
    draw = ImageDraw.Draw(img)
    x_min = min(p[0] for p in points)
    y_min = min(p[1] for p in points)
    x_max = max(p[0] for p in points)
    y_max = max(p[1] for p in points)

    # Create mask for triangle
    mask = Image.new('L', (SIZE, SIZE), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.polygon(points, fill=255)

    # Create gradient
    gradient = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    for y in range(SIZE):
        for x in range(SIZE):
            if mask.getpixel((x, y)) > 0:
                if direction == 'diagonal':
                    t = (x + y) / (2 * SIZE)
                elif direction == 'vertical':
                    t = y / SIZE
                else:
                    t = x / SIZE
                t = max(0, min(1, t))
                color = lerp_color(color1, color2, t)
                gradient.putpixel((x, y), color + (255,))

    img.paste(gradient, (0, 0), mask)

def generate_logo(accent1, accent2, bg_color, filename):
    """Generate a logo PNG with gradient triangle."""
    img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))

    # Outer triangle with gradient
    outer = [(2*SCALE, 15.5*SCALE), (9*SCALE, 2.5*SCALE), (16*SCALE, 15.5*SCALE)]
    generate_gradient_triangle(img, outer, accent1, accent2, 'diagonal')

    # Inner triangle (cutout)
    draw = ImageDraw.Draw(img)
    inner = [(5*SCALE, 14*SCALE), (9*SCALE, 6*SCALE), (13*SCALE, 14*SCALE)]
    draw.polygon(inner, fill=bg_color)

    img.save(filename, 'PNG')
    print(f"Generated: {filename}")

# White theme: blue → indigo
generate_logo(
    accent1=hex_to_rgb('#3b82f6'),
    accent2=hex_to_rgb('#6366f1'),
    bg_color=hex_to_rgb('#f8fafc'),
    filename='public/logo-white.png'
)

# Graphite theme: orange → violet (oklch approx)
generate_logo(
    accent1=hex_to_rgb('#e67e22'),
    accent2=hex_to_rgb('#8b5cf6'),
    bg_color=hex_to_rgb('#0f172a'),
    filename='public/logo-graphite.png'
)

# Sandstone theme: amber → amber (oklch approx)
generate_logo(
    accent1=hex_to_rgb('#d97706'),
    accent2=hex_to_rgb('#f59e0b'),
    bg_color=hex_to_rgb('#1c1917'),
    filename='public/logo-sandstone.png'
)

print("Done!")
