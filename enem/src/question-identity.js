// Canonical numbering is always the regular blue booklet, irrespective of display IDs.
export function canonicalQuestionId(q){
 if(q.origin!=='enem')return q.id;
 return q.canonicalId||`enem:${q.year}:regular:blue:${q.number}:${q.language||'pt'}`;
}
