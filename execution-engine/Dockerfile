# Use the highly optimized Alpine base
FROM alpine:3.19

# Install g++ for C++ compilation
# We keep it minimal—no extra libraries unless explicitly needed
RUN apk add --no-cache g++ 

# Create a non-root user to run the untrusted code
# This is a critical security step (Privilege Dropping)
RUN adduser -D sandboxuser

# Create a directory for our execution workspace and set ownership
WORKDIR /app
RUN chown sandboxuser:sandboxuser /app

# Switch to the restricted user
USER sandboxuser

# Set the entrypoint to a shell so our Python backend can pass commands to it
ENTRYPOINT ["/bin/sh", "-c"]