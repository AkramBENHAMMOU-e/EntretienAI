from __future__ import annotations
import sys
from typing import Type
from pydantic import BaseModel, Field
from crewai.tools import BaseTool


class AskCandidateInput(BaseModel):
    question: str = Field(..., description="The exact question to display to the candidate.")


class AskCandidateTool(BaseTool):
    name: str = "AskCandidateTool"
    description: str = (
        "Prompt the candidate in the terminal and wait for their typed answer. "
        "Use this tool to collect real answers during the interview."
    )
    args_schema: Type[BaseModel] = AskCandidateInput

    def _run(self, question: str) -> str:
        try:
            print("\n[INTERVIEW QUESTION]", question, flush=True)
            print("[Please type your answer and press Enter]", flush=True)
            # Read one line; if stdin is not interactive, this may raise
            answer = input().strip()
            if not answer:
                return "(no answer provided)"
            return answer
        except Exception:
            # Non-interactive environment or unexpected error
            return "(error: no interactive input available)"

