"""Re-render every validated region from the archived official PDF and compare pixels."""
import hashlib,importlib.util,json,sys,re,unicodedata
from pathlib import Path
import fitz
from PIL import Image,ImageChops
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('importer',ROOT/'scripts/import-official-enem.py');imp=importlib.util.module_from_spec(spec);spec.loader.exec_module(imp)
read=lambda p:json.loads(Path(p).read_text())
catalog=read(ROOT/'src/question-catalog.json')
questions=read(ROOT/'src/official-questions.json')
for c in catalog['chunks']:questions.extend(read(ROOT/'public'/c['file']))
questions=[q for q in questions if q.get('validation',{}).get('status')=='validated']
sources=read(ROOT/'references/enem-1000/sources.json');keys={};geometries={};documents={}
for s in sources:
 path=ROOT/s['path'];assert hashlib.sha256(path.read_bytes()).hexdigest()==s['sha256'],str(path)
 if s['kind']=='gabarito':
  table,_=imp.keys_from_pdf(path,s['day']);keys.update({f'{s["year"]}-{n}':v for n,v in table.items()})
 else:
  identity=imp.normalize(''.join(page.get_text() for page in list(fitz.open(path))[:3]))
  assert f'caderno{1 if s["day"]==1 else 7}azul' in identity,'Identificação de caderno inválida'
  doc,eligible,_,_=imp.segment.extract(path);documents[s['path']]=doc
  geometries[s['path']]={(q['number'],q['language']):q for q in eligible}
language_cues={}
for path,doc in documents.items():
 cues=[]
 for pi,page in enumerate(doc):
  for block in page.get_text('dict')['blocks']:
   for line in block.get('lines',[]):
    text=unicodedata.normalize('NFKD',''.join(s['text'] for s in line['spans'])).encode('ascii','ignore').decode().lower()
    m=re.search(r'opcao\s*:?\s*(ingles|espanhol)',text)
    if m:cues.append(((pi+1,0 if line['bbox'][0]<page.rect.width/2 else 1,line['bbox'][1]),m[1]))
 language_cues[path]=sorted(cues)
seen=set();assets=0;furniture={}
for q in questions:
 assert q['canonicalId'] not in seen,'ID canônico duplicado';seen.add(q['canonicalId'])
 assert keys[f'{q["year"]}-{q["number"]}'+(f'-{q["language"]}' if q.get('language') else '')]=='ABCDE'[q['answer']],q['id']+' gabarito'
 v=q['validation'];g=geometries[v['statementEvidence']][q['number'],q.get('language')]
 assert g['page']==v['header']['page'] and g['header']==v['header']['rect'],q['id']+' cabeçalho'
 assert g['labels']==v['labels'],q['id']+' alternativas'
 doc=documents[v['statementEvidence']]
 # Prime page font/image resources just as the importer does before rendering.
 # MuPDF color/font caches otherwise make some embedded images order-dependent.
 doc[v['header']['page']-1].get_text('dict')
 if q.get('language'):
  page=doc[v['header']['page']-1];order=(v['header']['page'],0 if v['header']['rect'][0]<page.rect.width/2 else 1,v['header']['rect'][1])
  cues=[lang for position,lang in language_cues[v['statementEvidence']] if position<order]
  assert cues and cues[-1]==q['language'],q['id']+' idioma não corresponde ao cabeçalho oficial'
 for a in v['assets']:
  # Pixel equality alone also accepts a faithfully rendered, WRONG crop.
  # Check semantic page boundaries before comparing the archived pixels.
  page=doc[a['page']-1]
  page_key=(v['statementEvidence'],a['page'])
  if page_key not in furniture:furniture[page_key]=imp.segment.page_furniture(page)
  limit=imp.segment.content_bottom(page,a['rect'][0],a['rect'][2],furniture=furniture[page_key])
  assert a['rect'][3]<=limit+.01,q['id']+' recorte contém rodapé/linha da página'
  if a['role']=='E':
   assert a['rect'][3]<=g['options'][-1][1][3]+.01,q['id']+' alternativa E contém separador da próxima questão'
  pix=doc[a['page']-1].get_pixmap(matrix=fitz.Matrix(2,2),clip=fitz.Rect(a['rect']),alpha=False)
  expected=Image.frombytes('RGB',(pix.width,pix.height),pix.samples)
  with Image.open(ROOT/'public'/a['file']) as original:
   actual=original.convert('RGB');assert actual.size==expected.size and ImageChops.difference(expected,actual).getbbox() is None,q['id']+' imagem não corresponde ao PDF'
  assets+=1
for doc in documents.values():doc.close()
print(json.dumps(dict(verified=len(questions),canonicalUnique=len(seen),originalImages=assets,method='pixel comparison against archived official PDF regions')))
