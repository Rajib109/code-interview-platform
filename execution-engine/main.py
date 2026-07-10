"""
Code Execution Engine — FastAPI Application Entry Point.

This is a slim orchestrator: it creates the app, attaches middleware,
and mounts route modules.  All business logic lives in `services/`.
"""

# Load environment variables from .env before anything else
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv
load_dotenv()

# pyrefly: ignore [missing-import]
from fastapi import FastAPI
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware

from config import ALLOWED_ORIGINS, APP_TITLE
from routes.ai import router as ai_router
from routes.execution import router as execution_router

# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------

app = FastAPI(title=APP_TITLE)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Router registration
# ---------------------------------------------------------------------------

app.include_router(execution_router)
app.include_router(ai_router)

# ---------------------------------------------------------------------------
# Dev server
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    # pyrefly: ignore [missing-import]
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)