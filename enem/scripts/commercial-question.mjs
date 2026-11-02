// Student-facing data only. Full verification evidence remains in the sources.
export function commercialQuestion(question){
 const fields=['id','canonicalId','origin','area','discipline','year','number','application','day','booklet','language','topic','difficulty','difficultyReason','cancelled','context','text','options','answer','explanation','source','license'];
 const result=Object.fromEntries(fields.filter(key=>question[key]!==undefined).map(key=>[key,question[key]]));
 result.validationStatus=question.validationStatus||question.validation?.status||'legacy';
 result.loaded=true;
 if(question.originalStatement)result.originalStatement={transcript:question.originalStatement.transcript};
 return result;
}
