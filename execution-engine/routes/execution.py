"""Routes for code execution and health-check endpoints."""

# pyrefly: ignore [missing-import]
from fastapi import APIRouter

from data.problems import PROBLEMS_DB
from models.execution import CodeExecutionRequest
from services.docker_runner import (
    execute_freeplay,
    execute_with_tests,
    is_docker_connected,
)

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
    problem = PROBLEMS_DB.get(request.problem_id) if request.problem_id else None

    if not problem:
        return execute_freeplay(request.code, request.stdin or "")

    return execute_with_tests(request.code, problem["test_cases"])
