from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image


ASSET_NAMES = [
    "axe_projectile.png",
    "magic_wand_projectile.png",
    "treasure_chest.png",
    "boss_lava_beast.png",
    "thousand_edge_projectile.png",
    "holy_wand_projectile.png",
    "death_spiral_projectile.png",
    "unholy_vespers_orbit_book.png",
    "soul_eater_core.png",
]


def is_background_pixel(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, a = pixel

    if a == 0:
        return False

    brightness = max(r, g, b)
    darkness = min(r, g, b)
    saturation = brightness - darkness

    return brightness >= 185 and darkness >= 175 and saturation <= 45


def edge_points(width: int, height: int) -> list[tuple[int, int]]:
    points: list[tuple[int, int]] = []

    for x in range(width):
        points.append((x, 0))
        points.append((x, height - 1))

    for y in range(1, height - 1):
        points.append((0, y))
        points.append((width - 1, y))

    return points


def remove_connected_background(image: Image.Image) -> tuple[Image.Image, int]:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    queue: deque[tuple[int, int]] = deque()
    visited: set[tuple[int, int]] = set()

    for point in edge_points(width, height):
        x, y = point
        if is_background_pixel(pixels[x, y]):
            queue.append(point)
            visited.add(point)

    while queue:
        x, y = queue.popleft()

        for next_x, next_y in (
            (x - 1, y),
            (x + 1, y),
            (x, y - 1),
            (x, y + 1),
        ):
            if (
                next_x < 0
                or next_y < 0
                or next_x >= width
                or next_y >= height
                or (next_x, next_y) in visited
            ):
                continue

            if not is_background_pixel(pixels[next_x, next_y]):
                continue

            visited.add((next_x, next_y))
            queue.append((next_x, next_y))

    for x, y in visited:
        r, g, b, _a = pixels[x, y]
        pixels[x, y] = (r, g, b, 0)

    return rgba, len(visited)


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    asset_dir = root / "public" / "assets" / "images"

    for asset_name in ASSET_NAMES:
        asset_path = asset_dir / asset_name

        if not asset_path.exists():
            print(f"missing: {asset_path}")
            continue

        with Image.open(asset_path) as image:
            processed, transparent_count = remove_connected_background(image)
            processed.save(asset_path)

        print(f"processed: {asset_name} transparent_pixels={transparent_count}")


if __name__ == "__main__":
    main()
