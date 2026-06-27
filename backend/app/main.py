from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .ai_routes import router as ai_router
from .routes.boards import router as boards_router
from .database import init_db, seed


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    seed()
    yield


app = FastAPI(title="Kanban Studio", lifespan=lifespan)

app.include_router(boards_router, prefix="/api")
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
