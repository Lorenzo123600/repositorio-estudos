"""Read-only screening for diagrams/formulas starting above their A-E markers."""
import collections
import json
from pathlib import Path

import fitz
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def premarker_gaps(rows, marker, start):
    """Return the last substantial gap followed by ink well above the marker."""
    # A preceding paragraph is NOT an upper part of the option. There must
    # also be body ink immediately above the marker, across the saved split.
    if sum(rows[max(0,marker-4):marker]) < 3:
        return None
    gaps=[]
    run=None
    for row in range(max(0,start), min(marker, len(rows))):
        if not rows[row] and run is None:
            run=row
        elif rows[row] and run is not None:
            if row-run>=5 and row<=marker-6 and sum(rows[row:marker-2])>=4:
                gaps.append((run,row))
            run=None
    return gaps[-1] if gaps else None


def audit():
    read=lambda p:json.loads((ROOT/p).read_text())
    questions=read('src/official-questions.json')
    for c in read('src/question-catalog.json')['chunks']:
        questions.extend(read('public/'+c['file']))
    questions=[q for q in questions if q.get('validation',{}).get('status')=='validated']
    docs={}
    findings=[]
    for q in questions:
        v=q['validation'];source=v['statementEvidence']
        if source not in docs:docs[source]=fitz.open(ROOT/source)
        page=docs[source][v['header']['page']-1]
        left=v['header']['rect'][0]+12
        top=v['assets'][0]['rect'][1]
        right=v['assets'][0]['rect'][2]
        end=v['assets'][-1]['rect'][3]
        pix=page.get_pixmap(clip=fitz.Rect(left,top,right,end),colorspace=fitz.csGRAY,alpha=False)
        image=Image.frombytes('L',(pix.width,pix.height),pix.samples)
        rows=[image.crop((0,y,image.width,y+1)).getextrema()[0]<220 for y in range(image.height)]
        for i,label in enumerate(v['labels']):
            marker=round(label['y']-pix.y)
            prev=round(v['labels'][i-1]['y']-pix.y)+10 if i else max(0,marker-80)
            gap=premarker_gaps(rows,marker,max(prev,marker-80))
            if gap and v['assets'][i+1]['rect'][1]>pix.y+gap[1]+3:
                findings.append(dict(id=q['id'],role=label['letter'],status='review',page=page.number+1,source=source,
                                     markerY=label['y'],currentTop=v['assets'][i+1]['rect'][1],
                                     gap=[pix.y+gap[0],pix.y+gap[1]],
                                     reason='ink above option marker after a substantial blank gap; may be formula/diagram assigned to preceding crop'))
    for doc in docs.values():doc.close()
    report=dict(scope=len(questions),flaggedOptions=len(findings),flaggedQuestions=len({f['id'] for f in findings}),findings=findings)
    (ROOT/'references/enem-1000/option-layout-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({k:v for k,v in report.items() if k!='findings'}))


if __name__=='__main__':audit()
