"""Apply the source/hash-bound crop corrections reviewed in the content audit.

Default is audit only; --write renders the reviewed rectangles and refreshes hashes.
Never changes answers, IDs, eligibility, ordering or content fingerprints.
"""
import argparse
import importlib.util
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('importer',ROOT/'scripts/import-official-enem.py')
imp=importlib.util.module_from_spec(spec);spec.loader.exec_module(imp)


def run(write=False):
    catalog=imp.read(ROOT/'src/question-catalog.json')
    paths=[ROOT/'src/official-questions.json',*[ROOT/'public'/c['file'] for c in catalog['chunks']]]
    docs={};images=[];json_writes=[];changes=[];seen=set()
    for path in paths:
        questions=imp.read(path);modified=False
        for q in questions:
            v=q.get('validation',{})
            if v.get('status')!='validated':continue
            reviewed=imp.segment.reviewed_rectangles(v['statementSha256'],q['number'],q.get('language'),v['header']['page'])
            if not reviewed:continue
            seen.add(q['id']);source=v['statementEvidence']
            if source not in docs:
                assert imp.sha((ROOT/source).read_bytes())==v['statementSha256'],'source PDF changed'
                docs[source]=imp.fitz.open(ROOT/source)
            doc=docs[source];page=doc[v['header']['page']-1]
            for asset in v['assets']:
                role=asset['role']
                if role not in reviewed or asset['rect']==reviewed[role]:continue
                rect=reviewed[role]
                changes.append(dict(id=q['id'],role=role,before=asset['rect'],after=rect))
                if write:
                    data,size=imp.render_crop(doc,asset['page']-1,rect)
                    images.append((ROOT/'public'/asset['file'],data))
                    asset.update(rect=rect,sha256=imp.sha(data),**size)
                    text=imp.readable_text(page,rect)
                    if role=='statement':q['originalStatement']['transcript']=text
                    else:q['alternatives']['ABCDE'.index(role)]['text']=text
                    modified=True
            # Rectangles must partition the question into six complete regions.
            if write:
                assets=v['assets']
                for before,after in zip(assets,assets[1:]):assert abs(before['rect'][3]-after['rect'][1])<.01
                assert all(assets[i+1]['rect'][1]<=label['y']+5<assets[i+1]['rect'][3] for i,label in enumerate(v['labels']))
        if modified:json_writes.append((path,questions))
    expected={r['id'] for r in imp.segment.reviewed_boundaries()}
    assert seen==expected,'A reviewed question is missing or has changed source evidence'
    for doc in docs.values():doc.close()
    if write:
        for path,data in images:path.write_bytes(data)
        for path,questions in json_writes:imp.save(path,questions)
        for chunk in catalog['chunks']:chunk['sha256']=imp.sha((ROOT/'public'/chunk['file']).read_bytes())
        imp.save(ROOT/'src/question-catalog.json',catalog)
        manifest=imp.read(ROOT/'public/questions/manifest.json')
        for entry in manifest['files']:entry['sha256']=imp.sha((ROOT/'public'/entry['file']).read_bytes())
        imp.save(ROOT/'public/questions/manifest.json',manifest)
        report=ROOT/'references/enem-1000/content-crop-repair.json'
        if changes:
            previous=imp.read(report)['changes'] if report.exists() else []
            combined={(c['id'],c['role']):c for c in previous}
            for change in changes:
                key=(change['id'],change['role'])
                if key in combined:change['before']=combined[key]['before']
                combined[key]=change
            changes=list(combined.values())
            imp.save(report,dict(questions=len({c['id'] for c in changes}),assets=len(changes),changes=changes,answerChanges=0))
    print(json.dumps(dict(reviewedQuestions=len(seen),pendingAssets=len(changes),written=write)))
    return changes


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--write',action='store_true');args=parser.parse_args()
    changes=run(args.write)
    if changes and not args.write:raise SystemExit(1)
