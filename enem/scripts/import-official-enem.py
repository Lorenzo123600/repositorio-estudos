"""Import verified original ENEM regions, keeping published numeric indices immutable.
Python development dependencies: PyMuPDF, Pillow. No dependency at site runtime.
Usage: python scripts/import-official-enem.py --sources SOURCES.json --structured-root CHECKOUT --limit 50
"""
import sys,argparse,collections,hashlib,importlib.util,io,json,re,shutil,subprocess,unicodedata
from pathlib import Path
import fitz
from PIL import Image,ImageStat

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('official_pdf',Path(__file__).with_name('official-pdf.py'))
segment=importlib.util.module_from_spec(spec);spec.loader.exec_module(segment)
def read(p):return json.loads(Path(p).read_text())
def save(p,v):p=Path(p);p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
def sha(b):return hashlib.sha256(b).hexdigest()
def normalize(text):return re.sub(r'[^a-z0-9]','',unicodedata.normalize('NFKD',text).encode('ascii','ignore').decode().lower())
def canonical(year,n,language):return f'enem:{year}:regular:blue:{n}:{language or "pt"}'
def keys_from_pdf(path,day):
 if not shutil.which('pdftotext'):raise SystemExit('Instale Poppler (poppler-utils), que fornece o comando pdftotext.')
 text=subprocess.check_output(['pdftotext','-layout',str(path),'-'],text=True)
 keys={}
 for line in text.splitlines():
  a=[v for v in line.split() if v!="*"]
  if not a or not a[0].isdigit():continue
  if day==1 and int(a[0])<=5 and len(a)==5 and a[3].isdigit():
   keys[a[0]+'-ingles']=a[1];keys[a[0]+'-espanhol']=a[2];keys[a[3]]=a[4]
  elif len(a)==4 and a[2].isdigit():keys[a[0]]=a[1];keys[a[2]]=a[3]
  elif len(a)==3 and a[2].isdigit():keys[a[0]]=a[1];keys[a[2]]='unresolved'
  elif len(a)==3 and a[1].isdigit():keys[a[0]]='unresolved';keys[a[1]]=a[2]
  elif len(a)==2 and len(a[1])==1 and a[1] in 'ABCDE':keys[a[0]]=a[1]
  elif len(a)==1:keys[a[0]]='unresolved'
 for n in re.findall(r'Questão\s+(\d+)\s+Anulad[ao]',text,re.I):keys[n]='Anulada'
 return keys,text

def whitespace_boundary(page,y,left,right):
 rect=fitz.Rect(left,y-3,right,y+5);pix=page.get_pixmap(matrix=fitz.Matrix(2,2),clip=rect,alpha=False)
 im=Image.frombytes('RGB',(pix.width,pix.height),pix.samples).convert('L')
 candidates=[]
 for row in range(1,im.height-1):
  if im.crop((0,row,im.width,row+1)).getextrema()[0]>=245:candidates.append(y-3+row/2)
 if not candidates:raise ValueError('limite entre alternativas sem faixa de espaço livre')
 return min(candidates,key=lambda p:abs(p-(y+1)))

def render_crop(doc,page_index,rect):
 p=doc[page_index];r=fitz.Rect(rect)
 if r.width<80 or r.height<7 or not p.rect.contains(r):raise ValueError('recorte inválido ou fora da página')
 pix=p.get_pixmap(matrix=fitz.Matrix(2,2),clip=r,alpha=False)
 im=Image.frombytes('RGB',(pix.width,pix.height),pix.samples)
 if max(ImageStat.Stat(im).stddev)<1:raise ValueError('recorte vazio')
 buf=io.BytesIO();im.save(buf,format='WEBP',lossless=True,method=4)
 return buf.getvalue(),dict(width=im.width,height=im.height)

def readable_text(page,rect):
 text=page.get_text('text',clip=fitz.Rect(rect)).strip()
 if not text or '\ufffd' in text or any(ord(c)<32 and c not in '\n\r\t' for c in text):return None
 return text

