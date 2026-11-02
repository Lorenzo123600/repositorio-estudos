export function studyContentHandler({origin,authenticate,hasAccess,content}){
 return async request=>{
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
  const reply=(body,status)=>Response.json(body,{status,headers});
  if(!origin||request.headers.get('origin')!==origin)return reply({error:'origin_not_allowed'},403);
  headers['Access-Control-Allow-Origin']=origin;
  headers['Access-Control-Allow-Headers']='authorization, apikey, content-type, x-client-info';
  headers['Access-Control-Allow-Methods']='POST, OPTIONS';
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='POST')return reply({error:'method_not_allowed'},405);
  const authorization=request.headers.get('authorization')||'';
  if(!/^Bearer \S+$/i.test(authorization))return reply({error:'login_required'},401);
  try{
   const token=authorization.slice(7),user=await authenticate(token);
   if(!user?.id||!user.email_confirmed_at)return reply({error:'login_required'},401);
   if(await hasAccess(token)!==true)return reply({error:'paid_access_required'},403);
   return reply(content,200);
  }catch{return reply({error:'content_unavailable'},503);}
 };
}
