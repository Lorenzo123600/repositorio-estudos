"""Read-only content audit. Writes evidence/report only, never questions or answers."""
import collections
import hashlib
import importlib.util
import itertools
import json
import re
import subprocess
import unicodedata
from pathlib import Path

import fitz
from PIL import Image, ImageChops, ImageStat

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('importer', ROOT/'scripts/import-official-enem.py')
imp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(imp)


def normalized_option(text):
    # Preserve signs, decimals, exponents and accents; punctuation can change math.
    text = re.sub(r'^\s*[ABCDE](?:\s|$)', '', text or '', count=1)
    return re.sub(r'\s+', ' ', unicodedata.normalize('NFC', text)).strip()


def option_ink(image, marker_end):
    image = image.convert('L').crop((marker_end, 0, image.width, image.height))
    mask = image.point(lambda p: 255 if p < 220 else 0)
    bounds = mask.getbbox()
    if not bounds:
        return None
    return mask.crop(bounds)


def visual_similarity(a, b):
    if a is None or b is None:
        return None
    if max(a.width/b.width, b.width/a.width, a.height/b.height, b.height/a.height) > 1.15:
        return None
    a = a.resize((128, 64), Image.Resampling.BILINEAR)
    b = b.resize((128, 64), Image.Resampling.BILINEAR)
    difference = ImageChops.difference(a, b)
    return 1-ImageStat.Stat(difference).mean[0]/255


