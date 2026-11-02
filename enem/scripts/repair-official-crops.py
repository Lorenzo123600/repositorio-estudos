"""Audit all published PDF crops; --write repairs page/next-question furniture.

Does not reimport questions or change IDs, answers, indices or eligibility.
"""
import argparse
import collections
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('importer', ROOT/'scripts/import-official-enem.py')
imp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(imp)


def run(write=False):
    catalog = imp.read(ROOT/'src/question-catalog.json')
    paths = [ROOT/'src/official-questions.json', *[ROOT/'public'/c['file'] for c in catalog['chunks']]]
    documents = {}
    furniture = {}
    changes = []
    image_writes = []
    json_writes = []
    audited = 0
    for path in paths:
        questions = imp.read(path)
        modified = False
        for q in questions:
            if q.get('validation', {}).get('status') != 'validated':
                continue
            audited += 1
            source = q['validation']['statementEvidence']
            if source not in documents:
                documents[source] = imp.fitz.open(ROOT/source)
            doc = documents[source]
            asset = q['validation']['assets'][-1]
            page = doc[asset['page']-1]
            reviewed = imp.segment.reviewed_rectangles(q['validation']['statementSha256'],q['number'],q.get('language'),asset['page'])
            if 'E' in reviewed:
                if asset['rect'] != reviewed['E']:
                    raise ValueError(q['id']+': recorte diverge da revisão oficial; execute repair-reviewed-content.py')
                continue
            left, top, right, old_bottom = asset['rect']
            # Discover the next heading independently of the published crop.
            headings = [line for block in page.get_text('dict')['blocks']
                        for line in block.get('lines', [])
                        if left <= line['bbox'][0] < right and line['bbox'][1] > top
                        and imp.re.fullmatch(r'quest[ãa]o\s+\d{1,3}', ''.join(s['text'] for s in line['spans']).strip(), imp.re.I)]
            next_header = min((line['bbox'][1] for line in headings), default=None)
            page_key = (source, asset['page'])
            if page_key not in furniture:
                furniture[page_key] = imp.segment.page_furniture(page)
            bottom = min(old_bottom, imp.segment.content_bottom(page, left, right, next_header, top, furniture[page_key]))
            if old_bottom-bottom < .01:
                continue
            rect = [left, top, right, bottom]
            if bottom <= q['validation']['labels'][-1]['y']+7:
                raise ValueError(q['id']+': boundary intersects E marker')
            # Guard against removing question text, including multiline formulas.
            for block in page.get_text('dict')['blocks']:
                for line in block.get('lines', []):
                    r = imp.fitz.Rect(line['bbox'])
                    text = ''.join(s['text'] for s in line['spans']).strip()
                    if text and left <= r.x0 < right and top <= r.y0 < bottom and r.y1 > bottom+.5:
                        raise ValueError(q['id']+': boundary intersects content '+repr(line))
            changes.append(dict(id=q['id'], role='E', file=asset['file'], before=asset['rect'], after=rect))
            if write:
                data, size = imp.render_crop(doc, asset['page']-1, rect)
                image_writes.append((ROOT/'public'/asset['file'], data))
                asset.update(rect=rect, sha256=imp.sha(data), **size)
                q['alternatives'][-1]['text'] = imp.readable_text(page, rect)
                modified = True
        if modified:
            json_writes.append((path, questions))
    for doc in documents.values():
        doc.close()
    if write:
        # Finish checking every question before replacing any published files.
        for path, data in image_writes:
            path.write_bytes(data)
        for path, questions in json_writes:
            imp.save(path, questions)
        for chunk in catalog['chunks']:
            chunk['sha256'] = imp.sha((ROOT/'public'/chunk['file']).read_bytes())
        imp.save(ROOT/'src/question-catalog.json', catalog)
        manifest = imp.read(ROOT/'public/questions/manifest.json')
        for entry in manifest['files']:
            entry['sha256'] = imp.sha((ROOT/'public'/entry['file']).read_bytes())
        imp.save(ROOT/'public/questions/manifest.json', manifest)
        report_path = ROOT/'references/enem-1000/crop-repair.json'
        previous = imp.read(report_path)['changes'] if report_path.exists() else []
        combined = {c['id']: c for c in previous}
        for change in changes:
            if change['id'] in combined:
                change['before'] = combined[change['id']]['before']
            combined[change['id']] = change
        imp.save(report_path, dict(audited=audited, changes=list(combined.values())))
    print(json.dumps(dict(audited=audited, affected=len(changes), byYear=dict(collections.Counter(c['id'].split('-')[1] for c in changes)), written=write)))
    return changes


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true')
    args = parser.parse_args()
    changes = run(args.write)
    if changes and not args.write:
        raise SystemExit(1)
