from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db import init_db
from app.models import HealthResponse
from app.routes import notes, graph, sessions

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/health", response_model=HealthResponse, response_model_by_alias=True)
def health():
    return HealthResponse(status="ok")


app.include_router(notes.router)
app.include_router(graph.router)
app.include_router(sessions.router)
