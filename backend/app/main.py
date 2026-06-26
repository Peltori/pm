import os

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .ai_routes import router as ai_router

app = FastAPI(title="Kanban Studio")

app.include_router(ai_router, prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


PROJECT_ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
STANDALONE_DIR = os.path.join(PROJECT_ROOT, "frontend", ".next", "standalone", "frontend")
PLACEHOLDER_DIR = os.path.join(PROJECT_ROOT, "frontend", "out")


def _get_static_dir():
    """Prefer Next.js standalone build, fall back to placeholder."""
    if os.path.isdir(STANDALONE_DIR):
        return STANDALONE_DIR
    return PLACEHOLDER_DIR


@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    """Serve frontend static files. Falls through to index.html for SPA routing."""
    static_dir = _get_static_dir()
    requested = os.path.normpath(os.path.join(static_dir, full_path))

    if os.path.isfile(requested):
        return FileResponse(requested)

    index_path = os.path.join(static_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)

    return {"error": "not found"}, 404
