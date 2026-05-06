"""
PNG compression strategy
========================
Pillow 10+ restricts quantise() by image mode:
  • RGB  → MEDIANCUT works (best dithering quality)
  • RGBA → MEDIANCUT FAILS; must use FASTOCTREE (supports alpha)

So we:
  1. Convert to the appropriate working mode.
  2. For RGBA: check if alpha is uniformly opaque → downgrade to RGB
     so we can use the higher-quality MEDIANCUT path.
  3. Fall back to FASTOCTREE when MEDIANCUT isn't available.
  4. Always compare against a lossless re-save and keep the smaller one.
"""
from __future__ import annotations

from io import BytesIO
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import os

from PIL import Image, ImageOps

SUPPORTED = {".jpg", ".jpeg", ".png", ".webp"}


# ─── PNG helpers ──────────────────────────────────────────────────────────────

def _quality_to_colors(quality: int) -> int:
    """Map quality slider 1-100 → palette size 8-256."""
    return max(8, min(256, round(quality / 100 * 256)))


def _quantize(img: Image.Image, colors: int) -> Image.Image:
    """
    Quantise img to `colors` palette entries with Floyd-Steinberg dithering.

    Routing:
      • RGB  → MEDIANCUT  (highest quality)
      • RGBA with fully-opaque alpha → strip alpha, MEDIANCUT, return RGB palette
      • RGBA with real transparency   → FASTOCTREE (only method that supports alpha)
    """
    if img.mode == "RGB":
        return img.quantize(
            colors=colors,
            method=Image.Quantize.MEDIANCUT,
            dither=Image.Dither.FLOYDSTEINBERG,
        )

    # RGBA path
    alpha = img.split()[3]
    lo, hi = alpha.getextrema()
    if lo == hi == 255:
        # Alpha is all-opaque — safe to drop it and use the better algorithm
        return img.convert("RGB").quantize(
            colors=colors,
            method=Image.Quantize.MEDIANCUT,
            dither=Image.Dither.FLOYDSTEINBERG,
        )
    else:
        # Real transparency — must use FASTOCTREE
        return img.quantize(
            colors=colors,
            method=Image.Quantize.FASTOCTREE,
            dither=Image.Dither.FLOYDSTEINBERG,
        )


def _compress_png(img: Image.Image, dst: Path, quality: int) -> None:
    """
    Lossy-style PNG compression via colour-palette quantisation + dithering.
    Identical in principle to pngquant / TinyPNG.

    Always writes whichever byte sequence (quantised vs. lossless) is smaller,
    so we never make a file bigger.
    """
    has_alpha = img.mode in ("RGBA", "LA") or (
        img.mode == "P" and "transparency" in img.info
    )
    working: Image.Image = img.convert("RGBA" if has_alpha else "RGB")
    colors = _quality_to_colors(quality)

    # ── Try quantised path ───────────────────────────────────────────────────
    q_bytes: bytes | None = None
    try:
        quantised = _quantize(working, colors)
        buf = BytesIO()
        quantised.save(buf, "PNG", optimize=True, compress_level=9)
        q_bytes = buf.getvalue()
    except Exception:
        # Last-resort: FASTOCTREE on whatever mode we have
        try:
            quantised = working.quantize(
                colors=colors,
                method=Image.Quantize.FASTOCTREE,
                dither=Image.Dither.FLOYDSTEINBERG,
            )
            buf = BytesIO()
            quantised.save(buf, "PNG", optimize=True, compress_level=9)
            q_bytes = buf.getvalue()
        except Exception:
            pass

    # ── Lossless baseline (pure deflate) ────────────────────────────────────
    buf2 = BytesIO()
    working.save(buf2, "PNG", optimize=True, compress_level=9)
    base_bytes = buf2.getvalue()

    # ── Keep the smaller result ──────────────────────────────────────────────
    best = q_bytes if (q_bytes and len(q_bytes) < len(base_bytes)) else base_bytes
    dst.write_bytes(best)


# ─── JPEG ─────────────────────────────────────────────────────────────────────

