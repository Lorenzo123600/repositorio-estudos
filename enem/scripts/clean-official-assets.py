"""Remove only generated official images not referenced by a registered question."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
read=lambda p:json.loads(Path(p).read_text())
questions=read(root/'src/official-questions.json')
for c in read(root/'src/question-catalog.json')['chunks']:questions.extend(read(root/'public'/c['file']))
used={p for q in questions for p in q.get('images',[])}
count=0
for p in (root/'public/enem-assets/official').rglob('*.webp'):
 if str(p.relative_to(root/'public')) not in used:p.unlink();count+=1
for p in sorted((root/'public/enem-assets/official').rglob('*'),reverse=True):
 if p.is_dir() and not any(p.iterdir()):p.rmdir()
print(f'{count} imagens intermediárias não referenciadas removidas.')
