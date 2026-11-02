import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {commercialQuestion} from '../scripts/commercial-question.mjs';
import {questionBody,questionSource,optionBody} from '../src/question-view.js';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const catalog=read('../src/question-catalog.json');
const questions=[...read('../src/official-questions.json'),...catalog.chunks.flatMap(chunk=>read('../public/'+chunk.file))];
test('compact commercial content preserves every original, transcript, option and answer',()=>{
 for(const original of questions){
  const compact=commercialQuestion(original);
  assert.equal(questionBody(compact),questionBody(original),original.id);
  assert.equal(questionSource(compact),questionSource(original),original.id);
  assert.deepEqual(compact.options.map(optionBody),original.options.map(optionBody),original.id);
  assert.equal(compact.answer,original.answer,original.id);
  assert.equal(compact.id,original.id);
 }
});
test('deployment payload is compact and restores the exact verified content',()=>{
 const payload=read('../supabase/functions/_shared/study-content.payload.json');
 const json=gunzipSync(Buffer.from(payload.data,'base64')).toString('utf8');
 assert.equal(createHash('sha256').update(json).digest('hex'),payload.sha256);
 assert.equal(json,readFileSync(new URL('../supabase/functions/_shared/study-content.json',import.meta.url),'utf8'));
 assert.ok(Buffer.byteLength(JSON.stringify(payload))<1000000);
});
