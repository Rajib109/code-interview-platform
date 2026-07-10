"""Pydantic schemas for code execution requests and responses."""

# pyrefly: ignore [missing-import]
from pydantic import BaseModel


class CodeExecutionRequest(BaseModel):
    """Payload sent by the frontend when the user clicks 'Run Code'."""
    code: str
    problem_id: str | None = None
    stdin: str | None = None
