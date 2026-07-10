from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import docker
import tempfile
import os
import requests
from mock_db import PROBLEMS_DB

app = FastAPI(title="Code Execution Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # Allow Next.js frontend
    allow_credentials=True,
    allow_methods=["*"], # Allow POST, GET, OPTIONS, etc.
    allow_headers=["*"],
)
# Initialize the Docker client
try:
    client = docker.from_env()
except docker.errors.DockerException as e:
    print(f"Error connecting to Docker daemon: {e}")
    client = None

class CodeExecutionRequest(BaseModel):
    code: str
    problem_id: str | None = None
    stdin: str | None = None

@app.get("/health")
def health_check():
    docker_status = "connected" if client else "disconnected"
    return {"status": "healthy", "docker": docker_status}

@app.post("/execute")
async def execute_code(request: CodeExecutionRequest):
    if not client:
        raise HTTPException(status_code=500, detail="Docker daemon unavailable")
    
    problem = PROBLEMS_DB.get(request.problem_id) if request.problem_id else None
    if not problem:
        # Fallback to freeplay if no problem ID matches
        return execute_freeplay(request.code, request.stdin or "")
    
    with tempfile.TemporaryDirectory() as temp_dir:
        # 1. Write the user's source code
        source_file_path = os.path.join(temp_dir, "main.cpp")
        with open(source_file_path, "w") as f:
            f.write(request.code)
            
        # 2. Write all test case inputs to files in the temp directory
        # We will name them input_0.txt, input_1.txt, etc.
        for i, tc in enumerate(problem["test_cases"]):
            input_path = os.path.join(temp_dir, f"input_{i}.txt")
            with open(input_path, "w") as f:
                f.write(tc["input"])
                
        # 3. Construct the execution command
        # This compiles the code ONCE. If successful, it loops through the inputs 
        # and runs the binary for each one, piping the results to output files.
        # 3. Construct the execution command
        run_commands = []
        for i in range(len(problem["test_cases"])):
            run_commands.append(f"./main < input_{i}.txt > output_{i}.txt")
            
        # Create the raw pipeline string
        pipeline = f"g++ -O2 main.cpp -o main && {' && '.join(run_commands)}"
        
        # Pass it as a single-element list to prevent Docker ENTRYPOINT double-wrapping
        full_command = [pipeline]

        container = None
        try:
            container = client.containers.run(
                image="code-sandbox",
                command=full_command,
                volumes={temp_dir: {'bind': '/app', 'mode': 'rw'}},
                working_dir="/app",
                user="sandboxuser",
                mem_limit="256m",
                memswap_limit="256m",
                pids_limit=50,
                network_disabled=True,
                detach=True
            )
            
            # 5-second timeout for the ENTIRE test suite
            result = container.wait(timeout=5)
            logs = container.logs().decode("utf-8")
            
            if result["StatusCode"] != 0:
                return {
                    "status": "error", 
                    "message": "Compilation or runtime error", 
                    "details": logs
                }
                
            # 4. Evaluate the outputs
            results = []
            all_passed = True
            
            for i, tc in enumerate(problem["test_cases"]):
                output_path = os.path.join(temp_dir, f"output_{i}.txt")
                
                if not os.path.exists(output_path):
                    results.append({"id": tc["id"], "passed": False, "error": "No output generated"})
                    all_passed = False
                    continue
                    
                with open(output_path, "r") as f:
                    actual_output = f.read()
                    
                # Strip trailing whitespace to prevent trivial formatting failures
                passed = actual_output.strip() == tc["expected_output"].strip()
                if not passed:
                    all_passed = False
                    
                results.append({
                    "id": tc["id"],
                    "passed": passed,
                    "input": tc["input"],
                    "expected": tc["expected_output"],
                    "actual": actual_output
                })
                
            return {
                "status": "success" if all_passed else "failed",
                "total_cases": len(problem["test_cases"]),
                "passed_cases": sum(1 for r in results if r["passed"]),
                "results": results
            }
            
        except requests.exceptions.ReadTimeout:
            return {
                "status": "error", 
                "message": "Time Limit Exceeded (TLE)", 
                "details": "Your code took too long to execute. Check for infinite loops."
            }
        finally:
            if container:
                try:
                    container.remove(force=True)
                except docker.errors.APIError:
                    pass
def execute_freeplay(code: str, stdin: str = ""):
    """Run user code without test cases (freeplay / sandbox mode)."""
    if not client:
        raise HTTPException(status_code=500, detail="Docker daemon unavailable")

    # 1. Create an ephemeral directory for this specific execution
    with tempfile.TemporaryDirectory() as temp_dir:
        source_file_path = os.path.join(temp_dir, "main.cpp")

        # 2. Write the raw C++ string to the file
        with open(source_file_path, "w") as f:
            f.write(code)

        # Write stdin input to a file so it can be piped into the binary
        input_file_path = os.path.join(temp_dir, "input.txt")
        with open(input_file_path, "w") as f:
            f.write(stdin)

        container = None
        try:
            # 3. Spin up the sandboxed container
            container = client.containers.run(
                image="code-sandbox",
                # Compile with basic optimizations, then execute if compilation succeeds
                # Command is a single-element list because the Dockerfile ENTRYPOINT already
                # provides ["/bin/sh", "-c"] — passing as a string would cause the SDK to
                # split it into multiple args, and /bin/sh -c only uses the first one.
                command=["g++ -O2 main.cpp -o main && ./main < input.txt"],
                # Mount our temp directory to /app inside the container
                volumes={temp_dir: {'bind': '/app', 'mode': 'rw'}},
                working_dir="/app",
                user="sandboxuser",
                # --- Security Hardening ---
                mem_limit="256m",           # Prevent massive memory allocations
                memswap_limit="256m",       # Disable swap to enforce the memory limit strictly
                pids_limit=50,              # Prevent fork bombs
                network_disabled=True,      # Complete network isolation
                detach=True                 # Run in background so we can manually manage the timeout
            )

            # 4. Wait for execution with a strict 5-second timeout
            result = container.wait(timeout=5)

            # 5. Capture the output (combines stdout and stderr)
            logs = container.logs().decode("utf-8")

            if result["StatusCode"] != 0:
                return {
                    "status": "error",
                    "message": "Execution or compilation failed",
                    "output": logs
                }

            return {
                "status": "success",
                "output": logs
            }

        except requests.exceptions.ReadTimeout:
            # The code took longer than 5 seconds to run (e.g., infinite loop)
            return {
                "status": "error",
                "message": "Time Limit Exceeded (TLE)",
                "output": "Execution timed out after 5 seconds."
            }
        except Exception as e:
            return {
                "status": "error",
                "message": "System error",
                "output": str(e)
            }
        finally:
            # 6. Ironclad cleanup: Ensure the container is destroyed no matter what
            if container:
                try:
                    container.remove(force=True)
                except docker.errors.APIError:
                    pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)