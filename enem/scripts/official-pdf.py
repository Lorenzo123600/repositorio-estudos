"""Conservative segmentation: only a full statement and A–E in one column are eligible."""
import fitz,re,json,collections
from pathlib import Path

def horizontal_rules(page):
 """Read individual strokes: a path can also contain unrelated page borders."""
 for drawing in page.get_drawings():
  for item in drawing['items']:
   if item[0]=='l':
    a,b=item[1:3]
    if abs(a.y-b.y)<.1:
     yield min(a.x,b.x),max(a.x,b.x),a.y,(drawing.get('width') or 0)/2

def page_furniture(page):
 return ([line for block in page.get_text('dict')['blocks'] for line in block.get('lines',[])],list(horizontal_rules(page)))

def content_bottom(page, left, right, next_header=None, option_top=None, furniture=None):
 """Exclude page-wide furniture and the separator above the next question.

 Inspect the WHOLE page, before column/margin filtering. Some footers live
 only in the left column or below the old text filter's height cutoff.
 Never infer the end of E from a blank row: diagrams can contain large gaps.
 """
 bottom=next_header-1 if next_header is not None else page.rect.height-27
 lines,rules=furniture if furniture is not None else page_furniture(page)
 for line in lines:
   text=''.join(s['text'] for s in line['spans']).strip()
   if line['bbox'][1]>page.rect.height*.9 and re.search(r'Caderno\s+\d|Página\s+\d|ENEM\s*20\d\d',text,re.I):
    bottom=min(bottom,line['bbox'][1]-1)
 for x0,x1,y,half_width in rules:
  footer=y>page.rect.height*.9 and x1-x0>page.rect.width*.7
  separator=(next_header is not None and 0<next_header-y<16
             and x0<=left+16 and x1>=right-10 and x1-x0>right-left-20)
  if footer or separator:bottom=min(bottom,y-half_width-.25)
 # Some final questions end with a column rule followed by an empty area.
 # Require white space above AND an entirely empty area below: never treat
 # an axis, table border, fraction bar or a gap inside a figure as an ending.
 if option_top is not None:
  def blank(top,end):
   if end<=top:return False
   pix=page.get_pixmap(clip=fitz.Rect(left,top,right,end),colorspace=fitz.csGRAY,alpha=False)
   return bool(pix.samples) and min(pix.samples)>=245
  for x0,x1,y,half_width in rules:
   if (option_top+10<y<bottom-2 and x0<=left+16 and x1>=right-12
       and x1-x0>right-left-20 and blank(y-4,y-half_width-1)
       and blank(y+half_width+1,bottom)):
    bottom=min(bottom,y-half_width-.25)
 return bottom

