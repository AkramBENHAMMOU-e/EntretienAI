from __future__ import annotations
from typing import Type
from pydantic import BaseModel, Field
from crewai.tools import BaseTool
from testai.web.broker import broker, session_context


class WebAskCandidateInput(BaseModel):
    question: str = Field(..., description="The exact question to display to the candidate (web UI).")


class WebAskCandidateTool(BaseTool):
    # Keep the original tool name so LLM prompts that say "Use AskCandidateTool" still match
    name: str = "AskCandidateTool"
    description: str = (
        "Ask the candidate a question via the web frontend and wait for the HTTP answer (web mode)."
    )
    args_schema: Type[BaseModel] = WebAskCandidateInput

    def _run(self, question: str) -> str:
        # Retrieve session id from thread-local context set by the web backend when starting the crew
        sid = getattr(session_context, "session_id", None)
        if not sid:
            # Fallback: act like simulated
            print("[web-tool] session not set; returning empty answer")
            return ""
        # Ask through the broker and wait for answer
        print(f"[web-tool] waiting for answer: session={sid} question={question!r}")
        answer = broker.ask(sid, question)
        print(f"[web-tool] got answer: session={sid} answer_len={len(answer)}")
        return answer

