"""Recover missing text using exact embedded-font outline matches, never OCR guesses.

Only wholly decoded regions are accepted. Unknown glyphs keep the region pending.
Default audits; --write updates missing transcripts and their provenance only.
"""
import argparse
import collections
import importlib.util
import io
import json
import re
from pathlib import Path

import fitz
from fontTools import agl
from fontTools.cffLib import CFFFontSet
from fontTools.pens.recordingPen import RecordingPen

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('importer',ROOT/'scripts/import-official-enem.py')
imp=importlib.util.module_from_spec(spec);spec.loader.exec_module(imp)


def family(name):return re.sub(r'^[A-Z]{6}\+','',name).replace('-Identity-H','')


class Decoder:
    def __init__(self,sources):
        self.docs={};self.fonts={};self.known=collections.defaultdict(set);self.page_replacements={};self.bad_origins={}
        for source in sources:
            if source['kind']!='prova':continue
            path=source['path'];assert imp.sha((ROOT/path).read_bytes())==source['sha256']
            doc=fitz.open(ROOT/path);self.docs[path]=doc
            fonts={f[0]:f for page in doc for f in page.get_fonts() if f[1] in ('cff','cid') and 'Arial' in f[3]}
            for xref,ext,kind,name,*_ in fonts.values():
                data=doc.extract_font(xref)[3]
                if not data:continue
                cff=CFFFontSet();cff.decompile(io.BytesIO(data),None);font=cff[cff.fontNames[0]];mapping={}
                for index,glyph in enumerate(font.charset):
                    pen=RecordingPen();charstring=font.CharStrings[glyph];charstring.draw(pen)
                    signature=(family(name),repr((pen.value,round(charstring.width,4))))
                    unicode=agl.toUnicode(glyph)
                    if unicode:self.known[signature].add(unicode)
                    gid=int(glyph[3:]) if ext=='cid' and glyph.startswith('cid') else index
                    mapping[gid]=signature
                self.fonts[path,xref]=mapping

    def replacements(self,path,pi):
        key=(path,pi)
        if key in self.page_replacements:return self.page_replacements[key]
        page=self.docs[path][pi];fonts=collections.defaultdict(list)
        for xref,ext,kind,name,*_ in page.get_fonts():
            if (path,xref) in self.fonts:fonts[family(name)].append(self.fonts[path,xref])
        result={};bad_origins=set()
        for span in page.get_texttrace():
            # Leave valid ToUnicode text untouched. Nonembedded fallback fonts
            # can use different glyph numbering despite the same family name.
            if not any(u==65533 or u<32 for u,*_ in span['chars']):continue
            for u,gid,origin,bbox in span['chars']:
                candidates=[]
                for mapping in fonts.get(family(span['font']),[]):
                    if gid not in mapping:continue
                    values=self.known[mapping[gid]]
                    candidates.append(next(iter(values)) if len(values)==1 else ' ' if values and all(v.isspace() for v in values) else None)
                decoded=candidates[0] if candidates and all(v==candidates[0] for v in candidates) else None
                origin_key=(family(span['font']),round(origin[0],3),round(origin[1],3))
                bad_origins.add(origin_key)
                glyph_key=(*origin_key,round(bbox[2]-bbox[0],3))
                if glyph_key in result and result[glyph_key]!=decoded:result[glyph_key]=None
                else:result[glyph_key]=decoded
        self.page_replacements[key]=result
        self.bad_origins[key]=bad_origins
        return result

    def extract(self,path,pi,rect):
        page=self.docs[path][pi];replacements=self.replacements(path,pi);lines=[];decoded_count=0
        for block in page.get_text('rawdict',clip=fitz.Rect(rect))['blocks']:
            for line in block.get('lines',[]):
                chars=[]
                for span in line['spans']:
                    for char in span['chars']:
                        origin=char['origin'];origin_key=(family(span['font']),round(origin[0],3),round(origin[1],3));key=(*origin_key,round(char['bbox'][2]-char['bbox'][0],3))
                        text=char['c']
                        if char.get('synthetic') and text.isspace():chars.append(text);continue
                        if origin_key in self.bad_origins[path,pi] and key not in replacements:return None,dict(reason='ambiguous_glyph_position',font=span['font'],origin=origin)
                        if key in replacements:
                            text=replacements[key];decoded_count+=1
                            if text is None:return None,dict(reason='unmapped_or_ambiguous_glyph',font=span['font'],origin=origin)
                        if '\ufffd' in text or any(ord(c)<32 and c not in '\n\r\t' for c in text):return None,dict(reason='invalid_character_without_safe_mapping',font=span['font'],origin=origin)
                        chars.append(text)
                lines.append(''.join(chars))
        text='\n'.join(lines).strip()
        return text or None,dict(method='exact-embedded-font-outline-match-v1',decodedGlyphs=decoded_count)


def run(write=False):
    catalog=imp.read(ROOT/'src/question-catalog.json');decoder=Decoder(imp.read(ROOT/'references/enem-1000/sources.json'))
    paths=[ROOT/'src/official-questions.json',*[ROOT/'public'/c['file'] for c in catalog['chunks']]]
    recovered=[];pending=[];writes=[]
    for path in paths:
        questions=imp.read(path);changed=False
        for q in questions:
            v=q.get('validation',{})
            if v.get('status')!='validated':continue
            for asset in v['assets']:
                role=asset['role'];target=q['originalStatement'] if role=='statement' else q['alternatives']['ABCDE'.index(role)];field='transcript' if role=='statement' else 'text'
                if target.get(field):continue
                text,evidence=decoder.extract(v['statementEvidence'],asset['page']-1,asset['rect'])
                item=dict(id=q['id'],role=role,**evidence)
                if text:
                    recovered.append(item)
                    if write:target[field]=text;target['transcriptRecovery']=dict(**evidence,sourceSha256=v['statementSha256'],page=asset['page'],rect=asset['rect']);changed=True
                else:pending.append(item)
        if changed:writes.append((path,questions))
    for doc in decoder.docs.values():doc.close()
    if write:
        for path,questions in writes:imp.save(path,questions)
        for chunk in catalog['chunks']:chunk['sha256']=imp.sha((ROOT/'public'/chunk['file']).read_bytes())
        imp.save(ROOT/'src/question-catalog.json',catalog);manifest=imp.read(ROOT/'public/questions/manifest.json')
        for entry in manifest['files']:entry['sha256']=imp.sha((ROOT/'public'/entry['file']).read_bytes())
        imp.save(ROOT/'public/questions/manifest.json',manifest)
    report=dict(recovered=len(recovered),pending=len(pending),written=write,changes=recovered,unresolved=pending,method='Exact font outlines, advance widths, font family and glyph positions; no OCR or guessed glyph names. Unknown glyphs reject the whole region.')
    imp.save(ROOT/'references/enem-1000'/('transcript-recovery.json' if write else 'transcript-recovery-check.json'),report)
    print(json.dumps({k:report[k] for k in ('recovered','pending','written')}))
    return report


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--write',action='store_true');args=parser.parse_args();run(args.write)
