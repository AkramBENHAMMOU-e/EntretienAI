from __future__ import annotations
import json
from typing import Type, Dict, Any
from pydantic import BaseModel, Field, PrivateAttr
from crewai.tools import BaseTool


class SimCandidateInput(BaseModel):
    question: str = Field(..., description="Question to answer with a simulated response.")


class SimulatedCandidateTool(BaseTool):
    name: str = "SimulatedCandidateTool"
    description: str = (
        "Return a simulated candidate answer for a given question. "
        "Use for testing end-to-end when no real candidate is present."
    )
    args_schema: Type[BaseModel] = SimCandidateInput
    _answers: Dict[str, str] = PrivateAttr(default_factory=dict)

    def __init__(self, scripted_answers: Dict[str, str] | None = None, **data: Any):
        super().__init__(**data)
        self._answers = scripted_answers or {}

    def _run(self, question: str) -> str:
        # Simple heuristic: exact match first, otherwise generic reply
        answer = self._answers.get(question)
        if answer:
            return answer
        # Fallback generic response
        return (
            "Réponse simulée: Je procéderais à une clarification, ensuite j'expliquerais les "
            "principes clés et donnerais un exemple concret basé sur mon expérience."
        )

