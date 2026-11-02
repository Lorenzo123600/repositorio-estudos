import test from 'node:test';
import assert from 'node:assert/strict';
import {optionBody,optionTranscript} from '../src/question-view.js';
import {commercialQuestion} from '../scripts/commercial-question.mjs';

test('alternativas visuais oferecem a transcrição disponível sem inserir HTML',()=>{
 const q={options:['![Alternativa A](enem-assets/a.webp)'],alternatives:[{text:'A 2 < 3 e "sim"'}]};
 const html=optionBody(q.options[0],optionTranscript(q,0));assert.match(html,/alt="Transcrição linear do PDF: A 2 &lt; 3 e &quot;sim&quot;"/);
 assert.doesNotMatch(optionBody(q.options[0],'<script>ruim</script>'),/<script>/);
 assert.equal(optionBody(q.options[0],1),optionBody(q.options[0]));
 const compact=commercialQuestion(q);assert.equal(optionTranscript(compact,0),q.alternatives[0].text);
});