def extract(path):
 doc=fitz.open(path);regions=[];heads=[]
 for pi,page in enumerate(doc):
  if pi==0:continue
  furniture=page_furniture(page)
  lines=[]
  for b in page.get_text('dict')['blocks']:
   for l in b.get('lines',[]):
    text=''.join(s['text'] for s in l['spans']);r=fitz.Rect(l['bbox'])
    lines.append(dict(text=text,rect=r,direction=l.get('dir',(1,0))))
  header_lines=[l for l in lines if re.fullmatch(r'quest[ãa]o\s+\d{1,3}',l['text'].strip(),re.I)]
  wide=bool(header_lines) and all(l['rect'].x0<page.rect.width/2 for l in header_lines) and any(l['rect'].width>page.rect.width*.65 and l['rect'].y0>min(h['rect'].y0 for h in header_lines) and abs(l['direction'][0])>.9 for l in lines)
  columns=[(0,page.rect.width)] if wide else [(0,page.rect.width/2),(page.rect.width/2,page.rect.width)]
  for col,(left,right) in enumerate(columns):
   ls=[l for l in lines if left<=l['rect'].x0<right and l['rect'].y0>51 and l['rect'].y1<page.rect.height-22 and l['rect'].width>3 and not ('ENEM' in l['text'].upper() and abs(l['direction'][0])<.1)]
   hs=[]
   for l in ls:
    m=re.fullmatch(r'quest[ãa]o\s+(\d{1,3})',l['text'].strip(),re.I)
    if m:hs.append(dict(number=int(m[1]),rect=l['rect']))
   hs.sort(key=lambda h:h['rect'].y0)
   regions.append(dict(page=pi,col=col,left=left,right=right,wide=wide,lines=ls,heads=hs,furniture=furniture,watermarks=[l['rect'].x0 for l in lines if 'ENEM' in l['text'].upper() and abs(l['direction'][0])<.1 and l['rect'].height>page.rect.height*.4 and abs(l['rect'].x0-page.rect.width/2)<8]))
 results=[];reasons=collections.Counter();seen=collections.Counter()
 for ri,reg in enumerate(regions):
  for hi,h in enumerate(reg['heads']):
   n=h['number'];seen[n]+=1;lang=('ingles' if seen[n]==1 else 'espanhol') if n<=5 else None
   page=doc[reg['page']]
   x=h['rect'].x0;y=h['rect'].y0-1;right=reg['right']-1 if reg['wide'] else min(reg['right']-1,x+257)
   if not reg['wide'] and reg['col']==0 and reg['watermarks']:right=min(right,min(reg['watermarks'])-.5)
   next_header=reg['heads'][hi+1]['rect'].y0 if hi+1<len(reg['heads']) else None
   # options add one point below bottom, so reserve it here too.
   crop_left=max(reg['left']+2,x-8)
   bottom=content_bottom(page,crop_left,right,next_header,furniture=reg['furniture'])-1
   ls=[l for l in reg['lines'] if y-3<=l['rect'].y0<bottom]
   labels=[]
   for l in sorted(ls,key=lambda l:l['rect'].y0):
    m=re.match(r'^([ABCDE])(?:\s|$)',l['text'])
    if m and abs(l['rect'].x0-x)<3:
     a=m[1]
     if labels and labels[-1][0]==a and abs(labels[-1][1]-l['rect'].y0)<5:continue
     labels.append((a,l['rect'].y0))
   starts=[i for i in range(len(labels)-4) if ''.join(a for a,_ in labels[i:i+5])=='ABCDE']
   if len(starts)!=1:reasons['alternativas fora da mesma coluna/ambíguas']+=1;continue
   labels=labels[starts[0]:starts[0]+5]
   bottom=min(bottom,content_bottom(page,crop_left,right,next_header,labels[-1][1],reg['furniture'])-1)
   # Stop at content boundary including E's whole paragraph/figure, never include footer.
   # Layouts with continuation before next column's first heading are quarantined.
   if hi==len(reg['heads'])-1 and ri+1<len(regions):
    nr=regions[ri+1];first=nr['heads'][0]['rect'].y0 if nr['heads'] else 1e6
    prefix=[l for l in nr['lines'] if l['rect'].y0<first-3 and l['rect'].y0<doc[nr['page']].rect.height-35 and len(l['text'].strip())>5 and not re.search(r'TECNOLOGIAS|Questões de|LINGUAGENS|HUMANAS|NATUREZA|MATEMÁTICA|INGLÊS|ESPANHOL|ENEM 20|Caderno|Página|^\*',l['text'],re.I)]
    if prefix:reasons['continuação de coluna não segura']+=1;continue
   clips=[(reg['page'],[max(reg['left']+2,x-8),y,right,labels[0][1]+1])]
   if x-reg['left']>80:reasons['recuo de coluna inesperado']+=1;continue
   options=[]
   for j,(a,top) in enumerate(labels):
    end=labels[j+1][1]-1 if j<4 else bottom
    if end-top<7:break
    options.append((reg['page'],[max(reg['left']+2,x-8),top-1,right,end+1]))
   if len(options)!=5 or clips[0][1][3]-y<10:reasons['limites inválidos']+=1;continue
   results.append(dict(number=n,language=lang,page=reg['page']+1,header=list(h['rect']),layout='single-column' if reg['wide'] else 'two-column',labels=[dict(letter=a,y=top) for a,top in labels],stem=clips,options=options))
 return doc,results,reasons,seen
