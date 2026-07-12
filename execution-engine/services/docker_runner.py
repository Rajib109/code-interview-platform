"""
Docker sandbox runner.

Manages the Docker client connection and provides functions
for executing user-submitted C++ code inside isolated containers.
"""

import os
import tempfile

import docker
import requests

# pyrefly: ignore [missing-import]
from fastapi import HTTPException

from config import (
    EXECUTION_TIMEOUT_SECONDS,
    MEMORY_LIMIT,
    PID_LIMIT,
    SANDBOX_IMAGE,
    SWAP_LIMIT,
)

# ---------------------------------------------------------------------------
# Docker client (singleton)
# ---------------------------------------------------------------------------

try:
    client = docker.from_env()
except docker.errors.DockerException as e:
    print(f"Error connecting to Docker daemon: {e}")
    client = None


def is_docker_connected() -> bool:
    """Return True if the Docker daemon is reachable."""
    return client is not None


# ---------------------------------------------------------------------------
# Core execution helpers
# ---------------------------------------------------------------------------


def execute_with_tests(code: str, test_cases: list[dict]) -> dict:
    """
    Compile *code* once, then run the resulting binary against every
    test case.  Returns a structured result with per-case pass/fail.
    """
    if not client:
        raise HTTPException(status_code=500, detail="Docker daemon unavailable")

    with tempfile.TemporaryDirectory() as temp_dir:
        # 1. Write the user's source code
        source_file_path = os.path.join(temp_dir, "main.cpp")
        with open(source_file_path, "w") as f:
            f.write(code)

        # 2. Write all test case inputs
        for i, tc in enumerate(test_cases):
            input_path = os.path.join(temp_dir, f"input_{i}.txt")
            with open(input_path, "w") as f:
                f.write(tc["input"])

        # 3. Build the compile-then-run pipeline
        run_commands = [
            f"./main < input_{i}.txt > output_{i}.txt" for i in range(len(test_cases))
        ]
        pipeline = f"g++ -O2 main.cpp -o main && {' && '.join(run_commands)}"

        container = None
        try:
            container = client.containers.run(
                image=SANDBOX_IMAGE,
                command=[pipeline],
                volumes={temp_dir: {"bind": "/app", "mode": "rw"}},
                working_dir="/app",
                user="sandboxuser",
                mem_limit=MEMORY_LIMIT,
                memswap_limit=SWAP_LIMIT,
                pids_limit=PID_LIMIT,
                network_disabled=True,
                detach=True,
            )

            result = container.wait(timeout=EXECUTION_TIMEOUT_SECONDS)
            logs = container.logs().decode("utf-8")

            if result["StatusCode"] != 0:
                return {
                    "status": "error",
                    "message": "Compilation or runtime error",
                    "details": logs,
                }

            # 4. Evaluate outputs
            results = []
            all_passed = True

            for i, tc in enumerate(test_cases):
                output_path = os.path.join(temp_dir, f"output_{i}.txt")

                if not os.path.exists(output_path):
                    results.append(
                        {
                            "id": tc["id"],
                            "passed": False,
                            "error": "No output generated",
                        }
                    )
                    all_passed = False
                    continue

                with open(output_path, "r") as f:
                    actual_output = f.read()

                passed = actual_output.strip() == tc["expected_output"].strip()
                if not passed:
                    all_passed = False

                results.append(
                    {
                        "id": tc["id"],
                        "passed": passed,
                        "input": tc["input"],
                        "expected": tc["expected_output"],
                        "actual": actual_output,
                    }
                )

            return {
                "status": "success" if all_passed else "failed",
                "total_cases": len(test_cases),
                "passed_cases": sum(1 for r in results if r["passed"]),
                "results": results,
            }

        except requests.exceptions.ReadTimeout:
            return {
                "status": "error",
                "message": "Time Limit Exceeded (TLE)",
                "details": "Your code took too long to execute. Check for infinite loops.",
            }
        finally:
            if container:
                try:
                    container.remove(force=True)
                except docker.errors.APIError:
                    pass


def execute_freeplay(code: str, stdin: str = "") -> dict:
    """Run user code without test cases (freeplay / sandbox mode)."""
    if not client:
        raise HTTPException(status_code=500, detail="Docker daemon unavailable")

    with tempfile.TemporaryDirectory() as temp_dir:
        source_file_path = os.path.join(temp_dir, "main.cpp")
        with open(source_file_path, "w") as f:
            f.write(code)

        input_file_path = os.path.join(temp_dir, "input.txt")
        with open(input_file_path, "w") as f:
            f.write(stdin)

        container = None
        try:
            container = client.containers.run(
                image=SANDBOX_IMAGE,
                command=["g++ -O2 main.cpp -o main && ./main < input.txt"],
                volumes={temp_dir: {"bind": "/app", "mode": "rw"}},
                working_dir="/app",
                user="sandboxuser",
                mem_limit=MEMORY_LIMIT,
                memswap_limit=SWAP_LIMIT,
                pids_limit=PID_LIMIT,
                network_disabled=True,
                detach=True,
            )

            result = container.wait(timeout=EXECUTION_TIMEOUT_SECONDS)
            logs = container.logs().decode("utf-8")

            if result["StatusCode"] != 0:
                return {
                    "status": "error",
                    "message": "Execution or compilation failed",
                    "output": logs,
                }

            return {"status": "success", "output": logs}

        except requests.exceptions.ReadTimeout:
            return {
                "status": "error",
                "message": "Time Limit Exceeded (TLE)",
                "output": "Execution timed out after 5 seconds.",
            }
        except Exception as e:
            return {
                "status": "error",
                "message": "System error",
                "output": str(e),
            }
        finally:
            if container:
                try:
                    container.remove(force=True)
                except docker.errors.APIError:
                    pass
