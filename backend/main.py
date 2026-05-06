import asyncio
import json
import shutil
import uuid
from pathlib import Path
from typing import List

from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from compression import compress_images_task
from conversion import convert_to_webp_task

app = FastAPI(title="ImagePress API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TEMP_DIR = Path("./temp")
sessions: dict = {}  # shared across compress + convert


# ─── Startup ──────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup_event() -> None:
    if TEMP_DIR.exists():
        shutil.rmtree(TEMP_DIR)
    TEMP_DIR.mkdir(exist_ok=True)


# ─── Health ───────────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok"}


# ─── Shared helpers ───────────────────────────────────────────────────────────

async def _save_uploads(
    files: List[UploadFile],
    relative_paths: list,
    input_dir: Path,
) -> int:
    for i, upload in enumerate(files):
        rel = relative_paths[i] if i < len(relative_paths) else upload.filename
        dest = input_dir / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        content = await upload.read()
        dest.write_bytes(content)
    return len(files)


def _make_session(total: int) -> dict:
    return {
        "status": "pending",
        "progress": 0,
        "total": total,
        "processed": 0,
        "results": [],
        "errors": [],
        "stats": {},
        "cancelled": False,
    }


# ─── Compress ─────────────────────────────────────────────────────────────────

@app.post("/api/compress")
async def start_compression(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    quality: int = Form(85),
    lossless: str = Form("false"),
    paths: str = Form("[]"),
) -> dict:
    session_id = str(uuid.uuid4())
    session_dir = TEMP_DIR / session_id
    input_dir  = session_dir / "input"
    output_dir = session_dir / "output"
    input_dir.mkdir(parents=True)
    output_dir.mkdir(parents=True)

    relative_paths = json.loads(paths)
    total = await _save_uploads(files, relative_paths, input_dir)
    sessions[session_id] = _make_session(total)

    background_tasks.add_task(
        compress_images_task,
        session_id, sessions, input_dir, output_dir,
        quality, lossless.lower() == "true",
    )
    return {"session_id": session_id, "total_files": total}


# ─── Convert to WEBP ──────────────────────────────────────────────────────────

@app.post("/api/convert")
async def start_conversion(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    quality: int = Form(85),
    lossless: str = Form("false"),
    paths: str = Form("[]"),
) -> dict:
    session_id = str(uuid.uuid4())
    session_dir = TEMP_DIR / session_id
    input_dir  = session_dir / "input"
    output_dir = session_dir / "output"
    input_dir.mkdir(parents=True)
    output_dir.mkdir(parents=True)

    relative_paths = json.loads(paths)
    total = await _save_uploads(files, relative_paths, input_dir)
    sessions[session_id] = _make_session(total)

    background_tasks.add_task(
        convert_to_webp_task,
        session_id, sessions, input_dir, output_dir,
        quality, lossless.lower() == "true",
    )
    return {"session_id": session_id, "total_files": total}


# ─── Shared: SSE progress ─────────────────────────────────────────────────────

@app.get("/api/progress/{session_id}")
async def stream_progress(session_id: str) -> StreamingResponse:
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    async def event_generator():
        while True:
            if session_id not in sessions:
                yield f"data: {json.dumps({'error': 'session gone'})}\n\n"
                break

            data = {k: v for k, v in sessions[session_id].items() if k != "cancelled"}
            yield f"data: {json.dumps(data)}\n\n"

            if data["status"] in ("completed", "failed", "cancelled"):
                break

            await asyncio.sleep(0.25)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ─── Shared: download ZIP ─────────────────────────────────────────────────────

@app.get("/api/download/{session_id}")
async def download_result(session_id: str) -> StreamingResponse:
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = sessions[session_id]
    if session["status"] != "completed":
        raise HTTPException(status_code=400, detail="Processing not yet complete")

    session_dir = TEMP_DIR / session_id
    output_dir  = session_dir / "output"
    zip_base    = session_dir / "result"

    shutil.make_archive(str(zip_base), "zip", str(output_dir))
    zip_path = zip_base.with_suffix(".zip")

    def stream_zip():
        with open(zip_path, "rb") as fh:
            while chunk := fh.read(65536):
                yield chunk
        shutil.rmtree(session_dir, ignore_errors=True)
        sessions.pop(session_id, None)

    return StreamingResponse(
        stream_zip(),
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="imagepress_{session_id[:8]}.zip"'
        },
    )


# ─── Shared: cancel ───────────────────────────────────────────────────────────

@app.delete("/api/session/{session_id}")
async def cancel_session(session_id: str) -> dict:
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    sessions[session_id]["cancelled"] = True
    sessions[session_id]["status"] = "cancelled"

    session_dir = TEMP_DIR / session_id
    shutil.rmtree(session_dir, ignore_errors=True)
    sessions.pop(session_id, None)

    return {"message": "Cancelled"}
