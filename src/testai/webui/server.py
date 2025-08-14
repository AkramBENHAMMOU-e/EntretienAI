from __future__ import annotations
import os
import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs
from pathlib import Path
from src.testai.tools.rag_index import RagIndex

STORE_PATH = os.getenv("WEB_UI_STORE", os.path.join("runtime", "web_interview.json"))
ADMIN_STORE_PATH = os.getenv("ADMIN_STORE", os.path.join("runtime", "admin_config.json"))
HOST = os.getenv("WEB_UI_HOST", "127.0.0.1")
PORT = int(os.getenv("WEB_UI_PORT", "8765"))
KNOWLEDGE_DIR = os.getenv("KNOWLEDGE_DIR", "knowledge")

os.makedirs(os.path.dirname(STORE_PATH), exist_ok=True)
if not os.path.exists(STORE_PATH):
    with open(STORE_PATH, "w", encoding="utf-8") as f:
        json.dump({"items": []}, f)

os.makedirs(os.path.dirname(ADMIN_STORE_PATH), exist_ok=True)
if not os.path.exists(ADMIN_STORE_PATH):
    with open(ADMIN_STORE_PATH, "w", encoding="utf-8") as f:
        json.dump({"templates": []}, f)

os.makedirs(KNOWLEDGE_DIR, exist_ok=True)


