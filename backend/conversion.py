from PIL import Image, ImageOps
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import os

# All formats we can convert to WEBP
CONVERTIBLE = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif", ".gif", ".webp"}


def _convert_one(args: tuple) -> dict:
    src: Path
    dst: Path
    quality: int
    lossless: bool
    src, dst, quality, lossless = args

    try:
        orig_size = src.stat().st_size
        dst.parent.mkdir(parents=True, exist_ok=True)

        with Image.open(src) as img:
            img = ImageOps.exif_transpose(img)

            # Normalise mode for WEBP compatibility
            if img.mode == "P":
                img = img.convert("RGBA")
            elif img.mode == "CMYK":
                img = img.convert("RGB")
            elif img.mode not in ("RGB", "RGBA", "L", "LA"):
                img = img.convert("RGBA")

            # GIF: take first frame
            if hasattr(img, "is_animated") and img.is_animated:
                img.seek(0)

            img.save(dst, "WEBP", quality=quality, lossless=lossless, method=6)

        conv_size = dst.stat().st_size
        saved = orig_size - conv_size

        return {
            "success": True,
            "original_size": orig_size,
            "converted_size": conv_size,
            "saved": saved,
            "ratio": round(saved / orig_size * 100, 2) if orig_size else 0,
        }
    except Exception as exc:
        return {"success": False, "error": str(exc)}


def convert_to_webp_task(
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
            if src.suffix.lower() in CONVERTIBLE:
                rel = src.relative_to(input_dir)
                dst = output_dir / rel.with_suffix(".webp")
                tasks.append((src, dst, quality, lossless))

    session["total"] = len(tasks)

    if not tasks:
        session["status"] = "completed"
        session["stats"] = {
            "total_original": 0, "total_converted": 0, "saved": 0, "ratio": 0
        }
        return

    total_orig = 0
    total_conv = 0
    workers = min(os.cpu_count() or 2, 8)

    with ThreadPoolExecutor(max_workers=workers) as pool:
        future_map = {pool.submit(_convert_one, t): t for t in tasks}

        for future in as_completed(future_map):
            if sessions[session_id].get("cancelled"):
                pool.shutdown(wait=False, cancel_futures=True)
                return

            src, dst, _, _ = future_map[future]
            result = future.result()
            result["rel_path"] = str(src.relative_to(input_dir))
            result["name"] = src.name
            result["output_name"] = dst.name

            if result["success"]:
                total_orig += result["original_size"]
                total_conv += result["converted_size"]
                session["results"].append(result)
            else:
                session["errors"].append(result)

            session["processed"] += 1
            session["progress"] = int(session["processed"] / session["total"] * 100)

    session["stats"] = {
        "total_original": total_orig,
        "total_converted": total_conv,
        "saved": total_orig - total_conv,
        "ratio": round((total_orig - total_conv) / total_orig * 100, 2) if total_orig else 0,
    }
    session["status"] = "completed"
