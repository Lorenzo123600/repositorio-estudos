"""Refine glyph-box warnings by checking actual visible ink at the crop edge."""
import json
from pathlib import Path
import fitz
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]


def audit():
    report=json.loads((ROOT/'references/enem-1000/content-audit.json').read_text())
    questions={q['id']:q for q in report['questions']}
    docs={};results=[]
    for finding in report['findings']:
        if finding['category']!='crop_boundary':continue
        q=questions[finding['id']]
        if q['source'] not in docs:docs[q['source']]=fitz.open(ROOT/q['source'])
        page=docs[q['source']][q['page']-1];rect=fitz.Rect(finding['evidence']['rect']);visible=[]
        traces={tuple(round(n,3) for n in ch[3]):(ch[0],ch[2]) for span in page.get_texttrace() for ch in span['chars']}
        for obj in finding['evidence']['objects']:
            if obj['kind']!='glyph':continue
            box=fitz.Rect(obj['bounds'])
            pix=page.get_pixmap(matrix=fitz.Matrix(3,3),clip=box,colorspace=fitz.csGRAY,alpha=False)
            mask=Image.frombytes('L',(pix.width,pix.height),pix.samples).point(lambda v:255 if v<180 else 0)
            bounds=mask.getbbox()
            if not bounds:continue
            ink=fitz.Rect((pix.x+bounds[0])/3,(pix.y+bounds[1])/3,(pix.x+bounds[2])/3,(pix.y+bounds[3])/3)
            intersection=ink&rect
            sides=[side for side,value in [('left',rect.x0-ink.x0),('right',ink.x1-rect.x1),('top',rect.y0-ink.y0),('bottom',ink.y1-rect.y1)] if value>.25]
            if sides and not intersection.is_empty and intersection.width>.3 and intersection.height>.3:
                char,origin=traces.get(tuple(round(n,3) for n in box),('?',None))
                visible.append(dict(char=chr(char) if isinstance(char,int) else char,origin=origin,ink=list(ink),sides=sides))
        results.append(dict(id=finding['id'],role=finding['evidence']['role'],visibleGlyphs=visible))
    for doc in docs.values():doc.close()
    out=dict(scope=report['scope'],candidateCrops=len(results),cropsWithVisibleGlyphCrossing=sum(bool(r['visibleGlyphs']) for r in results),results=results,
             limitation='Ink crossing confirms pixels at the boundary; object ownership and significance require visual inspection. Outlined chemical structures can lack glyph ink warnings.')
    (ROOT/'references/enem-1000/boundary-pixel-audit.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({k:out[k] for k in ['scope','candidateCrops','cropsWithVisibleGlyphCrossing']}))


if __name__=='__main__':audit()