def main():
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--sources',required=True);ap.add_argument('--structured-root',required=True);ap.add_argument('--limit',type=int,default=1000);args=ap.parse_args()
 if args.limit<1:raise SystemExit('Limite inválido')
 sources=read(args.sources);structured=Path(args.structured_root).resolve()
 commit=subprocess.check_output(['git','-C',str(structured),'rev-parse','HEAD'],text=True).strip()
 # All raw PDFs stay outside public/. They are reviewable, reproducible evidence.
 evidence_dir=ROOT/'references/enem-1000';evidence_dir.mkdir(exist_ok=True)
 source_records=[];lookup={};official_keys={}
 for r in sources:
  if 'error' in r:continue
  y,d,k=r['year'],r['day'],r['kind'];original=Path(r['path']);original=original if original.is_absolute() else ROOT/original;content=original.read_bytes()
  if sha(content)!=r['sha256']:raise SystemExit('Hash de fonte divergente: '+str(original))
  dest=evidence_dir/f'originals/{y}-{d}-{k}.pdf';dest.parent.mkdir(exist_ok=True)
  if original.resolve()!=dest.resolve():shutil.copyfile(original,dest)
  identity=normalize(''.join(p.get_text() for p in list(fitz.open(original))[:3]))
  if 'azul' not in identity or (k=='prova' and f'caderno{1 if d==1 else 7}azul' not in identity):raise SystemExit('Caderno não identificado como azul: '+str(original))
  record=dict(year=y,day=d,kind=k,application='regular',booklet='blue',path=str(dest.relative_to(ROOT)),sha256=sha(content),downloadUrl=r.get('url') or r['downloadUrl'],officialUrl=r.get('officialUrl'),retrievedAt='2026-11-02')
  lookup[y,d,k]=record;source_records.append(record)
  if k=='gabarito':
   keys,text=keys_from_pdf(dest,d)
   expected=95 if d==1 else 90
   if len(keys)!=expected:raise SystemExit(f'Tabela de gabarito incompleta {y}/{d}: {len(keys)}/{expected}')
   txt=dest.with_suffix('.txt');txt.write_text(text);record['textPath']=str(txt.relative_to(ROOT));record['textSha256']=sha(txt.read_bytes())
   official_keys.update({f'{y}-{key}':value for key,value in keys.items()})
 save(evidence_dir/'sources.json',source_records);save(evidence_dir/'answers.json',official_keys)
 catalog=read(ROOT/'src/question-catalog.json');legacy=read(ROOT/'src/official-questions.json')
 chunks={c['file']:read(ROOT/'public'/c['file']) for c in catalog['chunks']}
 published={q['id']:q for q in legacy}
 for items in chunks.values():published.update({q['id']:q for q in items})
 previous_indices={q['id']:q['index'] for c in catalog['chunks'] for q in c['questions']}
 # The first run must always start with a 50-item pilot; later runs only append/enrich.
 old_validated={q['id'] for q in published.values() if q.get('validation',{}).get('status')=='validated'}
 if not old_validated and args.limit>50:raise SystemExit('Execute primeiro --limit 50 e valide o piloto.')
 candidates=[];pending=[];rejected=[];all_headers=0
 for (year,day,kind),record in sorted(lookup.items()):
  if kind!='prova':continue
  doc,eligible,reasons,seen=segment.extract(ROOT/record['path']);all_headers+=sum(seen.values())
  safe={(q['number'],q['language']):q for q in eligible}
  numbers=range(1,91) if day==1 else range(91,181)
  for n in numbers:
   for language in (('ingles','espanhol') if n<=5 else (None,)):
    cid=canonical(year,n,language);qid=f'enem-{year}-{n}'+(f'-{language}' if language else '')
    key=official_keys.get(f'{year}-{n}'+(f'-{language}' if language else ''))
    if not key or len(key)!=1 or key not in 'ABCDE':
     rejected.append(dict(id=qid,canonicalId=cid,status='cancelled' if key and ('anulad' in key.lower() or key=='*') else 'pending',reason='gabarito anulado ou não resolvido',officialAnswer=key));continue
    if (n,language) not in safe:
     pending.append(dict(id=qid,canonicalId=cid,status='pending',reason='Não foi possível separar enunciado e A–E integralmente na mesma coluna.'));continue
    if n<=5 and seen[n]!=2:
     pending.append(dict(id=qid,canonicalId=cid,status='pending',reason='Identificação do idioma ambígua'));continue
    candidates.append((year,day,language,key,safe[n,language],record,qid,cid))
  doc.close()
 selected=[];fingerprints={};documents={};images_count=0
 for year,day,language,key,geometry,record,qid,cid in sorted(candidates,key=lambda t:(t[0],t[4]['number'],t[2] or '')):
  if len(selected)>=args.limit:break
  n=geometry['number'];raw_path=structured/f'public/{year}/questions/{n}'
  raw_path=raw_path.with_name(str(n)+(f'-{language}' if language else ''))/'details.json'
  raw=read(raw_path) if raw_path.exists() else None
  transcript=''
  if raw:
   transcript=' '.join([raw.get('context') or '',raw.get('alternativesIntroduction') or '',*[(a.get('text') or '') for a in raw.get('alternatives',[])]])
   transcript=re.sub(r'https?://\S+','',transcript)
  fingerprint=sha(normalize(transcript).encode()) if len(normalize(transcript))>80 else None
  if fingerprint and fingerprint in fingerprints:
   rejected.append(dict(id=qid,canonicalId=cid,status='duplicate',reason='Conteúdo textual duplicado',duplicateOf=fingerprints[fingerprint]));continue
  old=published.get(qid)
  if old and old['answer']!='ABCDE'.index(key):
   pending.append(dict(id=qid,canonicalId=cid,status='pending',reason='Gabarito histórico divergente: requer migração explícita'));continue
  try:
   doc=documents.setdefault((year,day),fitz.open(ROOT/record['path'])) if (year,day) not in documents else documents[year,day]
   pi=geometry['page']-1;page=doc[pi]
   left=geometry['stem'][0][1][0];right=geometry['stem'][0][1][2]
   bounds=[whitespace_boundary(page,label['y'],left,right) for label in geometry['labels']]
   stem_rect=[left,geometry['stem'][0][1][1],right,bounds[0]]
   option_rects=[[left,bounds[i],right,bounds[i+1] if i<4 else geometry['options'][4][1][3]] for i in range(5)]
   # Reject clipping that intersects text from outside the question column.
   for b in page.get_text('dict')['blocks']:
    for line in b.get('lines',[]):
     if 'ENEM' in ''.join(s['text'] for s in line['spans']).upper() and abs(line.get('dir',(1,0))[0])<.1:continue
     rr=fitz.Rect(line['bbox']);body=fitz.Rect(left,stem_rect[1],right,option_rects[-1][3])
     if rr.width>3 and rr.intersects(body) and rr.x0>=left and rr.x0<right and rr.x1>right+2:raise ValueError('texto ultrapassa o limite da coluna')
   assets=[];proofs=[]
   for i,rect in enumerate([stem_rect,*option_rects]):
    name='statement' if i==0 else 'ABCDE'[i-1];path=f'enem-assets/official/{year}/{n}'+(f'-{language}' if language else '')+f'/{name}.webp'
    dest=ROOT/'public'/path
    cached=next((a for a in (old or {}).get('validation',{}).get('assets',[]) if a['file']==path and a['page']==pi+1 and a['rect']==rect),None)
    if cached and (old or {}).get('validation',{}).get('statementSha256')==record['sha256'] and dest.exists() and sha(dest.read_bytes())==cached['sha256']:
     data=dest.read_bytes();size=dict(width=cached['width'],height=cached['height'])
    else:
     data,size=render_crop(doc,pi,rect);dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data)
    assets.append(path);proofs.append(dict(file=path,sha256=sha(data),page=pi+1,rect=rect,role=name,**size));images_count+=1
   area='Linguagens' if n<=45 else 'Humanas' if n<=90 else 'Natureza' if n<=135 else 'Matemática'
   discipline={'Linguagens':'Linguagens e Códigos','Humanas':'Ciências Humanas','Natureza':'Ciências da Natureza','Matemática':'Matemática'}[area]
   if language:discipline={'ingles':'Inglês','espanhol':'Espanhol'}[language]
   answer_record=lookup[year,day,'gabarito'];official_url=record.get('officialUrl') or f'https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos/{year}'
   q=dict(old) if old else dict(id=qid,year=year,number=n,area=area,discipline=discipline,language=language,topic=discipline,origin='enem',difficulty='unclassified',difficultyReason='Dificuldade não classificada; sem estimativa TRI.',text=f'Questão {n} — ENEM {year}',explanation='Resolução comentada não disponibilizada pela fonte. O gabarito foi conferido na prova oficial.',day=day,booklet='Azul',application='1ª aplicação')
   q.update(canonicalId=cid,context=f'![Enunciado original do ENEM {year}, questão {n}]({assets[0]})',options=[f'![Alternativa {a} original]({p})' for a,p in zip('ABCDE',assets[1:])],answer='ABCDE'.index(key),images=assets,source=q.get('source') or official_url,officialSource=official_url,answerSource=answer_record.get('officialUrl') or answer_record['downloadUrl'],answerVerification=answer_record['path'],originalStatement=dict(format='image',file=assets[0],source=record['path'],page=pi+1,transcript=readable_text(page,stem_rect)),alternatives=[dict(letter=a,format='image',file=p,text=readable_text(page,rect)) for a,p,rect in zip('ABCDE',assets[1:],option_rects)],officialAnswer=key,validation=dict(status='validated',method='official-pdf-regions-v1',application='regular',booklet='blue',answerEvidence=answer_record['path'],statementEvidence=record['path'],statementSha256=record['sha256'],layout=geometry['layout'],answerSha256=answer_record['sha256'],header=dict(number=n,rect=geometry['header'],page=pi+1),labels=geometry['labels'],assets=proofs),license='Créditos e direitos conforme o caderno INEP; metadados estruturados GPL-2.0',structuredSource=f'https://github.com/yunger7/enem-api/blob/{commit}/public/{year}/questions/{raw_path.parent.name}/details.json' if raw else None,contentFingerprint=fingerprint or sha('|'.join(a['sha256'] for a in proofs).encode()))
   q['explanationStatus']='preserved-editorial' if old else 'not-provided'
   if not raw:q['license']='Créditos e direitos conforme o caderno original do INEP; sem declaração de domínio público'
   if raw:q['structuredSourceSha256']=sha(raw_path.read_bytes())
   if qid in published:published[qid].update(q)
   else:
    path=f'questions/{year}'+('-supplement' if year in (2022,2023) else '')+'.json'
    if path in chunks and path!=list(chunks)[-1]:
     part=2
     while f'questions/{year}-part-{part}.json' in chunks:part+=1
     path=f'questions/{year}-part-{part}.json'
    # Reuse this run's new final part for the same year.
    last=list(chunks)[-1]
    if last.startswith(f'questions/{year}-part-') and last not in {c['file'] for c in catalog['chunks']}:path=last
    chunks.setdefault(path,[]).append(q);published[qid]=q
   selected.append(q)
   if len(selected)%100==0:print(f'{len(selected)} candidatos aprovados na extração; conferência final ainda necessária.',flush=True)
   if fingerprint:fingerprints[fingerprint]=cid
  except ValueError as e:pending.append(dict(id=qid,canonicalId=cid,status='pending',reason=str(e)))
 for doc in documents.values():doc.close()
 if not old_validated.issubset({q['id'] for q in selected}):raise SystemExit('A execução retiraria validações existentes; aumente o limite ou revise as fontes.')
 for q in published.values():
  q.setdefault('canonicalId',canonical(q['year'],q['number'],q.get('language')))
  if q.get('validation',{}).get('status')!='validated':
   cancelled=q['id']=='enem-2023-164'
   q['validation']=dict(status='cancelled' if cancelled else 'pending' if len(selected)>=1000 else 'legacy',reason='Registro anterior preservado para o histórico; não contado na meta.')
 # Existing files and their order stay intact; new chunks append after existing indices.
 catalog['version']=2;catalog['sourceCommit']=commit
 existing_files={c['file'] for c in catalog['chunks']};index=92+sum(len(c['questions']) for c in catalog['chunks'])
 for path,items in chunks.items():
  content=(json.dumps(items,ensure_ascii=False,indent=2)+'\n').encode();dest=ROOT/'public'/path;dest.parent.mkdir(exist_ok=True);dest.write_bytes(content)
  chunk=next((c for c in catalog['chunks'] if c['file']==path),None)
  if chunk is None:chunk=dict(file=path,questions=[]);catalog['chunks'].append(chunk)
  meta=[]
  for q in items:
   qindex=previous_indices.get(q['id'])
   if qindex is None:qindex=index;index+=1
   meta.append({**{k:q.get(k) for k in ('id','year','number','area','discipline','language','difficulty','answer','origin','topic','canonicalId','contentFingerprint')},'validationStatus':q.get('validation',{}).get('status','legacy'),'index':qindex})
  chunk.update(questions=meta,sha256=sha(content))
 # Metadata cannot be resorted: retain published chunk order and all prior indices.
 for c in catalog['chunks']:
  for q in c['questions']:
   if q['id'] in previous_indices and q['index']!=previous_indices[q['id']]:raise SystemExit('Índice alterado')
 save(ROOT/'src/official-questions.json',legacy)
 save(ROOT/'src/question-catalog.json',catalog)
 selected_ids={q['id'] for q in selected}
 accounted=selected_ids|{q['id'] for q in pending}|{q['id'] for q in rejected}
 deferred=[dict(id=t[6],canonicalId=t[7],status='pending',reason='Limite do lote atingido; candidato não importado') for t in candidates if t[6] not in accounted]
 pending.extend(deferred)
 counts=collections.Counter((q['year'],q['area']) for q in selected)
 all_eligible=[q for q in published.values() if q['validation']['status'] not in ('cancelled','pending')]
 report=dict(schemaVersion=2,target=1000,limit=args.limit,found=all_headers,validated=len(selected),targetReached=len(selected)>=1000,newImported=sum(q['id'] not in {r['id'] for r in read(evidence_dir/'baseline.json')['questions']} for q in selected),pending=pending,rejected=rejected,notSelected=len(deferred),counts=[dict(year=y,area=a,count=v) for (y,a),v in sorted(counts.items())],sourceCommit=commit,images=images_count,totalStored=len(published),totalEligible=len(all_eligible),legacyNotCounted=len(all_eligible)-len(selected))
 save(evidence_dir/'report.json',report)
 batch_path=evidence_dir/f'batches/{args.limit}.json'
 old_batch=read(batch_path) if batch_path.exists() else {}
 save(batch_path,dict(validated=len(selected),canonicalIds=[q['canonicalId'] for q in selected],counts=report['counts'],**({'verification':old_batch['verification']} if 'verification' in old_batch else {})))
 save(evidence_dir/'pending.json',pending+rejected)
 manifest=dict(version=2,validatedCount=len(selected),totalEligible=len(all_eligible),years=sorted({q['year'] for q in all_eligible}),files=[dict(file=c['file'],sha256=c['sha256'],count=len(c['questions']),years=sorted({q['year'] for q in c['questions']})) for c in catalog['chunks']])
 save(ROOT/'public/questions/manifest.json',manifest)
 subprocess.run([sys.executable,str(ROOT/'scripts/clean-official-assets.py')],check=True)
 print(json.dumps({k:report[k] for k in ('found','validated','targetReached','totalStored','totalEligible','legacyNotCounted')},indent=2))
if __name__=='__main__':main()
