"""Pydantic schemas for the AI assistant hint endpoint."""

# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field


class HintRequest(BaseModel):
    """Payload describing what kind of AI hint the user wants."""
    problem_description: str = Field(
        ..., description="The markdown text or raw string describing the DSA problem."
    )
    current_code: str = Field(
        ..., description="The user's current C++ submission."
    )
    request_type: str = Field(
        "general",
        description="Type of assistance: 'general', 'edge_case', or 'complexity'",
    )


class ComplexityData(BaseModel):
    """Time/space complexity estimates."""
    current: str
    target: str


class HintResponse(BaseModel):
    """Structured AI response returned to the frontend."""
    hintType: str
    message: str
    estimatedComplexity: ComplexityData
