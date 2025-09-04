from __future__ import annotations
import os
import threading
from typing import Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict
import json
from pathlib import Path
import shutil
import mimetypes

from testai.crew import Testai
from testai.web.broker import broker, session_context

# --- Load environment variables from .env early and set sane defaults ---
from pathlib import Path as _Path

def _load_env_file():
    try:
        here = _Path(__file__).resolve()
        candidates = [
            here.parents[3] / ".env" if len(here.parents) >= 4 else None,
            here.parents[2] / ".env" if len(here.parents) >= 3 else None,
            _Path.cwd() / ".env",
        ]
        for p in [c for c in candidates if c is not None]:
            if p.is_file():
                for line in p.read_text(encoding="utf-8").splitlines():
                    s = line.strip()
                    if not s or s.startswith('#'):
                        continue
                    if '=' not in s:
                        continue
                    k, v = s.split('=', 1)
                    k = k.strip()
                    v = v.strip().strip('"').strip("'")
                    # Do not override already-set environment variables
                    os.environ.setdefault(k, v)
                break
    except Exception:
        # Best-effort: ignore parsing errors; rely on runtime env
        pass

# Load .env and default to web UI mode unless explicitly disabled
_load_env_file()
os.environ.setdefault('USE_WEB_UI', '1')

# Pydantic models
class StartPayload(BaseModel):
    role_title: str
    candidate_name: Optional[str] = None
    offer_experience_level: Optional[str] = None
    offer_tech_skills: Optional[list[str]] = None
    offer_education: Optional[str] = None
    offer_soft_skills: Optional[list[str]] = None

class AnswerPayload(BaseModel):
    answer: str

# Admin models
class JobConfig(BaseModel):
    title: str = ""
    department: str = ""
    experience: str = ""
    salary: str = ""
    location: str = ""
    requirements: str = ""
    company_name: str = ""

# FastAPI app
app = FastAPI(title="RecruTime Interview Backend")