def audit():
    catalog = imp.read(ROOT/'src/question-catalog.json')
    paths = [ROOT/'src/official-questions.json', *[ROOT/'public'/c['file'] for c in catalog['chunks']]]
    inputs = {str(p.relative_to(ROOT)): imp.sha(p.read_bytes()) for p in paths}
    questions = [q for p in paths for q in imp.read(p) if q.get('validation', {}).get('status') == 'validated']
    assert len(questions) == 1070, 'Expected the published 1070-question scope'
    documents, pages, keys, findings, results = {}, {}, {}, [], []
    for source in imp.read(ROOT/'references/enem-1000/sources.json'):
        if source['kind'] == 'gabarito':
            table, _ = imp.keys_from_pdf(ROOT/source['path'], source['day'])
            keys.update({f'{source["year"]}-{n}': answer for n, answer in table.items()})

    def finding(q, category, status, evidence):
        findings.append(dict(id=q['id'], category=category, status=status, evidence=evidence))

    for qi, q in enumerate(questions):
        v = q['validation']
        source = v['statementEvidence']
        if source not in documents:
            documents[source] = fitz.open(ROOT/source)
        doc = documents[source]
        pi = v['header']['page']-1
        page = doc[pi]
        page_key = (source, pi)
        if page_key not in pages:
            objects = [('image', bounds) for kind, bounds in page.get_bboxlog() if kind == 'fill-image']
            # A PDF text paint operation may aggregate both columns and all
            # five options. Audit individual glyphs, never that aggregate box.
            for span in page.get_texttrace():
                if span['type'] == 3 or span.get('opacity', 1) == 0:
                    continue
                if abs(span['dir'][0]) < .1 and span['bbox'][3]-span['bbox'][1] > page.rect.height*.4:
                    continue  # vertical page watermark
                objects.extend(('glyph', char[3]) for char in span['chars'] if char[0] not in (9, 10, 13, 32))
            pages[page_key] = objects
        answer_key = f'{q["year"]}-{q["number"]}' + (f'-{q["language"]}' if q.get('language') else '')
        answer = keys.get(answer_key)
        if answer != 'ABCDE'[q['answer']]:
            finding(q, 'answer', 'confirmed', dict(stored='ABCDE'[q['answer']], official=answer, pdf=v['answerEvidence']))
        if q.get('officialAnswer') != answer:
            finding(q, 'answer_metadata', 'confirmed', dict(stored=q.get('officialAnswer'), official=answer))
        if not q['originalStatement'].get('transcript'):
            finding(q, 'missing_transcript', 'accessibility', dict(role='statement'))
        crops, ink = {}, {}
        for asset in v['assets']:
            role = asset['role']
            path = ROOT/'public'/asset['file']
            if not path.is_file():
                finding(q, 'missing_image', 'confirmed', dict(role=role, file=asset['file']))
                continue
            try:
                with Image.open(path) as image:
                    image.load()
                    crops[role] = image.convert('RGB')
                    if image.size != (asset['width'], asset['height']):
                        finding(q, 'image_dimensions', 'confirmed', dict(role=role, file=asset['file']))
            except Exception as error:
                finding(q, 'unreadable_image', 'confirmed', dict(role=role, error=str(error)))
                continue
            if imp.sha(path.read_bytes()) != asset['sha256']:
                finding(q, 'image_hash', 'confirmed', dict(role=role, file=asset['file']))
            image = crops[role]
            if ImageStat.Stat(image.convert('L')).stddev[0] < 1:
                finding(q, 'blank_image', 'confirmed', dict(role=role))
            if role != 'statement':
                marker_end = round((v['header']['rect'][0]+12-asset['rect'][0])*2)
                ink[role] = option_ink(image, max(0, marker_end))
                if ink[role] is None:
                    finding(q, 'empty_option_body', 'review', dict(role=role))
                text = q['alternatives']['ABCDE'.index(role)].get('text')
                if not text:
                    finding(q, 'missing_transcript', 'accessibility', dict(role=role))
            else:
                text = q['originalStatement'].get('transcript')
            if text and any(ord(c)<32 and c not in '\n\r\t' for c in text):
                finding(q, 'invalid_transcript_characters', 'confirmed', dict(role=role))
            if text and '\ufffd' in text:
                finding(q, 'replacement_character', 'review', dict(role=role))
            # Ink bounding boxes, rather than font line boxes: text/font metrics
            # alone falsely flag superscripts and whitespace at crop boundaries.
            rect = fitz.Rect(asset['rect'])
            cuts = []
            for kind, bounds in pages[page_key]:
                if bounds[2]<=rect.x0 or bounds[0]>=rect.x1 or bounds[3]<=rect.y0 or bounds[1]>=rect.y1:
                    continue
                r = fitz.Rect(bounds)
                intersection = r & rect
                if intersection.is_empty or intersection.width<1 or intersection.height<1:
                    continue
                sides = [side for side, value in [('left', rect.x0-r.x0), ('right', r.x1-rect.x1), ('top', rect.y0-r.y0), ('bottom', r.y1-rect.y1)] if value>1]
                if not sides:
                    continue
                # Page-wide resources/masks are not proof of a truncated figure.
                if kind == 'image' and r.get_area() > rect.get_area()*1.5:
                    continue
                cuts.append(dict(kind=kind, bounds=list(r), sides=sides))
            if cuts:
                finding(q, 'crop_boundary', 'review', dict(role=role, rect=asset['rect'], objects=cuts))

        for i, j in itertools.combinations(range(5), 2):
            a, b = 'ABCDE'[i], 'ABCDE'[j]
            ta, tb = [normalized_option(q['alternatives'][k].get('text')) for k in (i, j)]
            if ta and ta == tb:
                finding(q, 'duplicate_option_text', 'review', dict(options=[a,b], text=ta))
            similarity = visual_similarity(ink.get(a), ink.get(b))
            if similarity is not None and similarity >= .97:
                finding(q, 'similar_option_images', 'review', dict(options=[a,b], similarity=round(similarity, 5)))
        results.append(dict(id=q['id'], year=q['year'], number=q['number'], area=q['area'], language=q.get('language'), source=source, page=pi+1, answer='ABCDE'[q['answer']], officialAnswer=answer, assetsChecked=len(crops)))
        if (qi+1)%200 == 0:
            print(f'Audited {qi+1}/{len(questions)}', flush=True)
    for doc in documents.values():
        doc.close()
    assert inputs == {str(p.relative_to(ROOT)): imp.sha(p.read_bytes()) for p in paths}, 'Question data changed during audit'
    report = dict(schemaVersion=1, commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(), scope=len(questions), imagesChecked=sum(q['assetsChecked'] for q in results), inputHashes=inputs, summary=dict(collections.Counter(f['category'] for f in findings)), questions=results, findings=findings, limitations=['Automated screening; candidate crop/duplicate findings require visual review.', 'PDF answer-table agreement does not independently prove pedagogical correctness.', 'No question, answer or production asset is modified.'])
    dest=ROOT/'references/enem-1000/content-audit.json'
    imp.save(dest, report)
    print(json.dumps(dict(scope=report['scope'], imagesChecked=report['imagesChecked'], summary=report['summary']),ensure_ascii=False))


if __name__ == '__main__':
    audit()
