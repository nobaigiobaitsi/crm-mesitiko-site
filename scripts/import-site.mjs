import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

try { process.loadEnvFile('.env.import'); } catch(error) { if(error.code !== 'ENOENT') throw error; }
const url = process.env.IMPORT_SUPABASE_URL;
const key = process.env.IMPORT_SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Συμπληρώστε το τοπικό .env.import σύμφωνα με το SETUP-SITE.md.');
const client = createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const check = ({data,error}) => { if(error) throw new Error(error.message); return data; };
const uuid = (text) => { const hex=createHash('sha256').update(`leaf-import-v1:${text}`).digest('hex'); return `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-8${hex.slice(17,20)}-${hex.slice(20,32)}`; };
const catalog=JSON.parse(await readFile(new URL('../import/site/catalog.json',import.meta.url),'utf8'));
const missing=JSON.parse(await readFile(new URL('../import/site/missing-images.json',import.meta.url),'utf8'));
const members=check(await client.from('crm_members').select('id,role,active').eq('active',true));
const owner=process.env.IMPORT_ASSIGNED_TO || members.find(m=>m.role==='technical')?.id;
if(!owner || !members.some(m=>m.id===owner)) throw new Error('Δεν βρέθηκε ενεργός τεχνικός. Ορίστε IMPORT_ASSIGNED_TO με UUID ενεργού μέλους.');
// Fail before touching data if migrations were not applied.
check(await client.from('crm_photos').select('sort_order').limit(1));
const types={diamerisma:'Διαμέρισμα',monokatoikia:'Μονοκατοικία',mezoneta:'Μεζονέτα',oikopedo:'Οικόπεδο',epaggelmatiko:'Επαγγελματικός χώρος'};
for(const p of catalog) {
 const id=uuid(`property:${p.id}`), code=p.reference || p.id;
 const existing=check(await client.from('crm_records').select('id,data').eq('id',id).maybeSingle());
 if(existing && existing.data.import_complete==='yes') {console.log(`Παράλειψη ήδη ολοκληρωμένου ${code}`);continue;}
 if(existing && existing.data.import_source!=='leaf-site-v1') throw new Error(`Σύγκρουση UUID ${code}`);
 if(!existing) {
  const collision=check(await client.from('crm_records').select('id').eq('kind','property').eq('data->>code',code));
  if(collision.length) throw new Error(`Ο κωδικός ${code} υπάρχει ήδη. Δεν αντικαταστάθηκε.`);
  check(await client.from('crm_records').insert({id,kind:'property',assigned_to:owner,data:{
   title:p.locales.el.title,code,area:p.locales.el.cardAddress || p.area,
   price:String(p.price),sqm:String(p.sqm),beds:String(p.rooms || 0),type:types[p.type],transaction:p.transaction==='rent'?'Ενοικίαση':'Πώληση',
   status:({sold:'Πουλήθηκε',rented:'Ενοικιάστηκε',hidden:'Ανενεργό'})[p.status] || 'Διαθέσιμο',publication:'Εγκεκριμένο',
   website_json:JSON.stringify(p),import_source:'leaf-site-v1',import_complete:'no',
  }}));
 }
 const ordered=p.photos.map((photo,index)=>({photo,index})).filter(({index})=>!missing.some(m=>m.property===p.id && m.index===index));
 ordered.sort((a,b)=>Number(b.photo.src===p.cover)-Number(a.photo.src===p.cover));
 for(const [order,{photo,index}] of ordered.entries()) {
  const photoId=uuid(`photo:${p.id}:${photo.src}`),objectPath=`${id}/${photoId}.jpg`;
  const registered=check(await client.from('crm_photos').select('id').eq('id',photoId).maybeSingle());
  if(registered) continue;
  const bytes=await readFile(new URL(`../import/site/photos/${p.id}/${String(index).padStart(3,'0')}.jpg`,import.meta.url));
  const uploaded=await client.storage.from('property-photos').upload(objectPath,bytes,{contentType:'image/jpeg',upsert:false});
  if(uploaded.error && !/already exists|duplicate/i.test(uploaded.error.message)) throw new Error(uploaded.error.message);
  check(await client.from('crm_photos').insert({id:photoId,property_id:id,path:objectPath,caption:(photo.alt.el || p.locales.el.title).slice(0,200),sort_order:order}));
 }
 const latest=check(await client.from('crm_records').select('*').eq('id',id).single());
 const saved=check(await client.from('crm_records').update({data:{...latest.data,import_complete:'yes'}}).eq('id',id).eq('updated_at',latest.updated_at).select('id'));
 if(!saved.length) throw new Error('Η εγγραφή άλλαξε κατά την εισαγωγή. Εκτελέστε ξανά όταν δεν γίνεται επεξεργασία.');
 console.log(`Εισήχθη ${code}: ${ordered.length} φωτογραφίες.`);
}
console.log('Ολοκληρώθηκε. Δεν έγινε δημοσίευση. Ελέγξτε τα 6 ακίνητα στο CRM.');
for(const m of missing) console.log(`Κενή εικόνα παραλείφθηκε: ${m.src}`);
