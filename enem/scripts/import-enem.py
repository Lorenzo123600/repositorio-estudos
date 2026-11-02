"""Import pinned API ENEM checkout; no runtime API calls. Usage: python scripts/import-enem.py SOURCE_CHECKOUT"""
import sys,json,re,shutil,hashlib,subprocess
from pathlib import Path
from collections import Counter
root=Path(__file__).resolve().parents[1]
source=Path(sys.argv[1]).resolve()
commit=subprocess.check_output(['git','-C',str(source),'rev-parse','HEAD'],text=True).strip()
keys=json.loads((root/'references/official-keys/answers.json').read_text())
corrections={q['id']:q for q in json.loads((root/'references/enem-transcription-corrections.json').read_text())}
legacy=json.loads((root/'src/official-questions.json').read_text());existing={q['id'] for q in legacy}
areas={'linguagens':'Linguagens','ciencias-humanas':'Humanas','ciencias-natureza':'Natureza','matematica':'Matemática'}
disciplines={'Linguagens':'Linguagens e Códigos','Humanas':'Ciências Humanas','Natureza':'Ciências da Natureza','Matemática':'Matemática'}
out=root/'public/questions';out.mkdir(parents=True,exist_ok=True)
chunks={};rejected=[]
for year in (2022,2023):
 for p in sorted((source/f'public/{year}/questions').glob('*/details.json'),key=lambda p:p.parent.name):
  raw=json.loads(p.read_text());n=raw['index'];lang=raw.get('language');qid=f'enem-{year}-{n}'+(f'-{lang}' if lang else '')
  if qid in existing:continue
  try:
   area='Linguagens' if n<=45 else 'Humanas' if n<=90 else 'Natureza' if n<=135 else 'Matemática';answer=raw['correctAlternative'];key=keys[f'{year}-{n}'+(f'-{lang}' if lang else '')]
   assert answer==key and answer in 'ABCDE','gabarito divergente/anulado'
   alts=raw['alternatives'];assert len(alts)==5 and [a['letter'] for a in alts]==list('ABCDE'),'alternativas ausentes/fora de ordem'
   assert [a['letter'] for a in alts if a['isCorrect']]==[answer],'marcações de resposta inconsistentes'
   context=raw.get('context') or '';text=raw.get('alternativesIntroduction') or ''
   assert (context+text).strip(),'enunciado/chamada ausente'
   if not context and '\n' in text:context,text=text.rsplit('\n',1)
   if not text:context,text='',context
   images=[]
   def local(url):
    assert url.startswith('https://enem.dev/'),'imagem externa não suportada'
    rel=url.removeprefix('https://enem.dev/');src=source/'public'/rel
    assert src.is_file() and src.stat().st_size>100,'imagem ausente'
    assert src.suffix.lower() in ('.png','.jpg','.jpeg','.webp'),'formato de imagem não suportado'
    dest=root/'public/enem-assets'/rel;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(src,dest)
    target='enem-assets/'+rel;images.append(target);return target
   def convert(s):
    return re.sub(r'!\[([^\]]*)\]\(([^)]+)\)',lambda m:f'![{m[1]}]({local(m[2])})',s)
   original=context+'\n'+text+'\n'+'\n'.join((a.get('text') or '')+(a.get('file') or '') for a in alts)
   assert all(u in original for u in raw.get('files',[])),'imagem listada sem posição no conteúdo'
   assert not re.search(r'<(?:img|table|sup|sub)|\\(?:frac|begin)|\$\$',original),'formatação não suportada'
   options=[convert(a.get('text') or '')+(f'\n![]({local(a["file"])})' if a.get('file') else '') for a in alts]
   assert all(a.strip() for a in options) and len(set(a.strip() for a in options))==5,'alternativas vazias/duplicadas'
   d=1 if n<=90 else 2;c=1 if d==1 else 7;base=f'https://download.inep.gov.br/enem/provas_e_gabaritos/{year}'
   q=dict(id=qid,year=year,number=n,area=area,discipline=('Inglês' if lang=='ingles' else 'Espanhol' if lang=='espanhol' else disciplines[area]),language=lang,topic=disciplines[area],difficulty='unclassified',difficultyReason='Não foi atribuída dificuldade editorial a este item.',origin='enem',context=convert(context),text=convert(text),options=options,answer='ABCDE'.index(answer),explanation=f'Gabarito oficial: {answer}. Resolução comentada ainda não disponível.',source=f'https://github.com/yunger7/enem-api/blob/{commit}/public/{year}/questions/{p.parent.name}/details.json',officialSource=base+f'_PV_impresso_D{d}_CD{c}.pdf',answerSource=base+f'_GB_impresso_D{d}_CD{c}.pdf',answerVerification=f'references/official-keys/{year}-d{d}.pdf',day=d,booklet='Azul',application='1ª aplicação',images=list(dict.fromkeys(images)),license='GPL-2.0',sourceSha256=hashlib.sha256(p.read_bytes()).hexdigest())
   if qid in corrections:
    fix=corrections[qid]
    for a,value in fix['options'].items():q['options'][int(a)]=value
    if 'text' in fix:q['text']=fix['text']
    q['transcriptionCorrection']='references/enem-transcription-corrections.json'
   chunks.setdefault(f'{year}-{next(k for k,v in areas.items() if v==area)}.json',[]).append(q)
  except (AssertionError,KeyError) as e:rejected.append(dict(id=qid,reason=str(e)))
# Refuse index changes on subsequent imports; existing users depend on this mapping.
previous=root/'src/question-catalog.json'
ordered=[q['id'] for name,items in sorted(chunks.items()) for q in sorted(items,key=lambda q:(q['number'],q['language'] or ''))]
if previous.exists():
 old=[q['id'] for c in json.loads(previous.read_text())['chunks'] for q in c['questions']]
 assert ordered[:len(old)]==old,'Importação renumeraria registros existentes; acrescente os novos arquivos ao final do catálogo.'
manifest={'version':1,'sourceCommit':commit,'legacyCount':len(legacy)+20,'chunks':[]}
index=len(legacy)+20
for name,items in sorted(chunks.items()):
 items.sort(key=lambda q:(q['number'],q['language'] or ''))
 content=(json.dumps(items,ensure_ascii=False,indent=2)+'\n').encode();(out/name).write_bytes(content)
 meta=[]
 for q in items:
  meta.append({**{k:q[k] for k in ('id','year','number','area','discipline','language','difficulty','answer','origin','topic')},'index':index});index+=1
 manifest['chunks'].append(dict(file='questions/'+name,sha256=hashlib.sha256(content).hexdigest(),questions=meta))
(root/'src/question-catalog.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(root/'references/enem-import-report.json').write_text(json.dumps(dict(sourceCommit=commit,imported=index-92,rejected=rejected,counts={name:len(items) for name,items in sorted(chunks.items())}),ensure_ascii=False,indent=2)+'\n')
print(json.dumps(dict(imported=index-92,rejected=len(rejected),counts={name:len(items) for name,items in sorted(chunks.items())}),ensure_ascii=False,indent=2))
