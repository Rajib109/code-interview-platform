"""
Application configuration constants.

Centralizes CORS settings, app metadata, and execution limits
so they can be tuned from a single file.
"""

# --- FastAPI Metadata ---
APP_TITLE = "Code Execution Engine"

# --- CORS ---
ALLOWED_ORIGINS = [
    "http://localhost:3000",  # Next.js frontend (dev)
]

# --- Docker Sandbox Limits ---
MEMORY_LIMIT = "256m"
SWAP_LIMIT = "256m"
PID_LIMIT = 50
EXECUTION_TIMEOUT_SECONDS = 5
SANDBOX_IMAGE = "code-sandbox"