class Handler(BaseHTTPRequestHandler):
    def _read_store(self):
        with open(STORE_PATH, "r", encoding="utf-8") as f:
            return json.load(f)

    def _write_store(self, data):
        tmp = STORE_PATH + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        os.replace(tmp, STORE_PATH)

    def _read_admin(self):
        with open(ADMIN_STORE_PATH, "r", encoding="utf-8") as f:
            return json.load(f)

    def _write_admin(self, data):
        tmp = ADMIN_STORE_PATH + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        os.replace(tmp, ADMIN_STORE_PATH)

    def _send_json(self, data, code=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_html(self, html, code=200):
        body = html.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/":
            html = """
            <html><head><title>Interview UI</title></head>
            <body style='font-family:sans-serif; max-width:800px; margin:2rem auto;'>
              <h2>Interview – Questions</h2>
              <div id='content'>Loading...</div>
              <script>
                function isTyping() {
                  const el = document.activeElement;
                  return el && el.tagName === 'INPUT' && el.id && el.id.startsWith('ans_');
                }
                function snapshotInputs() {
                  const map = {};
                  document.querySelectorAll("input[id^='ans_']").forEach(inp => { map[inp.id] = inp.value; });
                  return map;
                }
                async function load() {
                  const snap = snapshotInputs();
                  const res = await fetch('/api/items');
                  const data = await res.json();
                  const items = data.items || [];
                  const html = items.map(it => `
                    <div style='border:1px solid #ccc; padding:1rem; margin:.5rem 0;'>
                      <div><b>Question:</b> ${it.question}</div>
                      <div><b>Réponse:</b> <input id='ans_${it.id}' value='${(it.answer != null ? it.answer : (snap['ans_'+it.id] || ''))}' style='width:80%'>
                        <button onclick='send("${it.id}")'>Envoyer</button>
                      </div>
                    </div>`).join('');
                  const container = document.getElementById('content');
                  container.innerHTML = html || '<i>Aucune question pour le moment...</i>';
                }
                async function send(id) {
                  const el = document.getElementById('ans_' + id);
                  await fetch('/api/answer', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({id, answer: el.value})});
                  await load();
                }
                setInterval(() => { if (!isTyping()) { load(); } }, 1500);
                load();
              </script>
              <div style='margin-top:2rem'>
                <a href='/admin'>Espace Administration</a>
              </div>
            </body></html>
            """
            return self._send_html(html)
        elif path == "/admin":
            html = """
            <html><head><title>Admin – Config</title></head>
            <body style='font-family:sans-serif; max-width:900px; margin:2rem auto;'>
              <h2>Administration – Configuration d'entretien</h2>
              <div style='display:flex; gap:2rem;'>
                <div style='flex:1'>
                  <h3>1) Offre d'emploi</h3>
                  <form onsubmit='return saveOffer(event)'>
                    <div>Titre du poste: <input id='role_title' style='width:100%'></div>
                    <div>Niveau d'expérience: <input id='experience_level' style='width:100%'></div>
                    <div>Compétences techniques (CSV): <input id='tech_skills' style='width:100%'></div>
                    <div>Critères/pondérations (JSON): <textarea id='scoring' rows='5' style='width:100%'></textarea></div>
                    <button type='submit'>Enregistrer</button>
                  </form>

                  <h3 style='margin-top:2rem'>3) Profil candidat cible</h3>
                  <form onsubmit='return saveCandidateProfile(event)'>
                    <div>Années d'expérience: <input id='cand_years' style='width:100%'></div>
                    <div>Stack prioritaire (CSV): <input id='cand_stack' style='width:100%'></div>
                    <div>Soft skills à évaluer (CSV): <input id='cand_soft' style='width:100%'></div>
                    <button type='submit'>Enregistrer</button>
                  </form>
                </div>

                <div style='flex:1'>
                  <h3>2) Documents RAG</h3>
                  <form onsubmit='return uploadDoc(event)'>
                    <div>Fichier (.txt/.md): <input type='file' id='file'></div>
                    <button type='submit'>Uploader</button>
                  </form>
                  <div id='docs' style='margin-top:1rem'>Loading docs...</div>
                </div>
              </div>

              <h3 style='margin-top:2rem'>Templates d'entretien</h3>
              <form onsubmit='return createTemplate(event)'>
                <div>Nom du template: <input id='tpl_name'></div>
                <button type='submit'>Créer</button>
              </form>
              <div id='tpls' style='margin-top:1rem'>Loading templates...</div>

              <script>
                async function saveOffer(e){ e.preventDefault();
                  const payload={role_title:val('role_title'),experience_level:val('experience_level'),tech_skills:val('tech_skills'),scoring:val('scoring')};
                  await fetch('/admin/save_offer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
                  alert('Offre enregistrée'); }
                async function saveCandidateProfile(e){ e.preventDefault();
                  const payload={years:val('cand_years'),stack:val('cand_stack'),soft:val('cand_soft')};
                  await fetch('/admin/save_candidate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
                  alert('Profil candidat enregistré'); }
                async function uploadDoc(e){ e.preventDefault();
                  const f=document.getElementById('file').files[0]; if(!f){alert('Choisissez un fichier');return false;}
                  const b=await f.text(); const res=await fetch('/admin/upload_doc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:f.name,content:b})});
                  const out=await res.json(); alert(out.ok?'Document enregistré':'Erreur'); await loadDocs(); }
                async function loadDocs(){ const res=await fetch('/admin/docs'); const data=await res.json();
                  const html=(data.docs||[]).map(d=>`<div><b>${d.name}</b> <button onclick="delDoc('${d.name}')">Supprimer</button></div>`).join('');
                  document.getElementById('docs').innerHTML=html||'<i>Aucun document</i>'; }
                async function delDoc(name){ await fetch('/admin/del_doc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name})}); await loadDocs(); }
                async function createTemplate(e){ e.preventDefault(); const name=val('tpl_name'); await fetch('/admin/create_tpl',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name})}); alert('Template créé'); await loadTemplates(); }
                async function loadTemplates(){ const res=await fetch('/admin/templates'); const data=await res.json();
                  const html=(data.templates||[]).map(t=>`<div>${t.name}</div>`).join(''); document.getElementById('tpls').innerHTML=html||'<i>Aucun template</i>'; }
                function val(id){ return document.getElementById(id).value; }
                loadDocs(); loadTemplates();
              </script>
              <div style='margin-top:1rem'><a href='/'>Aller à l'interface candidat</a></div>
            </body></html>
            """
            return self._send_html(html)
        elif path == "/api/items":
            return self._send_json(self._read_store())
        elif path == "/admin/docs":
            docs=[]
            for p in Path(KNOWLEDGE_DIR).glob("**/*"):
                if p.is_file() and p.suffix.lower() in ('.txt','.md'):
                    docs.append({"name": str(p.relative_to(KNOWLEDGE_DIR))})
            return self._send_json({"docs": docs})
        elif path == "/admin/templates":
            return self._send_json(self._read_admin())
        else:
            return self._send_json({"error": "Not found"}, code=404)

    def do_POST(self):
        path = urlparse(self.path).path
        length = int(self.headers.get('Content-Length', '0'))
        body = self.rfile.read(length)
        try:
            data = json.loads(body.decode('utf-8') or '{}')
        except Exception:
            data = {}
        if path == "/api/answer":
            store = self._read_store()
            for it in store.get("items", []):
                if it.get("id") == data.get("id"):
                    it["answer"] = data.get("answer")
                    break
            self._write_store(store)
            return self._send_json({"ok": True})
        elif path == "/admin/save_offer":
            admin = self._read_admin()
            admin['offer'] = {
                'role_title': data.get('role_title'),
                'experience_level': data.get('experience_level'),
                'tech_skills': data.get('tech_skills'),
                'scoring': data.get('scoring'),
            }
            self._write_admin(admin)
            return self._send_json({"ok": True})
        elif path == "/admin/save_candidate":
            admin = self._read_admin()
            admin['candidate_profile'] = {
                'years': data.get('years'),
                'stack': data.get('stack'),
                'soft': data.get('soft'),
            }
            self._write_admin(admin)
            return self._send_json({"ok": True})
        elif path == "/admin/upload_doc":
            name = data.get('name') or 'uploaded.txt'
            content = data.get('content') or ''
            dest = Path(KNOWLEDGE_DIR) / name
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text(content, encoding='utf-8')
            # Rebuild RAG index to validate
            try:
                RagIndex(knowledge_dir=KNOWLEDGE_DIR).build()
                ok = True
            except Exception:
                ok = False
            return self._send_json({"ok": ok})
        elif path == "/admin/del_doc":
            name = data.get('name')
            if name:
                p = Path(KNOWLEDGE_DIR) / name
                if p.exists():
                    p.unlink()
            return self._send_json({"ok": True})
        elif path == "/admin/create_tpl":
            admin = self._read_admin()
            tpls = admin.get('templates', [])
            tpls.append({'name': data.get('name')})
            admin['templates'] = tpls
            self._write_admin(admin)
            return self._send_json({"ok": True})
        return self._send_json({"error": "Not found"}, code=404)


def run():
    print(f"Interview UI running at http://{HOST}:{PORT}")
    HTTPServer((HOST, PORT), Handler).serve_forever()

if __name__ == "__main__":
    run()

