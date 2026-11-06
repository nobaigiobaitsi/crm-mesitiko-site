import test from 'node:test';
import assert from 'node:assert/strict';
import { publicPayload } from '../supabase/functions/_shared/publication.js';
const valid=()=>({code:'001',title:'House',price:'200000',sqm:'100',beds:'2',type:'Μονοκατοικία',transaction:'Πώληση',status:'Διαθέσιμο',publication:'Εγκεκριμένο',notes:'PRIVATE',contact:'PRIVATE',address:'PRIVATE',website_json:JSON.stringify({id:'001',slug:'house',area:'athens',bathrooms:1,privateField:'PRIVATE',locales:Object.fromEntries(['el','en'].map(lang=>[lang,{title:'House',description:'Description',path:lang==='el'?'/house/':'/en/house/',secret:'PRIVATE'}]))})});
const photos=[{src:'crm://property/photo.jpg',alt:{el:'House',en:'House'}}];
test('publication emits an explicit public allowlist with core CRM values',()=>{
 const payload=publicPayload(valid(),photos);
 assert.equal(payload.price,200000);assert.equal(payload.type,'monokatoikia');assert.equal(payload.cover,photos[0].src);
 assert.equal(JSON.stringify(payload).includes('PRIVATE'),false);
});
test('drafts and inactive records cannot publish',()=>{
 assert.throws(()=>publicPayload({...valid(),publication:'Πρόχειρο'},photos));
 assert.throws(()=>publicPayload({...valid(),status:'Ανενεργό'},photos));
});
test('path traversal and external map URLs are rejected',()=>{
 const data=valid(),s=JSON.parse(data.website_json);s.locales.el.path='/../secret/';data.website_json=JSON.stringify(s);assert.throws(()=>publicPayload(data,photos));
 s.locales.el.path='/house/';s.mapUrl='https://evil.test/maps';data.website_json=JSON.stringify(s);assert.throws(()=>publicPayload(data,photos));
});
test('no photos, missing English and invalid numbers block publication',()=>{
 assert.throws(()=>publicPayload(valid(),[]));
 assert.throws(()=>publicPayload({...valid(),price:'NaN'},photos));
 const data=valid(),s=JSON.parse(data.website_json);delete s.locales.en;data.website_json=JSON.stringify(s);assert.throws(()=>publicPayload(data,photos));
});
