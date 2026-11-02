import {test} from 'node:test';
import assert from 'node:assert/strict';
import {challenges,todayKey} from '../src/activities.js';
import {submitChallenge,missionStatus} from '../src/features.js';
import {normalizeState} from '../src/state.js';

test('desafio incorreto registra tentativa, mas não concede vitória nem missão diária',()=>{
 const state=normalizeState({});const challenge=challenges[0],wrong=(challenge.answer+1)%challenge.options.length;
 assert.equal(submitChallenge(state,challenge.id,wrong),false);assert.equal(state.challengeAnswers[challenge.id],wrong);assert.equal(state.challengeDone[challenge.id],undefined);assert.equal(missionStatus(state)[1].done,false);
 assert.equal(submitChallenge(state,challenge.id,challenge.answer),true);assert.equal(state.challengeDone[challenge.id],true);assert.equal(missionStatus(state)[1].done,true);
 submitChallenge(state,challenge.id,challenge.answer);assert.deepEqual(state.activities[todayKey()].challenges,[challenge.id]);
 const restored=normalizeState(state);assert.equal(restored.challengeAnswers[challenge.id],challenge.answer);assert.equal(restored.challengeDone[challenge.id],true);
 submitChallenge(restored,challenge.id,wrong);assert.equal(restored.challengeDone[challenge.id],true,'revisão não remove uma conquista anterior');
});
test('todos os desafios aceitam apenas respostas válidas e podem ser vencidos',()=>{
 const state=normalizeState({});for(const c of challenges){assert.equal(submitChallenge(state,c.id,-1),false);assert.equal(submitChallenge(state,c.id,c.options.length),false);assert.equal(submitChallenge(state,c.id,'0'),false);assert.equal(state.challengeAnswers[c.id],undefined);assert.equal(submitChallenge(state,c.id,c.answer),true)}assert.equal(Object.keys(state.challengeDone).length,challenges.length);assert.equal(submitChallenge(state,'inexistente',0),false);
});
