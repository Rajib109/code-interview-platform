# pyright: ignore[reportMissingImports]
from fastapi import FastAPI, HTTPException
# pyright: ignore[reportMissingImports]
from pydantic import BaseModel
import docker
import tempfile
import os
import requests

app = FastAPI(title="Code Execution Engine")

# Initialize the Docker client
try:
    client = docker.from_env()
except docker.errors.DockerException as e:
    print(f"Error connecting to Docker daemon: {e}")
    client = None

class CodeExecutionRequest(BaseModel):
    code: str
    problem_id: str

@app.get("/health")
def health_check():
    docker_status = "connected" if client else "disconnected"
    return {"status": "healthy", "docker": docker_status}

@app.post("/execute")
async def execute_code(request: CodeExecutionRequest):
    if not client:
        raise HTTPException(status_code=500, detail="Docker daemon unavailable")
    
    # 1. Create an ephemeral directory for this specific execution
    with tempfile.TemporaryDirectory() as temp_dir:
        source_file_path = os.path.join(temp_dir, "main.cpp")
        
        # 2. Write the raw C++ string to the file
        with open(source_file_path, "w") as f:
            f.write(request.code)
            
        container = None
        try:
            # 3. Spin up the sandboxed container
            container = client.containers.run(
                image="code-sandbox",
                # Compile with basic optimizations, then execute if compilation succeeds
                # Command is a single-element list because the Dockerfile ENTRYPOINT already
                # provides ["/bin/sh", "-c"] — passing as a string would cause the SDK to
                # split it into multiple args, and /bin/sh -c only uses the first one.
                command=["g++ -O2 main.cpp -o main && ./main"],
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