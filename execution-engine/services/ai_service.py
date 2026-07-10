"""
AI hint generation service.

Wraps the Google GenAI (Gemini) client and exposes a single
`generate_hint()` function that the route layer can call.
"""

import os

# pyrefly: ignore [missing-import]
from google import genai
# pyrefly: ignore [missing-import]
from google.genai import types

from models.ai import HintRequest, HintResponse

# ---------------------------------------------------------------------------
# Gemini client (singleton)
# ---------------------------------------------------------------------------

client = genai.Client()

# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

SYSTEM_INSTRUCTION = """\
You are an elite, Socratic technical interview coach. Your task is to analyze \
the provided Problem Description and the candidate's current C++ code to \
provide a helpful, minimal hint or a time/space complexity analysis.

CRITICAL RULES:
1. DO NOT provide the solution code, partial code, or pseudocode under any circumstances.
2. DO NOT explicitly tell the user what data structure or algorithm to use \
   unless they are on the right track but stuck on a syntactic blocker.
3. Focus on pointing out logical flaws, unhandled edge cases, or inefficiencies.
4. Keep the hint concise (under 3 sentences).
"""


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def is_configured() -> bool:
    """Return True when the GEMINI_API_KEY env-var is set."""
    return bool(os.environ.get("GEMINI_API_KEY"))


def generate_hint(payload: HintRequest) -> HintResponse:
    """
    Call Gemini 2.5 Flash with the user's code + problem description
    and return a structured HintResponse.
    """
    user_prompt = f"""\
PROBLEM DESCRIPTION:
{payload.problem_description}

USER'S CURRENT C++ CODE:
{payload.current_code}

REQUEST FOCUS:
Provide a hint specializing in: {payload.request_type}
"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=user_prompt,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            response_mime_type="application/json",
            response_schema=HintResponse,
            temperature=0.2,
        ),
    )

    return HintResponse.model_validate_json(response.text)
