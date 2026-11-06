import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { publicPayload } from '../_shared/publication.js';
const env = (key: string) => Deno.env.get(key) || '';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
Deno.serve(async (request: Request) => {
  const origin = env('CRM_ORIGIN');
  const headers = {'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Vary':'Origin'};
  const reply=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers});
  if (request.method==='OPTIONS') return new Response(null,{status:204,headers});
  if(request.method!=='POST') return reply(405,{error:'Method not allowed'});
  try {
    const token=request.headers.get('Authorization')?.replace(/^Bearer /i,'');
    if(!token) return reply(401,{error:'Απαιτείται σύνδεση.'});
    const client=createClient(env('SUPABASE_URL'),env('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:auth,error:authError}=await client.auth.getUser(token);
    if(authError || !auth.user) return reply(401,{error:'Η σύνδεση έληξε.'});
    const {data:member}=await client.from('crm_members').select('role,active').eq('id',auth.user.id).single();
    if(!member?.active || !['owner','technical'].includes(member.role)) return reply(403,{error:'Η δημοσίευση απαιτεί διαχειριστή.'});
    const body=await request.json();
    if(body.action==='status') {
      const {data:state,error}=await client.from('website_publications').select('*').eq('id',true).single();
      if(error) throw error;
      const {data:listings,error:listError}=await client.from('website_listings').select('property_id,revision,updated_at');
      if(listError) throw listError;
      let deployed_revision=null;
      try {
        const url=new URL('/publication-status.json',env('SITE_URL'));
        url.searchParams.set('t',String(Date.now()));
        const response=await fetch(url,{signal:AbortSignal.timeout(8000),cache:'no-store'});
        if(response.ok) deployed_revision=(await response.json()).revision;
      } catch { /* Site may not have its first CRM deployment yet. */ }
      return reply(200,{revision:state.revision,deployed_revision,dispatch_error:state.dispatch_error,listings,
        state:state.dispatch_error?'failed':!env('CLOUDFLARE_DEPLOY_HOOK')?'not_configured':deployed_revision===state.revision?'published':'pending'});
    }
    if(!['publish','withdraw','retry'].includes(body.action)) return reply(400,{error:'Άγνωστη ενέργεια.'});
    const hook=env('CLOUDFLARE_DEPLOY_HOOK');
    if(!hook || !env('SITE_URL')) return reply(409,{error:'Δεν έχει ρυθμιστεί ακόμη η αυτόματη δημοσίευση.'});
    let revision:string;
    if(body.action==='retry') {
      const {data,error}=await client.from('website_publications').select('revision').eq('id',true).single();
      if(error) throw error;
      revision=data.revision;
    } else {
      if(!uuid.test(body.property_id || '')) return reply(400,{error:'Μη έγκυρο ακίνητο.'});
      let payload=null;
      if(body.action==='publish') {
        const {data:record,error}=await client.from('crm_records').select('*').eq('id',body.property_id).eq('kind','property').single();
        if(error) throw error;
        const {data:rows,error:photoError}=await client.from('crm_photos').select('*').eq('property_id',body.property_id).order('sort_order').order('created_at').order('id');
        if(photoError) throw photoError;
        const photos=rows || [];
        // First validate everything before copying any assets.
        payload=publicPayload(record.data,photos.map(p=>({src:`crm://${p.path}`,alt:{el:p.caption || record.data.title,en:p.caption || record.data.title}})));
        for(const p of photos) {
          const {data:existing}=await client.storage.from('website-assets').list(body.property_id,{search:p.id+'.jpg',limit:1});
          if(existing?.some(f=>f.name===p.id+'.jpg')) continue;
          const {data:file,error:downloadError}=await client.storage.from('property-photos').download(p.path);
          if(downloadError || !file) throw new Error('Αποτυχία ανάγνωσης φωτογραφίας.');
          const {error:uploadError}=await client.storage.from('website-assets').upload(p.path,file,{contentType:'image/jpeg',upsert:false});
          if(uploadError && !String(uploadError.message).includes('already exists')) throw uploadError;
        }
      }
      const {data,error}=await client.rpc('leaf_website_commit',{p_property_id:body.property_id,p_payload:payload});
      if(error) throw error;
      revision=data;
    }
    let dispatch_error:string|null=null;
    try {
      const response=await fetch(hook,{method:'POST',signal:AbortSignal.timeout(15000)});
      if(!response.ok) throw new Error('Το Cloudflare δεν δέχτηκε τη δημοσίευση.');
    } catch { dispatch_error='Η έκδοση αποθηκεύτηκε, αλλά δεν επιβεβαιώθηκε η εκκίνηση του build. Πατήστε «Επανάληψη». Το site παραμένει στην προηγούμενη επιτυχημένη έκδοση.'; }
    await client.from('website_publications').update({dispatch_error}).eq('id',true).eq('revision',revision);
    return reply(200,{revision,state:dispatch_error?'failed':'pending',dispatch_error});
  } catch(error) {
    return reply(400,{error:error instanceof Error?error.message:'Αποτυχία δημοσίευσης.'});
  }
});
