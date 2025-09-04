from __future__ import annotations
import threading
import uuid
from dataclasses import dataclass, field
from typing import Dict, Optional, List


@dataclass
class QAState:
    question: Optional[str] = None
    answer: Optional[str] = None
    waiting_event: threading.Event = field(default_factory=threading.Event)
    transcript: List[dict] = field(default_factory=list)
    done: bool = False
    error: Optional[str] = None


class InterviewBroker:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._sessions: Dict[str, QAState] = {}

    def new_session(self) -> str:
        sid = str(uuid.uuid4())
        with self._lock:
            self._sessions[sid] = QAState()
        return sid

    def mark_done(self, sid: str) -> None:
        st = self._sessions.get(sid)
        if not st:
            return
        st.done = True
        # Release any waiter just in case
        st.waiting_event.set()

    def mark_error(self, sid: str, msg: str) -> None:
        st = self._sessions.get(sid)
        if not st:
            return
        st.error = msg
        st.done = True
        st.waiting_event.set()

    def ask(self, sid: str, question: str) -> str:
        st = self._sessions.get(sid)
        if not st:
            raise RuntimeError("Unknown session")
        # Record question and wait for answer
        with self._lock:
            st.question = question
            st.answer = None
            print(f"[broker] set question for {sid}: {question[:80]!r}")
            st.waiting_event.clear()
        # Wait until answer is provided
        st.waiting_event.wait()
        with self._lock:
            ans = st.answer or ""
            st.transcript.append({"question": question, "answer": ans})
            print(f"[broker] got answer for {sid}: len={len(ans)}")
            return ans

    def get_question(self, sid: str) -> Optional[str]:
        st = self._sessions.get(sid)
        if not st:
            return None
        with self._lock:
            q = st.question
        # Debug log (short)
        if q:
            print(f"[broker] get_question {sid}: delivering question (len={len(q)})")
        else:
            print(f"[broker] get_question {sid}: no question yet")
        return q

    def answer(self, sid: str, answer: str) -> None:
        st = self._sessions.get(sid)
        if not st:
            raise RuntimeError("Unknown session")
        with self._lock:
            st.answer = answer
            print(f"[broker] answer for {sid}: len={len(answer)}")
            # Clear current question (frontend can fetch next)
            st.question = None
        # Wake the waiting tool (outside lock to avoid waking into locked state)
        st.waiting_event.set()

    def status(self, sid: str) -> dict:
        st = self._sessions.get(sid)
        if not st:
            return {"exists": False}
        return {
            "exists": True,
            "done": st.done,
            "error": st.error,
            "has_question": st.question is not None,
            "transcript_len": len(st.transcript),
        }

    def transcript(self, sid: str) -> List[dict]:
        st = self._sessions.get(sid)
        return list(st.transcript) if st else []


broker = InterviewBroker()

# Thread-local context to carry the current session id inside the Crew execution thread
session_context = threading.local()

