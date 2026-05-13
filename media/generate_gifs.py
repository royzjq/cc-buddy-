"""Generate state GIFs from the per-animal sprite PNGs.

For each animal we produce 4 state GIFs plus a 'hero' compilation:
  {animal}-idle.gif       idle frame with periodic blink
  {animal}-working.gif    typing_a/b/c cycle
  {animal}-question.gif   alert, gentle bob
  {animal}-done.gif       celebrate, gentle bob
  {animal}-hero.gif       idle -> working -> question -> done sequence

All frames are normalized to the same canvas per animal (max width/height
across that animal's source PNGs), bottom-center aligned, transparent
background. This keeps the buddy's feet anchored so frames don't jitter.

Run from the repo root:
    python media/generate_gifs.py
"""
from __future__ import annotations

import os
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SPRITES = ROOT / "assets" / "sprites"
OUT = ROOT / "media"
OUT.mkdir(exist_ok=True)

ANIMALS = [
    "beagle",
    "chipmunk",
    "evil_beagle",
    "hamster",
    "orange_cat",
    "red_panda",
    "tuxedo_cat",
]

STATES = ("idle", "blink", "alert", "celebrate", "typing_a", "typing_b", "typing_c")


def load(animal: str, state: str) -> Image.Image:
    return Image.open(SPRITES / f"{animal}_{state}.png").convert("RGBA")


def canvas_size(frames: list[Image.Image]) -> tuple[int, int]:
    w = max(f.width for f in frames)
    h = max(f.height for f in frames)
    return w, h


def place(frame: Image.Image, size: tuple[int, int], y_offset: int = 0) -> Image.Image:
    """Bottom-center align frame on a transparent canvas of given size."""
    w, h = size
    canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    x = (w - frame.width) // 2
    y = h - frame.height + y_offset
    canvas.paste(frame, (x, y), frame)
    return canvas


def save_gif(path: Path, frames: list[Image.Image], durations: list[int], loop: int = 0) -> None:
    if len(frames) == 1:
        frames = frames + frames  # PIL won't loop a 1-frame GIF; duplicate.
        durations = durations + durations
    frames[0].save(
        path,
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=loop,
        disposal=2,
        optimize=False,
        transparency=0,
    )
    print(f"  wrote {path.relative_to(ROOT)}")


def build_for_animal(animal: str) -> None:
    print(f"[{animal}]")
    sprites = {s: load(animal, s) for s in STATES}
    size = canvas_size(list(sprites.values()))

    placed = {k: place(v, size) for k, v in sprites.items()}

    # idle: long idle, brief blink, long idle (looped)
    idle_frames = [placed["idle"], placed["blink"], placed["idle"]]
    idle_durations = [2200, 140, 2600]
    save_gif(OUT / f"{animal}-idle.gif", idle_frames, idle_durations)

    # working: typing_a -> b -> c -> b cycle
    work_frames = [placed["typing_a"], placed["typing_b"], placed["typing_c"], placed["typing_b"]]
    work_durations = [160, 160, 160, 160]
    save_gif(OUT / f"{animal}-working.gif", work_frames, work_durations)

    # question: alert with a gentle 2-frame bob (offset 2px)
    alert_up = placed["alert"]
    alert_dn = place(sprites["alert"], size, y_offset=-2)
    q_frames = [alert_up, alert_dn, alert_up, alert_dn]
    q_durations = [320, 320, 320, 320]
    save_gif(OUT / f"{animal}-question.gif", q_frames, q_durations)

    # done: celebrate with a gentle bob
    celeb_up = placed["celebrate"]
    celeb_dn = place(sprites["celebrate"], size, y_offset=-3)
    d_frames = [celeb_up, celeb_dn, celeb_up, celeb_dn]
    d_durations = [240, 240, 240, 240]
    save_gif(OUT / f"{animal}-done.gif", d_frames, d_durations)

    # hero: idle (1.2s) -> working (1.6s of typing cycle) -> question (1.2s) -> done (1.4s)
    hero_frames: list[Image.Image] = []
    hero_durations: list[int] = []
    hero_frames += [placed["idle"], placed["blink"], placed["idle"]]
    hero_durations += [600, 140, 480]
    for _ in range(2):
        hero_frames += [placed["typing_a"], placed["typing_b"], placed["typing_c"], placed["typing_b"]]
        hero_durations += [160, 160, 160, 160]
    hero_frames += [alert_up, alert_dn, alert_up, alert_dn]
    hero_durations += [300, 300, 300, 300]
    hero_frames += [celeb_up, celeb_dn, celeb_up, celeb_dn, celeb_up]
    hero_durations += [220, 220, 220, 220, 400]
    save_gif(OUT / f"{animal}-hero.gif", hero_frames, hero_durations)


def main() -> None:
    for a in ANIMALS:
        try:
            build_for_animal(a)
        except FileNotFoundError as e:
            print(f"  skip {a}: {e}")


if __name__ == "__main__":
    main()
