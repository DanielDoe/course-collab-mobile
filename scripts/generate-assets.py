from PIL import Image, ImageDraw
import os
import sys

PRIMARY = (88, 44, 131)
WHITE = (255, 255, 255)
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
assets_dir = os.path.join(root, "assets")
os.makedirs(assets_dir, exist_ok=True)


def draw_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    margin = int(size * 0.08)
    radius = int(size * 0.22)
    d.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=radius,
        fill=PRIMARY,
    )
    cx, cy = size // 2, size // 2
    cap_w = int(size * 0.42)
    cap_h = int(size * 0.12)
    d.polygon(
        [
            (cx - cap_w // 2, cy - cap_h),
            (cx, cy - cap_h - int(size * 0.08)),
            (cx + cap_w // 2, cy - cap_h),
            (cx + cap_w // 3, cy),
            (cx - cap_w // 3, cy),
        ],
        fill=WHITE,
    )
    d.rectangle(
        [cx - cap_w // 3, cy, cx + cap_w // 3, cy + int(size * 0.06)],
        fill=WHITE,
    )
    tassel_x = cx + cap_w // 3
    d.line(
        [(tassel_x, cy - cap_h), (tassel_x + int(size * 0.06), cy + int(size * 0.04))],
        fill=WHITE,
        width=max(2, size // 80),
    )
    d.ellipse(
        [
            tassel_x + int(size * 0.03),
            cy + int(size * 0.03),
            tassel_x + int(size * 0.09),
            cy + int(size * 0.09),
        ],
        fill=WHITE,
    )
    return img


def draw_splash(w: int, h: int) -> Image.Image:
    img = Image.new("RGB", (w, h), PRIMARY)
    icon = draw_icon(min(w, h) // 4)
    ix = (w - icon.width) // 2
    iy = (h - icon.height) // 2 - int(h * 0.06)
    img.paste(icon, (ix, iy), icon)
    return img


draw_icon(1024).save(os.path.join(assets_dir, "icon.png"))
draw_splash(2732, 2732).save(os.path.join(assets_dir, "splash.png"))
print("Generated icon + splash")
