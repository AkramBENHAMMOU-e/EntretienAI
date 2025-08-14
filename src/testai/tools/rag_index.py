from __future__ import annotations
import os
import math
import re
from typing import List, Dict, Tuple
from dataclasses import dataclass

TOKEN_RE = re.compile(r"[A-Za-z0-9]+")

def tokenize(text: str) -> List[str]:
    return [t.lower() for t in TOKEN_RE.findall(text or "")]

@dataclass
class Chunk:
    chunk_id: str
    source: str
    content: str
    tfidf: Dict[str, float]

class RagIndex:
    """Minimal TF-IDF index over .txt and .md files in a directory (no crewai dependency)."""
    def __init__(self, knowledge_dir: str, chunk_size: int = 800, overlap: int = 120):
        self.knowledge_dir = knowledge_dir
        self.chunk_size = max(200, chunk_size)
        self.overlap = max(0, min(overlap, self.chunk_size // 2))
        self.chunks: List[Chunk] = []
        self.idf: Dict[str, float] = {}
        self._built = False

    def _read_files(self) -> List[Tuple[str, str]]:
        docs: List[Tuple[str, str]] = []
        if not os.path.isdir(self.knowledge_dir):
            return docs
        for root, _, files in os.walk(self.knowledge_dir):
            for f in files:
                ext = os.path.splitext(f)[1].lower()
                if ext not in [".txt", ".md"]:
                    continue
                path = os.path.join(root, f)
                try:
                    with open(path, "r", encoding="utf-8", errors="ignore") as fh:
                        docs.append((path, fh.read()))
                except Exception:
                    continue
        return docs

    def _split(self, text: str) -> List[str]:
        paras = [p.strip() for p in text.split("\n\n") if p.strip()]
        merged: List[str] = []
        for p in paras:
            if not merged:
                merged.append(p)
            elif len(merged[-1]) + 2 + len(p) <= self.chunk_size:
                merged[-1] = merged[-1] + "\n\n" + p
            else:
                merged.append(p)
        out: List[str] = []
        for m in merged:
            if len(m) <= self.chunk_size:
                out.append(m)
            else:
                i = 0
                while i < len(m):
                    out.append(m[i:i + self.chunk_size])
                    i += (self.chunk_size if self.overlap == 0 else (self.chunk_size - self.overlap))
        return out

    def build(self) -> None:
        docs = self._read_files()
        raw_chunks: List[Tuple[str, str, str]] = []
        for path, text in docs:
            parts = self._split(text)
            for idx, content in enumerate(parts):
                cid = f"{os.path.relpath(path, self.knowledge_dir)}::chunk-{idx+1}"
                raw_chunks.append((cid, path, content))
        df: Dict[str, int] = {}
        chunk_tokens: List[List[str]] = []
        for _, _, content in raw_chunks:
            toks = tokenize(content)
            chunk_tokens.append(toks)
            for term in set(toks):
                df[term] = df.get(term, 0) + 1
        n_docs = max(1, len(raw_chunks))
        self.idf = {t: math.log((1 + n_docs) / (1 + c)) + 1.0 for t, c in df.items()}
        self.chunks = []
        for (cid, src, content), toks in zip(raw_chunks, chunk_tokens):
            tf: Dict[str, float] = {}
            for t in toks:
                tf[t] = tf.get(t, 0.0) + 1.0
            norm = sum(tf.values()) or 1.0
            for t in list(tf.keys()):
                tf[t] = (tf[t] / norm) * self.idf.get(t, 1.0)
            self.chunks.append(Chunk(chunk_id=cid, source=src, content=content, tfidf=tf))
        self._built = True

    def _vec(self, text: str) -> Dict[str, float]:
        tf: Dict[str, float] = {}
        toks = tokenize(text)
        if not toks:
            return tf
        for t in toks:
            tf[t] = tf.get(t, 0.0) + 1.0
        norm = sum(tf.values()) or 1.0
        for t in list(tf.keys()):
            tf[t] = (tf[t] / norm) * self.idf.get(t, 1.0)
        return tf

    @staticmethod
    def _cos(a: Dict[str, float], b: Dict[str, float]) -> float:
        if not a or not b:
            return 0.0
        if len(a) > len(b):
            a, b = b, a
        dot = 0.0
        for k, va in a.items():
            vb = b.get(k)
            if vb is not None:
                dot += va * vb
        na = math.sqrt(sum(v*v for v in a.values())) or 1.0
        nb = math.sqrt(sum(v*v for v in b.values())) or 1.0
        return dot / (na * nb)

    def search(self, query: str, top_k: int = 5):
        if not self._built:
            self.build()
        qv = self._vec(query)
        scored = []
        for ch in self.chunks:
            sim = self._cos(qv, ch.tfidf)
            if sim > 0:
                scored.append((sim, ch))
        scored.sort(key=lambda x: x[0], reverse=True)
        out = []
        for sim, ch in scored[:max(1, top_k)]:
            out.append({
                "chunk_id": ch.chunk_id,
                "source": os.path.relpath(ch.source, self.knowledge_dir),
                "score": round(float(sim), 4),
                "content": ch.content.strip()[:1200]
            })
        return out

