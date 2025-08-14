from __future__ import annotations
import os
import json
import time
import uuid
from pathlib import Path
from typing import Type
from pydantic import BaseModel, Field, PrivateAttr
from crewai.tools import BaseTool


class WebAskInput(BaseModel):
    question: str = Field(..., description="The exact question to display on the web UI.")


class WebAskCandidateTool(BaseTool):
    name: str = "WebAskCandidateTool"
    description: str = (
        "Post a question to the local web interview UI and wait until the candidate submits an answer. "
        "Run the web server separately: `python -m testai.webui.server` (default port 8765)."
    )
    args_schema: Type[BaseModel] = WebAskInput
    _store_path: Path = PrivateAttr()

    def __init__(self, store_path: str | None = None, **data):
        super().__init__(**data)
        # Determine storage path robustly across platforms
        env_path = os.getenv("WEB_UI_STORE")
        base_path = Path(store_path or env_path or (Path("runtime") / "web_interview.json"))
        try:
            self._store_path = base_path.expanduser()
        except Exception:
            self._store_path = Path("runtime") / "web_interview.json"
        # Ensure directory exists
        try:
            self._store_path.parent.mkdir(parents=True, exist_ok=True)
        except OSError:
            # Fallback to local runtime dir if the provided path is invalid
            self._store_path = Path("runtime") / "web_interview.json"
            self._store_path.parent.mkdir(parents=True, exist_ok=True)
        if not self._store_path.exists():
            with self._store_path.open("w", encoding="utf-8") as f:
                json.dump({"items": []}, f)

    def _load(self) -> dict:
        try:
            with self._store_path.open("r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {"items": []}

    def _save(self, data: dict) -> None:
        tmp = self._store_path.with_suffix(self._store_path.suffix + ".tmp")
        with tmp.open("w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        os.replace(str(tmp), str(self._store_path))

    def _run(self, question: str) -> str:
        data = self._load()
        qid = str(uuid.uuid4())
        item = {"id": qid, "question": question, "answer": None, "ts": time.time()}
        data.setdefault("items", []).append(item)
        self._save(data)

        # Poll for answer
        timeout_sec = int(os.getenv("WEB_UI_TIMEOUT", "1800"))  # default 30min
        deadline = time.time() + timeout_sec
        while time.time() < deadline:
            current = self._load()
            for it in current.get("items", []):
                if it.get("id") == qid and it.get("answer"):
                    return str(it.get("answer"))
            time.sleep(1.0)
        return "(no answer provided in time)"