# CORS for Angular dev server and optional custom origin
allowed_origins = [
    os.getenv("FRONTEND_ORIGIN", "http://localhost:4200"),
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory admin storage with file persistence
CONFIG_PATH = os.getenv("ADMIN_CONFIG_PATH", os.path.join("runtime", "admin_config.json"))

def load_job_config_from_file() -> JobConfig:
    try:
        path = Path(CONFIG_PATH)
        if path.exists():
            data = json.loads(path.read_text(encoding="utf-8"))
            return JobConfig(**data)
    except Exception as e:
        print(f"[admin] failed to load job config: {e}")
    return JobConfig()

def save_job_config_to_file(cfg: JobConfig) -> None:
    try:
        path = Path(CONFIG_PATH)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(cfg.model_dump(), ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception as e:
        print(f"[admin] failed to save job config: {e}")

_current_job_config: JobConfig = load_job_config_from_file()


def _run_crew_in_thread(session_id: str, payload: StartPayload):
    # Attach session id to this worker thread
    session_context.session_id = session_id

    # Build inputs expected by Testai().crew().kickoff
    inputs = {
        'role_title': payload.role_title,
        'candidate_name': (payload.candidate_name or os.getenv('CANDIDATE_NAME') or 'Candidat(e)') if hasattr(payload, 'candidate_name') else (os.getenv('CANDIDATE_NAME') or 'Candidat(e)'),
        'company_name': _current_job_config.company_name or os.getenv('COMPANY_NAME') or 'Votre Entreprise',
        'current_year': os.getenv('CURRENT_YEAR') or '2025',
        'offer_experience_level': payload.offer_experience_level,
        'offer_tech_skills': payload.offer_tech_skills or [],
        'offer_education': payload.offer_education,
        'offer_soft_skills': payload.offer_soft_skills or [],
        'candidate_profile': {
            'name': (payload.candidate_name or os.getenv('CANDIDATE_NAME') or 'Candidat(e)') if hasattr(payload, 'candidate_name') else (os.getenv('CANDIDATE_NAME') or 'Candidat(e)'),
            'years_experience': int(os.getenv('CANDIDATE_YEARS', '0') or 0),
            'primary_stack': os.getenv('CANDIDATE_STACK', 'Python,FastAPI').split(','),
            'location': os.getenv('CANDIDATE_LOCATION', 'N/A'),
        }
    }

    try:
        # Ensure the crew uses the web tool path
        os.environ['USE_WEB_UI'] = '1'
        Testai().crew().kickoff(inputs=inputs)
        broker.mark_done(session_id)
    except Exception as e:
        broker.mark_error(session_id, str(e))


# -------- Admin endpoints --------
# File upload to knowledge base (RAG)
KNOWLEDGE_DIR = os.getenv("KNOWLEDGE_DIR", "knowledge")
ALLOWED_EXTS = {'.txt', '.md', '.pdf', '.doc', '.docx'}

@app.get("/api/admin/knowledge")
def list_knowledge() -> Dict[str, list]:
    d = Path(KNOWLEDGE_DIR)
    d.mkdir(parents=True, exist_ok=True)
    items = []
    for p in d.glob("*"):
        if not p.is_file():
            continue
        stat = p.stat()
        ext = p.suffix.lower()
        items.append({
            "name": p.name,
            "size": stat.st_size,
            "modified": stat.st_mtime,
            "ext": ext,
        })
    # sort by modified desc
    items.sort(key=lambda x: x["modified"], reverse=True)
    return {"files": items}

@app.delete("/api/admin/knowledge/{name}")
def delete_knowledge(name: str) -> Dict[str, bool]:
    # basic sanitization: forbid path separators
    if "/" in name or ".." in name or "\\" in name:
        raise HTTPException(status_code=400, detail="Invalid file name")
    d = Path(KNOWLEDGE_DIR)
    target = d / name
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    try:
        target.unlink()
        # Remove sidecar text if present
        sidecar = target.with_suffix(target.suffix + ".txt")
        if sidecar.exists():
            sidecar.unlink()
        # mark reindex
        marker = d / ".updated"
        marker.write_text("deleted", encoding="utf-8")
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete failed: {e}")

@app.post("/api/admin/upload")
def upload_document(file: UploadFile = File(...)) -> Dict[str, str]:
    # Validate extension
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")
    # Ensure dir exists
    target_dir = Path(KNOWLEDGE_DIR)
    target_dir.mkdir(parents=True, exist_ok=True)
    # Save file
    safe_name = Path(file.filename).name
    target_path = target_dir / safe_name
    # If exists, add numeric suffix
    i = 1
    while target_path.exists():
        target_path = target_dir / f"{target_path.stem}_{i}{target_path.suffix}"
        i += 1
    with target_path.open('wb') as out:
        shutil.copyfileobj(file.file, out)
    # If Office/PDF, leave as-is; the RAG indexer currently reads .txt/.md only.
    # We can optionally extract text here for .pdf/.docx to a parallel .txt file.
    _maybe_extract_to_text(target_path)
    return {"saved": str(target_path)}

@app.get("/api/admin/reindex")
def trigger_reindex() -> Dict[str, bool]:
    # The next RAGSearchTool call will rebuild the index automatically.
    # We touch a marker file to indicate update if needed.
    marker = Path(KNOWLEDGE_DIR) / ".updated"
    marker.parent.mkdir(parents=True, exist_ok=True)
    marker.write_text("updated", encoding="utf-8")
    return {"ok": True}

# -------- Admin report endpoints --------
from fastapi.responses import FileResponse

@app.get("/api/admin/report/md")
def get_interview_report_md():
    p = Path("interview_report.md")
    if not p.exists():
        raise HTTPException(status_code=404, detail="interview_report.md not found")
    try:
        content = p.read_text(encoding="utf-8")
        stat = p.stat()
        return {"name": p.name, "modified": stat.st_mtime, "size": stat.st_size, "content": content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read report: {e}")

@app.get("/api/admin/report/raw")
def download_interview_report_raw():
    p = Path("interview_report.md")
    if not p.exists():
        raise HTTPException(status_code=404, detail="interview_report.md not found")
    return FileResponse(p, media_type="text/markdown", filename=p.name)


@app.get("/api/admin/job-config")
def get_job_config() -> JobConfig:
    return _current_job_config


def _maybe_extract_to_text(path: Path) -> None:
    try:
        ext = path.suffix.lower()
        if ext in {'.txt', '.md'}:
            return
        # For now, we create a sidecar .txt to make it searchable by the current RAG indexer
        # In the future, integrate a proper PDF/DOCX parser.
        sidecar = path.with_suffix(path.suffix + '.txt')
        sidecar.write_text(f"[BINARY_PLACEHOLDER] {path.name}\n(Extraction non implémentée)\n", encoding='utf-8')
    except Exception as e:
        print(f"[admin] failed to create sidecar text for {path}: {e}")


@app.put("/api/admin/job-config")
def put_job_config(cfg: JobConfig) -> Dict[str, bool]:
    global _current_job_config
    _current_job_config = cfg
    save_job_config_to_file(cfg)
    return {"ok": True}


# Root and docs helper
@app.get("/")
def root():
    return {"status": "ok", "service": "RecruTime Backend", "docs": "/docs"}

@app.get("/doc")
def doc_alias():
    return {"message": "Use /docs for Swagger UI"}

# -------- Interview endpoints --------
@app.post("/api/interview/start")
def start_interview(payload: StartPayload):
    sid = broker.new_session()
    t = threading.Thread(target=_run_crew_in_thread, args=(sid, payload), daemon=True)
    t.start()
    return {"session_id": sid}


@app.get("/api/interview/{session_id}/question")
def get_question(session_id: str):
    st = broker.status(session_id)
    if not st.get("exists"):
        raise HTTPException(status_code=404, detail="Session not found")
    if st.get("error"):
        return {"status": "error", "message": st["error"]}
    if st.get("done"):
        return {"status": "done"}

    q = broker.get_question(session_id)
    if q:
        return {"status": "question", "question": q}
    else:
        return {"status": "waiting"}


@app.post("/api/interview/{session_id}/answer")
def post_answer(session_id: str, payload: AnswerPayload):
    st = broker.status(session_id)
    if not st.get("exists"):
        raise HTTPException(status_code=404, detail="Session not found")
    broker.answer(session_id, payload.answer)
    return {"ok": True}


@app.get("/api/interview/{session_id}/report")
def get_report(session_id: str):
    # Optional: stream or return the generated report if Testai writes a file
    # For now, return the transcript accumulated
    st = broker.status(session_id)
    if not st.get("exists"):
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "done": st.get("done"),
        "error": st.get("error"),
        "transcript": broker.transcript(session_id),
    }


if __name__ == "__main__":
    import os, uvicorn
    os.environ.setdefault("USE_WEB_UI", "1")
    uvicorn.run("testai.web.backend:app", host="127.0.0.1", port=8000, reload=False)