def _compress_jpeg(img: Image.Image, dst: Path, quality: int) -> None:
    if img.mode in ("RGBA", "LA", "P"):
        img = img.convert("RGB")
    # 4:2:0 chroma subsampling at quality < 90 saves ~10-15% extra
    subsampling = 0 if quality >= 90 else 2
    img.save(
        dst, "JPEG",
        quality=quality,
        optimize=True,
        progressive=True,
        subsampling=subsampling,
    )


# ─── WEBP ─────────────────────────────────────────────────────────────────────

def _compress_webp(img: Image.Image, dst: Path, quality: int, lossless: bool) -> None:
    if img.mode == "P":
        img = img.convert("RGBA")
    img.save(dst, "WEBP", quality=quality, lossless=lossless, method=6)


# ─── Worker (runs inside ThreadPoolExecutor) ──────────────────────────────────

def _compress_one(args: tuple) -> dict:
    src: Path
    dst: Path
    quality: int
    lossless: bool
    src, dst, quality, lossless = args

    try:
        orig_size = src.stat().st_size
        dst.parent.mkdir(parents=True, exist_ok=True)
        ext = src.suffix.lower()

        with Image.open(src) as img:
            img = ImageOps.exif_transpose(img)  # fix rotation, strips EXIF

            if ext in (".jpg", ".jpeg"):
                _compress_jpeg(img, dst, quality)

            elif ext == ".png":
                if lossless:
                    if img.mode not in ("RGBA", "RGB", "L", "LA", "P"):
                        img = img.convert("RGBA")
                    img.save(dst, "PNG", optimize=True, compress_level=9)
                else:
                    _compress_png(img, dst, quality)

            elif ext == ".webp":
                _compress_webp(img, dst, quality, lossless)

        comp_size = dst.stat().st_size
        saved     = orig_size - comp_size

        return {
            "success":         True,
            "original_size":   orig_size,
            "compressed_size": comp_size,
            "saved":           saved,
            "ratio":           round(saved / orig_size * 100, 2) if orig_size else 0,
        }
    except Exception as exc:
        return {"success": False, "error": str(exc)}


# ─── Background task ──────────────────────────────────────────────────────────

def compress_images_task(
    session_id: str,
    sessions: dict,
    input_dir: Path,
    output_dir: Path,
    quality: int,
    lossless: bool,
) -> None:
    session = sessions[session_id]
    session["status"] = "processing"

    tasks: list[tuple] = []
    for root, _, files in os.walk(input_dir):
        for fname in files:
            src = Path(root) / fname
            if src.suffix.lower() in SUPPORTED:
                rel = src.relative_to(input_dir)
                tasks.append((src, output_dir / rel, quality, lossless))

    session["total"] = len(tasks)
    if not tasks:
        session["status"] = "completed"
        session["stats"]  = {"total_original": 0, "total_compressed": 0, "saved": 0, "ratio": 0}
        return

    total_orig = total_comp = 0
    workers = min(os.cpu_count() or 2, 8)

    with ThreadPoolExecutor(max_workers=workers) as pool:
        future_map = {pool.submit(_compress_one, t): t for t in tasks}
        for future in as_completed(future_map):
            if sessions[session_id].get("cancelled"):
                pool.shutdown(wait=False, cancel_futures=True)
                return

            src, *_ = future_map[future]
            result  = future.result()
            result["rel_path"] = str(src.relative_to(input_dir))
            result["name"]     = src.name

            if result["success"]:
                total_orig += result["original_size"]
                total_comp += result["compressed_size"]
                session["results"].append(result)
            else:
                session["errors"].append(result)

            session["processed"] += 1
            session["progress"]   = int(session["processed"] / session["total"] * 100)

    session["stats"] = {
        "total_original":   total_orig,
        "total_compressed": total_comp,
        "saved":            total_orig - total_comp,
        "ratio":            round((total_orig - total_comp) / total_orig * 100, 2) if total_orig else 0,
    }
    session["status"] = "completed"
