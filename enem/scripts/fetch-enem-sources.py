"""Fetch pinned original documents for an offline import; never used by the website."""
import argparse,concurrent.futures,hashlib,json,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def main():
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--output',type=Path,default=ROOT/'work/enem-sources');args=ap.parse_args();args.output.mkdir(parents=True,exist_ok=True)
 records=json.loads((ROOT/'references/enem-1000/source-downloads.json').read_text())
 def fetch(r):
  p=args.output/f'{r["year"]}-{r["day"]}-{r["kind"]}.pdf';error=None
  if not p.exists() or hashlib.sha256(p.read_bytes()).hexdigest()!=r['sha256']:
   for url in dict.fromkeys([r.get('officialUrl'),r['url']]):
    if not url:continue
    try:
     b=urllib.request.urlopen(url,timeout=45).read()
     if not b.startswith(b'%PDF') or hashlib.sha256(b).hexdigest()!=r['sha256']:raise ValueError('PDF diferente da versão revisada; requer nova revisão')
     p.write_bytes(b);break
    except Exception as e:error=str(e)
   else:return {**r,'error':error}
  return {**r,'path':str(p.resolve())}
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:result=list(ex.map(fetch,records))
 output=args.output/'downloads.json';output.write_text(json.dumps(result,indent=2)+'\n')
 failed=[r for r in result if 'error' in r]
 print(f'{len(result)-len(failed)}/{len(result)} documentos verificados. Manifesto: {output}')
 if failed:
  for r in failed:print(r['year'],r['day'],r['kind'],r['error'])
  raise SystemExit(1)
if __name__=='__main__':main()
