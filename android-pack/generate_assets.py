import math
import os

from PIL import Image, ImageDraw


ROOT = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(ROOT)
RES = os.path.join(ROOT, "android", "app", "src", "main", "res")
SS = 4


def hex_rgba(value, alpha=255):
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4)) + (alpha,)


def render_icon(size, background=True):
    canvas = Image.new("RGBA", (size * SS, size * SS), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    cx = cy = size * SS / 2
    k = (size * SS) / 512

    if background:
        radius = 112 * k
        draw.rounded_rectangle(
            (0, 0, size * SS, size * SS),
            radius=radius,
            fill=hex_rgba("#f9f9f7"),
        )

    def point(x, y):
        return (cx + (x - 256) * k, cy + (y - 256) * k)

    def ellipse_at(x, y, r, fill=None, outline=None, width=1):
        p = point(x, y)
        r *= k
        box = (p[0] - r, p[1] - r, p[0] + r, p[1] + r)
        draw.ellipse(box, fill=fill, outline=outline, width=max(1, round(width * k)))

    rings = [
        (160, 0.2),
        (110, 0.3),
        (60, 0.4),
    ]
    for radius, alpha in rings:
        ellipse_at(256, 256, radius, outline=hex_rgba("#c96442", int(alpha * 255)))

    # Static equivalent of the SVG sweep: center to top, arc clockwise to NE.
    sweep_r = 160 * k
    center = point(256, 256)
    points = [center]
    for angle_deg in range(270, 317):
        rad = math.radians(angle_deg)
        points.append((center[0] + sweep_r * math.cos(rad), center[1] + sweep_r * math.sin(rad)))
    points.append(center)
    draw.polygon(points, fill=hex_rgba("#c96442", 38))

    ellipse_at(256, 256, 10, fill=hex_rgba("#c96442"))
    ellipse_at(340, 180, 7, fill=hex_rgba("#4a7ab8"))
    ellipse_at(190, 320, 7, fill=hex_rgba("#d97757"))
    ellipse_at(310, 340, 5, fill=hex_rgba("#b8922a"))

    return canvas.resize((size, size), Image.Resampling.LANCZOS)


def write(path, image):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    image.save(path)


def full_square(size):
    icon = render_icon(size, background=True)
    bg = Image.new("RGBA", (size, size), hex_rgba("#f9f9f7"))
    return Image.alpha_composite(bg, icon).convert("RGB")


DENSITIES = {
    "mdpi": 1,
    "hdpi": 1.5,
    "xhdpi": 2,
    "xxhdpi": 3,
    "xxxhdpi": 4,
}

for density, scale in DENSITIES.items():
    mipmap = os.path.join(RES, f"mipmap-{density}")
    legacy_size = round(48 * scale)
    foreground_size = round(108 * scale)
    legacy = render_icon(legacy_size, background=True)
    foreground = render_icon(foreground_size, background=False)
    write(os.path.join(mipmap, "ic_launcher.png"), legacy)
    write(os.path.join(mipmap, "ic_launcher_round.png"), legacy)
    write(os.path.join(mipmap, "ic_launcher_foreground.png"), foreground)

write(os.path.join(PROJECT_ROOT, "icons", "icon-192.png"), full_square(192))
write(os.path.join(PROJECT_ROOT, "icons", "icon-512.png"), full_square(512))
write(os.path.join(PROJECT_ROOT, "icon_preview_512.png"), full_square(512))
