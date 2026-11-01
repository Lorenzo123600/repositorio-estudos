import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path,root),'utf8');
test('ambos os aplicativos preservam suas chaves de progresso legadas',()=>{
 const enem=read('enem/src/main.js'), prumo=read('index.html');
 assert.match(enem,/enem-reta-final/);assert.match(prumo,/prumo-uepg-v1/);
 assert.match(enem,/cloud\?\.changed\(\)/);assert.match(prumo,/studyCloud\?\.changed\(\)/);
});
test('SQL exige autenticação, RLS e escrita por revisão',()=>{
 const sql=read('supabase/migrations/001_study_progress.sql');
 assert.match(sql,/enable row level security/i);
 assert.match(sql,/auth\.uid\(\)/i);
 assert.match(sql,/revision=p_expected_revision/);
 assert.match(sql,/on conflict .* do nothing/i);
});
test('nenhuma credencial administrativa é incluída no cliente',()=>{
 for(const f of ['cloud-sync.js','enem/src/cloud-sync.js']){
  const source=read(f); assert.doesNotMatch(source,/sb_secret_|['\"]service_role['\"]|SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(source,/sb_publishable_/);
  assert.match(source,/function makeBackup/);
  assert.match(source,/function conflictUI/);
 }
});
test('as duas integrações usam app_id distinto',()=>{
 assert.match(read('index.html'),/appId:'prumo'/);
 assert.match(read('enem/src/main.js'),/appId:'enem'/);
});
