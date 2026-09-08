"""Routes for code execution and health-check endpoints."""

from fastapi import APIRouter, HTTPException

# pyrefly: ignore [missing-import]
from models.execution import CodeExecutionRequest

# pyrefly: ignore [missing-import]
from services.docker_runner import (
    execute_freeplay,
    execute_with_tests,
    is_docker_connected,
)

# pyrefly: ignore [missing-import]
from services.db import get_problem_from_db

router = APIRouter(tags=["Execution"])


@router.get("/health")
def health_check():
    """Quick liveness probe that also reports Docker connectivity."""
    docker_status = "connected" if is_docker_connected() else "disconnected"
    return {"status": "healthy", "docker": docker_status}


@router.post("/execute")
async def execute_code(request: CodeExecutionRequest):
    """
    Execute user-submitted C++ code.

    If a valid `problem_id` is provided, the code is tested against
    predefined test cases.  Otherwise it falls back to freeplay mode
    which simply compiles and runs with optional stdin.
    """
    if not request.problem_id:
        return execute_freeplay(request.code, request.stdin or "")

    problem = get_problem_from_db(request.problem_id)
    if not problem:
        # Fallback to freeplay if problem doesn't exist (or return error depending on requirements)
        return execute_freeplay(request.code, request.stdin or "")

    return execute_with_tests(request.code, problem.get("test_cases", []))
